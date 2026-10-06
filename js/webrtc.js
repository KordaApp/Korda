import { rtdb, auth } from "./firebase.js";
import {
  ref, set, onValue, push, remove, onDisconnect, update, get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

export class CallSession {
  constructor(serverId, channelId, opts = {}) {
    this.serverId = serverId;
    this.channelId = channelId;
    this.uid = auth.currentUser.uid;
    this.peers = new Map();
    this.localStream = null;
    this.screenStream = null;
    this.callbacks = {
      onParticipants: opts.onParticipants || (() => {}),
      onRemoteStream: opts.onRemoteStream || (() => {}),
      onPeerLeft: opts.onPeerLeft || (() => {})
    };
    this.unsubs = [];
    this.closed = false;
  }

  async join({ withCamera = false } = {}) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withCamera ? { width: 640, height: 480 } : false
      });
    } catch (e) {
      if (e.name === "NotAllowedError") throw new Error("Permissão de microfone negada.");
      if (e.name === "NotFoundError") throw new Error("Nenhum microfone encontrado.");
      throw new Error("Falha ao acessar microfone: " + e.message);
    }
    this.localStream.getVideoTracks().forEach(t => { t.enabled = false; });
    this.cameraOn = withCamera;

    const base = `calls/${this.serverId}/${this.channelId}`;
    const meRef = ref(rtdb, `${base}/participants/${this.uid}`);
    try {
      await set(meRef, {
        joinedAt: Date.now(),
        muted: false,
        camera: withCamera,
        screen: false
      });
    } catch (e) {
      throw new Error("Erro ao entrar na call (permissão do banco). Cheque as Rules.");
    }
    onDisconnect(meRef).remove();

    this._base = base;

    this.unsubs.push(onValue(ref(rtdb, `${base}/participants`), (snap) => {
      const val = snap.val() || {};
      const uids = Object.keys(val);
      for (const uid of uids) {
        if (uid === this.uid) continue;
        if (!this.peers.has(uid)) this._connectTo(uid);
      }
      for (const uid of Array.from(this.peers.keys())) {
        if (!uids.includes(uid)) this._disconnectFrom(uid);
      }
      this.callbacks.onParticipants(val);
    }));

    this.unsubs.push(onValue(ref(rtdb, `${base}/signals/${this.uid}`), async (snap) => {
      const data = snap.val() || {};
      for (const [fromUid, sig] of Object.entries(data)) {
        if (sig.offer) await this._handleOffer(fromUid, sig.offer);
        if (sig.answer) await this._handleAnswer(fromUid, sig.answer);
        if (sig.candidates) await this._handleCandidates(fromUid, sig.candidates);
      }
    }));
  }

  _peerRef(remoteUid) { return `${this._base}/signals/${remoteUid}/${this.uid}`; }

  _createPC(remoteUid) {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pc.onicecandidate = (e) => {
      if (e.candidate && !this.closed) {
        push(ref(rtdb, `${this._peerRef(remoteUid)}/candidates`), e.candidate.toJSON());
      }
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      const peer = this.peers.get(remoteUid);
      if (peer) peer.stream = stream;
      this.callbacks.onRemoteStream(remoteUid, stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this._disconnectFrom(remoteUid);
      }
    };
    return pc;
  }

  _addLocalTracks(pc) {
    this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream));
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => pc.addTrack(t, this.screenStream));
    }
  }

  async _connectTo(remoteUid) {
    const pc = this._createPC(remoteUid);
    this.peers.set(remoteUid, { pc, stream: null });
    this._addLocalTracks(pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(ref(rtdb, `${this._peerRef(remoteUid)}/offer`), {
      type: offer.type, sdp: offer.sdp
    });
  }

  async _handleOffer(fromUid, offer) {
    let peer = this.peers.get(fromUid);
    if (!peer) {
      const pc = this._createPC(fromUid);
      peer = { pc, stream: null };
      this.peers.set(fromUid, peer);
      this._addLocalTracks(pc);
    }
    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      await set(ref(rtdb, `${this._peerRef(fromUid)}/answer`), {
        type: answer.type, sdp: answer.sdp
      });
    } catch (e) { console.warn("handleOffer:", e); }
  }

  async _handleAnswer(fromUid, answer) {
    const peer = this.peers.get(fromUid);
    if (!peer) return;
    if (peer.pc.signalingState === "have-local-offer") {
      try { await peer.pc.setRemoteDescription(new RTCSessionDescription(answer)); }
      catch (e) { console.warn("handleAnswer:", e); }
    }
  }

  async _handleCandidates(fromUid, candidates) {
    const peer = this.peers.get(fromUid);
    if (!peer) return;
    for (const c of Object.values(candidates)) {
      try { await peer.pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) {}
    }
  }

  _disconnectFrom(uid) {
    const peer = this.peers.get(uid);
    if (!peer) return;
    try { peer.pc.close(); } catch {}
    this.peers.delete(uid);
    this.callbacks.onPeerLeft(uid);
    remove(ref(rtdb, `${this._base}/signals/${uid}/${this.uid}`)).catch(() => {});
  }

  getLocalStream() { return this.localStream; }

  async toggleMute() {
    const track = this.localStream.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    await update(ref(rtdb, `${this._base}/participants/${this.uid}`), { muted: !track.enabled });
    return !track.enabled;
  }

  async toggleCamera() {
    if (!this.localStream.getVideoTracks().length) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        const vTrack = s.getVideoTracks()[0];
        this.localStream.addTrack(vTrack);
        for (const [, peer] of this.peers) {
          const sender = peer.pc.getSenders().find(x => x.track && x.track.kind === "video");
          if (sender) sender.replaceTrack(vTrack);
          else peer.pc.addTrack(vTrack, this.localStream);
        }
        this.cameraOn = true;
      } catch (e) { console.warn("camera:", e); return false; }
    } else {
      this.cameraOn = !this.cameraOn;
      this.localStream.getVideoTracks().forEach(t => { t.enabled = this.cameraOn; });
    }
    await update(ref(rtdb, `${this._base}/participants/${this.uid}`), { camera: this.cameraOn });
    return this.cameraOn;
  }

  async toggleScreen() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      const vTrack = this.screenStream.getVideoTracks()[0];
      for (const [, peer] of this.peers) {
        const sender = peer.pc.getSenders().find(s => s.track === vTrack);
        if (sender) {
          const cam = this.localStream.getVideoTracks()[0];
          if (cam) sender.replaceTrack(cam);
        }
      }
      this.screenStream = null;
      await update(ref(rtdb, `${this._base}/participants/${this.uid}`), { screen: false });
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      this.screenStream = stream;
      const vTrack = stream.getVideoTracks()[0];
      for (const [, peer] of this.peers) {
        const sender = peer.pc.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(vTrack);
        else peer.pc.addTrack(vTrack, stream);
      }
      vTrack.onended = () => this.toggleScreen();
      await update(ref(rtdb, `${this._base}/participants/${this.uid}`), { screen: true });
      return true;
    } catch (e) { console.warn("screen:", e); return false; }
  }

  async leave() {
    this.closed = true;
    for (const uid of Array.from(this.peers.keys())) this._disconnectFrom(uid);
    if (this.localStream) this.localStream.getTracks().forEach(t => t.stop());
    if (this.screenStream) this.screenStream.getTracks().forEach(t => t.stop());
    this.unsubs.forEach(u => { try { u(); } catch {} });
    await remove(ref(rtdb, `${this._base}/participants/${this.uid}`)).catch(() => {});
  }
}

export async function getCallParticipants(serverId, channelId) {
  const snap = await get(ref(rtdb, `calls/${serverId}/${channelId}/participants`));
  return snap.exists() ? snap.val() : {};
}