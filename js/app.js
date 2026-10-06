import { auth } from "./firebase.js";
import { onAuth, loginGoogle, registerEmail, loginEmail, logout, traduzErro } from "./auth.js";
import { initCarousel } from "./carousel.js";
import { createServer, listenUserServers, listenChannels } from "./servers.js";
import { listenMessages, sendMessage } from "./chat.js";

const $ = (id) => document.getElementById(id);

const loginScreen = $("login-screen");
const app = $("app");

const btnGoogle = $("btn-google");
const loginForm = $("login-form");
const inputName = $("input-name");
const inputEmail = $("input-email");
const inputPass = $("input-pass");
const btnSubmit = $("btn-submit");
const btnToggleMode = $("btn-toggle-mode");
const toggleText = $("toggle-text");
const loginError = $("login-error");

const serversTrack = $("servers-track");
const serversCarousel = $("servers-carousel");
const btnAddServer = $("btn-add-server");
const btnLogout = $("btn-logout");

const serverName = $("server-name");
const serverSub = $("server-sub");
const channelsSection = $("channels-section");
const chatTitle = $("chat-title");
const chatSubtitle = $("chat-subtitle");
const chatMessages = $("chat-messages");
const chatForm = $("chat-form");
const chatInput = $("chat-input");

const modalBackdrop = $("modal-backdrop");
const modalClose = $("modal-close");
const formCreateServer = $("form-create-server");
const serverNameInput = $("server-name-input");
const serverDescInput = $("server-desc-input");

const toastRoot = $("toast-root");

let authMode = "login";
let currentUser = null;
let servers = [];
let currentServer = null;
let currentChannel = null;
let unsubServers = null;
let unsubChannels = null;
let unsubMessages = null;

function toast(msg, type = "") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(120%)";
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

btnToggleMode.addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  if (authMode === "register") {
    inputName.parentElement.style.display = "";
    inputName.required = true;
    btnSubmit.textContent = "Criar conta";
    toggleText.textContent = "Já tem conta?";
    btnToggleMode.textContent = "Entrar";
  } else {
    inputName.parentElement.style.display = "none";
    inputName.required = false;
    btnSubmit.textContent = "Entrar";
    toggleText.textContent = "Não tem conta?";
    btnToggleMode.textContent = "Criar conta";
  }
  loginError.textContent = "";
});

inputName.parentElement.style.display = "none";

btnGoogle.addEventListener("click", async () => {
  loginError.textContent = "";
  btnGoogle.disabled = true;
  try {
    await loginGoogle();
  } catch (err) {
    console.error(err);
    loginError.textContent = traduzErro(err.code);
  } finally {
    btnGoogle.disabled = false;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Aguarde...";
  try {
    if (authMode === "register") {
      await registerEmail(inputName.value.trim(), inputEmail.value.trim(), inputPass.value);
    } else {
      await loginEmail(inputEmail.value.trim(), inputPass.value);
    }
  } catch (err) {
    console.error(err);
    loginError.textContent = traduzErro(err.code);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = authMode === "register" ? "Criar conta" : "Entrar";
  }
});

btnLogout.addEventListener("click", async () => {
  await logout();
  toast("Você saiu da conta");
});

btnAddServer.addEventListener("click", () => {
  modalBackdrop.classList.remove("hidden");
  serverNameInput.focus();
});
modalClose.addEventListener("click", () => modalBackdrop.classList.add("hidden"));
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.add("hidden");
});

formCreateServer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = serverNameInput.value.trim();
  const desc = serverDescInput.value.trim();
  if (!name || !currentUser) return;

  const submitBtn = formCreateServer.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Criando...";

  try {
    await createServer(currentUser.uid, name, desc);
    modalBackdrop.classList.add("hidden");
    formCreateServer.reset();
    toast("Servidor criado!", "Success");
  } catch (err) {
    console.error(err);
    toast("Erro ao criar servidor: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Criar servidor";
  }
});

function selectServer(server) {
  currentServer = server;
  currentChannel = null;

  serverName.textContent = server.name;
  serverSub.textContent = server.description || "Servidor";

  chatTitle.textContent = "—";
  chatSubtitle.textContent = "Escolha um canal";
  chatInput.disabled = true;
  chatInput.value = "";
  chatMessages.innerHTML = `
    <div class="chat-empty">
      <div class="chat-empty-icon">#</div>
      <p>${server.name}</p>
      <small>Escolha um canal à esquerda para começar</small>
    </div>`;

  if (unsubChannels) unsubChannels();
  if (unsubMessages) unsubMessages();

  unsubChannels = listenChannels(server.id, (channels) => {
    channelsSection.innerHTML = "<h3>CANAIS DE TEXTO</h3>";
    if (!channels.length) {
      channelsSection.innerHTML += `<div class="empty-channels">Nenhum canal ainda</div>`;
      return;
    }
    channels.forEach(ch => {
      const el = document.createElement("div");
      el.className = "channel";
      el.innerHTML = `<svg class="icon"><use href="#i-${ch.type === "voice" ? "volume" : "hash"}"/></svg>${ch.name}`;
      el.addEventListener("click", () => selectChannel(server, ch));
      channelsSection.appendChild(el);
    });

    if (channels.length) selectChannel(server, channels[0]);
  });
}

function selectChannel(server, channel) {
  currentChannel = channel;

  channelsSection.querySelectorAll(".channel").forEach(el => {
    el.classList.toggle("active", el.textContent.trim() === channel.name);
  });

  chatTitle.textContent = channel.name;
  chatSubtitle.textContent = `#${channel.name} em ${server.name}`;
  chatInput.disabled = false;
  chatInput.placeholder = `Mensagem em #${channel.name}`;
  chatInput.focus();

  chatMessages.innerHTML = `<div class="chat-empty"><small>Carregando mensagens...</small></div>`;

  if (unsubMessages) unsubMessages();

  unsubMessages = listenMessages(server.id, channel.id, (msgs) => {
    if (!msgs.length) {
      chatMessages.innerHTML = `
        <div class="chat-empty">
          <div class="chat-empty-icon">#</div>
          <p>Nenhuma mensagem ainda</p>
          <small>Seja o primeiro a enviar</small>
        </div>`;
      return;
    }
    chatMessages.innerHTML = "";
    msgs.forEach(m => chatMessages.appendChild(renderMessage(m)));
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function renderMessage(m) {
  const el = document.createElement("div");
  el.className = "message";
  const initial = (m.authorName || "U").charAt(0).toUpperCase();
  const avatarInner = m.authorAvatar
    ? `<img src="${m.authorAvatar}" alt="">`
    : initial;

  let time = "";
  if (m.createdAt) {
    const d = new Date(m.createdAt);
    time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  el.innerHTML = `
    <div class="avatar">${avatarInner}</div>
    <div class="msg-body">
      <div class="msg-head">
        <strong>${escapeHTML(m.authorName || "Usuário")}</strong>
        <span class="time">${time}</span>
      </div>
      <div class="msg-text">${escapeHTML(m.content || "")}</div>
    </div>`;
  return el;
}

function escapeHTML(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentServer || !currentChannel) return;
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  try {
    await sendMessage(currentServer.id, currentChannel.id, text);
  } catch (err) {
    console.error(err);
    toast("Erro ao enviar: " + err.message, "error");
  }
});

function startApp() {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");

  if (unsubServers) unsubServers();
  unsubServers = listenUserServers(currentUser.uid, (list) => {
    servers = list;
    if (!list.length) {
      serversTrack.innerHTML = `<div class="empty-channels" style="padding:12px 8px;white-space:nowrap">Clique em + para criar um servidor</div>`;
      return;
    }
    initCarousel(serversTrack, serversCarousel, list, (s) => {
      selectServer(s);
    });
    if (list[0]) selectServer(list[0]);
  });
}

onAuth((user) => {
  if (user) {
    currentUser = user;
    startApp();
  } else {
    currentUser = null;
    if (unsubServers) unsubServers();
    if (unsubChannels) unsubChannels();
    if (unsubMessages) unsubMessages();
    unsubServers = unsubChannels = unsubMessages = null;
    app.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    serversTrack.innerHTML = "";
    channelsSection.innerHTML = "<h3>CANAIS DE TEXTO</h3>";
    chatMessages.innerHTML = "";
  }
});
