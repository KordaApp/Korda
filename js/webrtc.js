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
