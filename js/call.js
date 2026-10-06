import { CallSession } from "./webrtc.js";
import { auth } from "./firebase.js";
import { rtdb } from "./firebase.js";
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let session = null;
let currentChannel = null;
let currentServer = null;
let participantUnsub = null;
let profileCache = {};

async function getProfile(uid) {
  if (profileCache[uid]) return profileCache[uid];
  const snap = await get(ref(rtdb, `users/${uid}`));
  const p = snap.exists() ? snap.val() : { displayName: "Usuário", avatar: "" };
  profileCache[uid] = p;
  return p;
}

function escapeHTML(s) {
  const div = document.createElement("div");
  div.textContent = s ?? "";
  return div.innerHTML;
}

export function isInCall() { return !!session; }

export async function enterCall(serverId, serverName, channel) {
  if (session) await leaveCall();

  currentServer = { id: serverId, name: serverName };
  currentChannel = channel;

  const modal = document.getElementById("call-modal");
  const backdrop = document.getElementById("call-backdrop");
  backdrop.classList.remove("hidden");

  modal.innerHTML = `
    <div class="call-header">
      <div>
        <h3>🔊 ${escapeHTML(channel.name)}</h3>
        <small style="color:var(--text-2);font-size:12px;">${escapeHTML(serverName)}</small>
      </div>
      <button class="icon-btn" id="call-minimize" title="Minimizar">—</button>
    </div>
    <div class="call-stage" id="call-stage"></div>
    <div class="call-controls">
      <button class="call-btn" id="call-mic" title="Microfone"><svg class="icon"><use href="#i-mic"/></svg></button>
      <button class="call-btn" id="call-cam" title="Câmera"><svg class="icon"><use href="#i-camera-off"/></svg></button>
      <button class="call-btn" id="call-screen" title="Compartilhar tela"><svg class="icon"><use href="#i-screen"/></svg></button>
      <button class="call-btn danger" id="call-leave" title="Sair"><svg class="icon"><use href="#i-phone-off"/></svg></button>
    </div>
  `;

  // Cria a sessão WebRTC
  session = new CallSession(serverId, channel.id, {
    onParticipants: (parts) => renderParticipants(parts),
    onRemoteStream: (uid, stream) => attachRemoteStream(uid, stream),
    onPeerLeft: (uid) => removeRemoteVideo(uid)
  });

  try {
    await session.join({ withCamera: false });
  } catch (e) {
    alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    console.error(e);
    await leaveCall();
    return;
  }

  // Adiciona o próprio vídeo local
  attachLocalVideo();

  // Bind botões
  const btnMic = document.getElementById("call-mic");
  const btnCam = document.getElementById("call-cam");
  const btnScreen = document.getElementById("call-screen");
  const btnLeave = document.getElementById("call-leave");
  const btnMin = document.getElementById("call-minimize");

  btnMic.addEventListener("click", async () => {
    const muted = await session.toggleMute();
    btnMic.classList.toggle("danger", muted);
    btnMic.querySelector("use").setAttribute("href", `#i-${muted ? "mic-off" : "mic"}`);
  });

  btnCam.addEventListener("click", async () => {
    const on = await session.toggleCamera();
    btnCam.classList.toggle("active", on);
    btnCam.querySelector("use").setAttribute("href", `#i-${on ? "camera" : "camera-off"}`);
  });

  btnScreen.addEventListener("click", async () => {
    const on = await session.toggleScreen();
    btnScreen.classList.toggle("active", on);
  });

  btnLeave.addEventListener("click", () => leaveCall());

  btnMin.addEventListener("click", () => {
    document.getElementById("call-backdrop").classList.add("hidden");
  });
}

function renderParticipants(participantsVal) {
  const stage = document.getElementById("call-stage");
  if (!stage) return;

  // Garante containers para cada um
  for (const uid of Object.keys(participantsVal)) {
    if (!stage.querySelector(`[data-uid="${uid}"]`)) {
      const div = document.createElement("div");
      div.className = "call-video";
      div.dataset.uid = uid;
      div.innerHTML = `
        <video autoplay playsinline ${uid === auth.currentUser.uid ? "muted" : ""}></video>
        <div class="call-video-label">
          <span class="call-mic-indicator"></span>
          <span class="call-name">—</span>
        </div>
      `;
      stage.appendChild(div);
      // Carrega nome/avatar
      const info = participantsVal[uid];
      loadParticipantInfo(uid, info);
    } else {
      // Atualiza muted/camera
      const div = stage.querySelector(`[data-uid="${uid}"]`);
      const micInd = div.querySelector(".call-mic-indicator");
      micInd.classList.toggle("muted", !!participantsVal[uid].muted);
      div.classList.toggle("no-video", !participantsVal[uid].camera && !participantsVal[uid].screen);
    }
  }

  // Remove quem saiu
  stage.querySelectorAll(".call-video").forEach(el => {
    if (!participantsVal[el.dataset.uid]) el.remove();
  });
}

async function loadParticipantInfo(uid, info) {
  const profile = await getProfile(uid);
  const div = document.querySelector(`.call-video[data-uid="${uid}"]`);
  if (!div) return;
  const nameEl = div.querySelector(".call-name");
  if (nameEl) nameEl.textContent = profile.displayName || "Usuário";

  const video = div.querySelector("video");
  if (uid === auth.currentUser.uid) {
    // já tem stream local
    return;
  }
  // Se ainda não tem stream, mostra avatar como poster
  if (!video.srcObject) {
    div.style.backgroundImage = profile.avatar ? `url('${profile.avatar}')` : "";
    div.classList.add("no-video");
  }
}

function attachLocalVideo() {
  const stage = document.getElementById("call-stage");
  if (!stage) return;
  const uid = auth.currentUser.uid;
  let div = stage.querySelector(`[data-uid="${uid}"]`);
  if (!div) {
    div = document.createElement("div");
    div.className = "call-video";
    div.dataset.uid = uid;
    div.innerHTML = `
      <video autoplay playsinline muted></video>
      <div class="call-video-label">
        <span class="call-mic-indicator"></span>
        <span class="call-name">Você</span>
      </div>
    `;
    stage.appendChild(div);
  }
  const video = div.querySelector("video");
  video.srcObject = session.getLocalStream();
  video.play().catch(() => {});
}

function attachRemoteStream(uid, stream) {
  const stage = document.getElementById("call-stage");
  if (!stage) return;
  const div = stage.querySelector(`.call-video[data-uid="${uid}"]`);
  if (!div) return;
  const video = div.querySelector("video");
  video.srcObject = stream;
  video.play().catch(() => {});
  div.classList.remove("no-video");
  div.style.backgroundImage = "";
}

function removeRemoteVideo(uid) {
  const div = document.querySelector(`.call-video[data-uid="${uid}"]`);
  if (div) div.remove();
}

export async function leaveCall() {
  if (session) {
    await session.leave();
    session = null;
  }
  currentChannel = null;
  currentServer = null;
  document.getElementById("call-backdrop").classList.add("hidden");
  const stage = document.getElementById("call-stage");
  if (stage) stage.innerHTML = "";
}
