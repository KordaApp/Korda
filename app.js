import { auth } from "./firebase.js";
import { onAuth, loginGoogle, registerEmail, loginEmail, logout, traduzErro } from "./auth.js";
import { initCarousel } from "./carousel.js";
import {
  createServer, updateServer, deleteServer,
  listenUserServers, listenChannels, createChannel
} from "./servers.js";
import { listenMessages, sendMessage } from "./chat.js";
import { renderEmojiPicker } from "./emoji.js";
import {
  listenUserProfile, updateProfile, addLink, removeLink,
  STATUS_LABELS, buildProfileStyle
} from "./profile.js";

const $ = (id) => document.getElementById(id);

const loginScreen = $("login-screen");
const app = $("app");
const appBody = $("app-body");
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
const btnMyProfile = $("btn-my-profile");
const topbarLogo = document.querySelector(".topbar-logo");
const btnSidebar = $("btn-sidebar");
const sidebarBackdrop = $("sidebar-backdrop");

const serverName = $("server-name");
const serverSub = $("server-sub");
const serverTag = $("server-tag");
const btnServerSettings = $("btn-server-settings");
const channelsSection = $("channels-section");
const chatArea = $("chat-area");
const chatTitle = $("chat-title");
const chatSubtitle = $("chat-subtitle");
const chatMessages = $("chat-messages");
const chatForm = $("chat-form");
const chatInput = $("chat-input");
const btnEmoji = $("btn-emoji");
const emojiPicker = $("emoji-picker");

const modalBackdrop = $("modal-backdrop");
const modalClose = $("modal-close");
const formCreateServer = $("form-create-server");
const serverNameInput = $("server-name-input");
const serverDescInput = $("server-desc-input");

const channelBackdrop = $("channel-backdrop");
const channelClose = $("channel-close");
const formCreateChannel = $("form-create-channel");
const channelNameInput = $("channel-name-input");

const serverSettingsBackdrop = $("server-settings-backdrop");
const serverSettingsClose = $("server-settings-close");
const formServerSettings = $("form-server-settings");
const btnDeleteServer = $("btn-delete-server");

const callBackdrop = $("call-backdrop");
const callModal = $("call-modal");

const profileBackdrop = $("profile-backdrop");
const profileModal = $("profile-modal");

const toastRoot = $("toast-root");

let authMode = "login";
let currentUser = null;
let myProfile = null;
let servers = [];
let currentServer = null;
let currentChannel = null;
let unsubServers = null;
let unsubChannels = null;
let unsubMessages = null;
let unsubProfile = null;
let createChannelType = "text";

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

function escapeHTML(s) {
  const div = document.createElement("div");
  div.textContent = s ?? "";
  return div.innerHTML;
}

/* ---------- SIDEBAR TOGGLE ---------- */
btnSidebar.addEventListener("click", () => {
  appBody.classList.toggle("sidebar-open");
});
sidebarBackdrop.addEventListener("click", () => {
  appBody.classList.remove("sidebar-open");
});

/* ---------- LOGIN ---------- */
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
  try { await loginGoogle(); }
  catch (err) { loginError.textContent = traduzErro(err.code); }
  finally { btnGoogle.disabled = false; }
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
  } catch (err) { loginError.textContent = traduzErro(err.code); }
  finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = authMode === "register" ? "Criar conta" : "Entrar";
  }
});

btnLogout.addEventListener("click", async () => { await logout(); toast("Você saiu da conta"); });

/* ---------- MODAL CRIAR SERVIDOR ---------- */
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
    toast("Servidor criado!", "success");
  } catch (err) { toast("Erro: " + err.message, "error"); }
  finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Criar servidor";
  }
});

/* ---------- MODAL CRIAR CANAL ---------- */
function openCreateChannelModal(type = "text") {
  createChannelType = type;
  channelBackdrop.classList.remove("hidden");
  const radio = formCreateChannel.querySelector(`input[value="${type}"]`);
  if (radio) radio.checked = true;
  channelNameInput.value = "";
  channelNameInput.focus();
}
channelClose.addEventListener("click", () => channelBackdrop.classList.add("hidden"));
channelBackdrop.addEventListener("click", (e) => {
  if (e.target === channelBackdrop) channelBackdrop.classList.add("hidden");
});
formCreateChannel.querySelectorAll('input[name="channel-type"]').forEach(r => {
  r.addEventListener("change", () => { createChannelType = r.value; });
});

formCreateChannel.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentServer) return;
  const name = channelNameInput.value.trim();
  if (!name) return;
  const submitBtn = formCreateChannel.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Criando...";
  try {
    await createChannel(currentServer.id, name, createChannelType);
    channelBackdrop.classList.add("hidden");
    formCreateChannel.reset();
    toast("Canal criado!", "success");
  } catch (err) { toast("Erro: " + err.message, "error"); }
  finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Criar canal";
  }
});

/* ---------- MODAL CONFIG SERVIDOR ---------- */
btnServerSettings.addEventListener("click", () => {
  if (!currentServer) return;
  if (currentServer.ownerId !== currentUser.uid) {
    toast("Só o dono do servidor pode editar", "error");
    return;
  }
  $("ss-name").value = currentServer.name || "";
  $("ss-description").value = currentServer.description || "";
  $("ss-bio").value = currentServer.bio || "";
  $("ss-icon").value = currentServer.icon || "";
  $("ss-banner").value = currentServer.banner || "";
  $("ss-tag").value = currentServer.tag || "";
  serverSettingsBackdrop.classList.remove("hidden");
});
serverSettingsClose.addEventListener("click", () => serverSettingsBackdrop.classList.add("hidden"));
serverSettingsBackdrop.addEventListener("click", (e) => {
  if (e.target === serverSettingsBackdrop) serverSettingsBackdrop.classList.add("hidden");
});

formServerSettings.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentServer || currentServer.ownerId !== currentUser.uid) return;
  const data = {
    name: $("ss-name").value.trim(),
    description: $("ss-description").value.trim(),
    bio: $("ss-bio").value.trim(),
    icon: $("ss-icon").value.trim(),
    banner: $("ss-banner").value.trim(),
    tag: $("ss-tag").value.trim().toUpperCase()
  };
  if (!data.name) { toast("Nome obrigatório", "error"); return; }
  const submitBtn = formServerSettings.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvando...";
  try {
    await updateServer(currentServer.id, data);
    // Atualiza índice do usuário
    await updateServer(currentServer.id, data); // idempotente
    // Atualiza serverList com o novo nome/ícone
    const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
    const { rtdb } = await import("./firebase.js");
    await update(ref(rtdb), {
      [`serverList/${currentUser.uid}/${currentServer.id}/name`]: data.name,
      [`serverList/${currentUser.uid}/${currentServer.id}/icon`]: data.icon
    });
    toast("Servidor atualizado!", "success");
    serverSettingsBackdrop.classList.add("hidden");
  } catch (err) { toast("Erro: " + err.message, "error"); }
  finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar";
  }
});

btnDeleteServer.addEventListener("click", async () => {
  if (!currentServer || currentServer.ownerId !== currentUser.uid) return;
  const confirmed = confirm(`Excluir "${currentServer.name}"? Essa ação não pode ser desfeita.`);
  if (!confirmed) return;
  try {
    await deleteServer(currentServer.id, currentUser.uid);
    serverSettingsBackdrop.classList.add("hidden");
    toast("Servidor excluído");
    currentServer = null;
    currentChannel = null;
    serverName.textContent = "Selecione um servidor";
    serverSub.textContent = "—";
    serverTag.textContent = "";
    channelsSection.innerHTML = `<div class="empty-channels">Selecione um servidor</div>`;
    chatTitle.textContent = "—";
    chatSubtitle.textContent = "Selecione um canal para começar";
    chatMessages.innerHTML = "";
    chatInput.disabled = true;
  } catch (err) { toast("Erro: " + err.message, "error"); }
});

/* ---------- EMOJI PICKER ---------- */
btnEmoji.addEventListener("click", (e) => {
  e.preventDefault();
  const isHidden = emojiPicker.classList.contains("hidden");
  if (isHidden) {
    emojiPicker.classList.remove("hidden");
    renderEmojiPicker(emojiPicker, (emoji) => {
      const start = chatInput.selectionStart ?? chatInput.value.length;
      const end = chatInput.selectionEnd ?? chatInput.value.length;
      chatInput.value = chatInput.value.slice(0, start) + emoji + chatInput.value.slice(end);
      chatInput.selectionStart = chatInput.selectionEnd = start + emoji.length;
      chatInput.focus();
    });
  } else {
    emojiPicker.classList.add("hidden");
  }
});
document.addEventListener("click", (e) => {
  if (!emojiPicker.classList.contains("hidden")
    && !emojiPicker.contains(e.target)
    && !btnEmoji.contains(e.target)) {
    emojiPicker.classList.add("hidden");
  }
});

/* ---------- PERFIL ---------- */
function renderAvatarHTML(profile) {
  if (profile?.avatar) return `<img src="${escapeHTML(profile.avatar)}" alt="">`;
  const initial = (profile?.displayName || "U").charAt(0).toUpperCase();
  return `<div class="profile-avatar-fallback">${initial}</div>`;
}

function renderProfileView(profile, isMe) {
  const theme = profile.profileTheme || {};
  const bannerStyle = theme.banner
    ? `background-image: url('${escapeHTML(theme.banner)}'); background-size: cover; background-position: center;`
    : (theme.gradient?.enabled && theme.gradient.colorFrom && theme.gradient.colorTo
        ? `background: linear-gradient(${theme.gradient.direction === "to top" ? "to top" : "to bottom"}, ${theme.gradient.colorFrom}, ${theme.gradient.colorTo});`
        : `background: linear-gradient(to bottom, var(--purple), var(--blue));`);

  const links = profile.links || {};
  const linksHTML = Object.entries(links).map(([, l]) => {
    const icon = l.image ? `<img src="${escapeHTML(l.image)}" alt="">` : "";
    return `<a class="profile-link-btn" href="${escapeHTML(l.url)}" target="_blank" rel="noopener noreferrer">${icon}${escapeHTML(l.label)}</a>`;
  }).join("");

  const statusInfo = STATUS_LABELS[profile.status] || STATUS_LABELS.online;

  return `
    <div class="profile-banner" style="${bannerStyle}">
      <button class="profile-close" id="profile-close-btn"><svg class="icon"><use href="#i-close"/></svg></button>
      <div class="profile-avatar-wrap">${renderAvatarHTML(profile)}</div>
    </div>
    <div class="profile-body">
      <div class="profile-name">
        <span class="profile-status-dot" style="background:${statusInfo.color}"></span>
        ${escapeHTML(profile.displayName || "Usuário")}
      </div>
      <div class="profile-username">@${escapeHTML(profile.username || "user")}</div>
      ${profile.customStatus ? `<div class="profile-custom-status">${escapeHTML(profile.customStatus)}</div>` : ""}
      <div class="profile-section-title">Sobre mim</div>
      <div class="profile-bio">${escapeHTML(profile.bio || "Sem bio ainda.")}</div>
      ${linksHTML ? `<div class="profile-section-title">Links</div><div class="profile-links">${linksHTML}</div>` : ""}
      <div class="profile-actions">
        ${isMe ? `<button class="btn-primary" id="profile-edit-btn">Editar perfil</button>` : ""}
      </div>
    </div>
  `;
}

function openProfile(uid) {
  if (!uid) return;
  profileBackdrop.classList.remove("hidden");
  profileModal.innerHTML = `<div class="profile-body"><p>Carregando...</p></div>`;

  import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js").then(async ({ ref, get }) => {
    const { rtdb } = await import("./firebase.js");
    const snap = await get(ref(rtdb, `users/${uid}`));
    if (!snap.exists()) {
      profileModal.innerHTML = `<div class="profile-body"><p>Perfil não encontrado.</p></div>`;
      return;
    }
    const profile = { uid, ...snap.val() };
    const isMe = currentUser && currentUser.uid === uid;
    profileModal.innerHTML = renderProfileView(profile, isMe);
    profileModal.querySelector("#profile-close-btn").addEventListener("click", () => {
      profileBackdrop.classList.add("hidden");
    });
    if (isMe) {
      profileModal.querySelector("#profile-edit-btn").addEventListener("click", () => {
        renderProfileEdit(profile);
      });
    }
  });
}

function renderProfileEdit(profile) {
  const theme = profile.profileTheme || {};
  const g = theme.gradient || {};
  const links = profile.links || {};

  profileModal.innerHTML = `
    <div class="profile-banner" style="${buildProfileStyle(profile)}">
      <button class="profile-close" id="profile-close-btn"><svg class="icon"><use href="#i-close"/></svg></button>
    </div>
    <div class="profile-form">
      <h3>Editar perfil</h3>

      <label><span>Nome de exibição</span><input type="text" id="pf-displayName" maxlength="30" value="${escapeHTML(profile.displayName || "")}" /></label>
      <label><span>@ de usuário</span><input type="text" id="pf-username" maxlength="24" value="${escapeHTML(profile.username || "")}" /></label>
      <label><span>Status personalizado</span><input type="text" id="pf-customStatus" maxlength="60" placeholder="Ex: Bora jogar!" value="${escapeHTML(profile.customStatus || "")}" /></label>
      <label><span>Bio</span><textarea id="pf-bio" maxlength="300">${escapeHTML(profile.bio || "")}</textarea></label>
      <label><span>URL do Avatar (foto ou .gif)</span><input type="url" id="pf-avatar" placeholder="https://..." value="${escapeHTML(profile.avatar || "")}" /></label>
      <label><span>URL do Banner (foto ou .gif)</span><input type="url" id="pf-banner" placeholder="https://..." value="${escapeHTML(theme.banner || "")}" /></label>
      <label><span>Status</span>
        <select id="pf-status">
          ${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${profile.status === k ? "selected" : ""}>${v.label}</option>`).join("")}
        </select>
      </label>

      <div class="profile-section-title">Cor de fundo do perfil</div>
      <div class="color-row">
        <input type="color" id="pf-bgColor" value="${theme.bgColor || "#1c1c2a"}" />
        <span>Cor sólida (usada se gradiente desligado)</span>
      </div>

      <div class="profile-section-title">Gradiente</div>
      <label style="flex-direction:row;align-items:center;gap:10px;">
        <input type="checkbox" id="pf-gradEnabled" ${g.enabled ? "checked" : ""} style="width:auto;" />
        <span>Ativar gradiente</span>
      </label>
      <div class="color-row">
        <input type="color" id="pf-gradFrom" value="${g.colorFrom || "#8b5cf6"}" />
        <input type="color" id="pf-gradTo" value="${g.colorTo || "#3b82f6"}" />
        <select id="pf-gradDir" style="flex:1;">
          <option value="to bottom" ${g.direction !== "to top" ? "selected" : ""}>Cima → Baixo</option>
          <option value="to top" ${g.direction === "to top" ? "selected" : ""}>Baixo → Cima</option>
        </select>
      </div>

      <div class="profile-section-title">Links</div>
      <div id="pf-links-list">
        ${Object.entries(links).map(([id, l]) => `
          <div class="link-item" data-id="${id}">
            ${l.image ? `<img src="${escapeHTML(l.image)}" alt="">` : ""}
            <div class="link-meta"><strong>${escapeHTML(l.label)}</strong><small>${escapeHTML(l.url)}</small></div>
            <button type="button" class="icon-btn pf-link-remove" data-id="${id}"><svg class="icon"><use href="#i-trash"/></svg></button>
          </div>
        `).join("")}
      </div>

      <label><span>Nome do link</span><input type="text" id="pf-link-label" maxlength="30" placeholder="Ex: Meu YouTube" /></label>
      <label><span>URL do link</span><input type="url" id="pf-link-url" placeholder="https://..." /></label>
      <label><span>URL do ícone (opcional)</span><input type="url" id="pf-link-image" placeholder="https://..." /></label>
      <button type="button" class="btn-primary full" id="pf-add-link" style="margin-bottom:16px;">Adicionar link</button>

      <div class="profile-actions">
        <button class="btn-primary" id="pf-save">Salvar</button>
      </div>
    </div>
  `;

  profileModal.querySelector("#profile-close-btn").addEventListener("click", () => profileBackdrop.classList.add("hidden"));

  profileModal.querySelector("#pf-add-link").addEventListener("click", async () => {
    const label = profileModal.querySelector("#pf-link-label").value.trim();
    const url = profileModal.querySelector("#pf-link-url").value.trim();
    const image = profileModal.querySelector("#pf-link-image").value.trim();
    if (!label || !url) { toast("Preencha nome e URL do link", "error"); return; }
    try {
      await addLink(currentUser.uid, { label, url, image });
      const fresh = await import("./profile.js").then(m => m.getUserProfile(currentUser.uid));
      renderProfileEdit(fresh);
      toast("Link adicionado!", "success");
    } catch (err) { toast("Erro: " + err.message, "error"); }
  });

  profileModal.querySelectorAll(".pf-link-remove").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await removeLink(currentUser.uid, btn.dataset.id);
        const fresh = await import("./profile.js").then(m => m.getUserProfile(currentUser.uid));
        renderProfileEdit(fresh);
        toast("Link removido");
      } catch (err) { toast("Erro: " + err.message, "error"); }
    });
  });

  profileModal.querySelector("#pf-save").addEventListener("click", async () => {
    const data = {
      displayName: profileModal.querySelector("#pf-displayName").value.trim().slice(0, 30),
      username: profileModal.querySelector("#pf-username").value.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 24),
      customStatus: profileModal.querySelector("#pf-customStatus").value.trim().slice(0, 60),
      bio: profileModal.querySelector("#pf-bio").value.trim().slice(0, 300),
      avatar: profileModal.querySelector("#pf-avatar").value.trim(),
      status: profileModal.querySelector("#pf-status").value,
      profileTheme: {
        banner: profileModal.querySelector("#pf-banner").value.trim(),
        bgColor: profileModal.querySelector("#pf-bgColor").value,
        gradient: {
          enabled: profileModal.querySelector("#pf-gradEnabled").checked,
          colorFrom: profileModal.querySelector("#pf-gradFrom").value,
          colorTo: profileModal.querySelector("#pf-gradTo").value,
          direction: profileModal.querySelector("#pf-gradDir").value
        }
      }
    };
    if (!data.displayName) { toast("Nome não pode ficar vazio", "error"); return; }
    try {
      await updateProfile(currentUser.uid, data);
      toast("Perfil salvo!", "success");
      const fresh = await import("./profile.js").then(m => m.getUserProfile(currentUser.uid));
      profileModal.innerHTML = renderProfileView(fresh, true);
      profileModal.querySelector("#profile-close-btn").addEventListener("click", () => profileBackdrop.classList.add("hidden"));
      profileModal.querySelector("#profile-edit-btn")?.addEventListener("click", () => renderProfileEdit(fresh));
    } catch (err) { toast("Erro: " + err.message, "error"); }
  });
}

btnMyProfile.addEventListener("click", () => { if (currentUser) openProfile(currentUser.uid); });
profileBackdrop.addEventListener("click", (e) => {
  if (e.target === profileBackdrop) profileBackdrop.classList.add("hidden");
});

/* ---------- SERVIDOR / CANAIS ---------- */
function makeChannelEl(ch, server) {
  const el = document.createElement("div");
  el.className = "channel";
  const iconId = ch.type === "voice" ? "i-volume" : "i-hash";
  el.innerHTML = `<svg class="icon"><use href="#${iconId}"/></svg>${escapeHTML(ch.name)}`;
  el.addEventListener("click", () => {
    if (ch.type === "voice") openCallUI(ch, server);
    else selectChannel(server, ch);
  });
  return el;
}

function renderChannels(channels, server) {
  const textCh = channels.filter(c => c.type === "text");
  const voiceCh = channels.filter(c => c.type === "voice");

  channelsSection.innerHTML = `
    <div class="channels-group">
      <div class="channels-group-head">
        <h3>CANAIS DE TEXTO</h3>
        <button class="icon-btn xs" data-create="text" title="Criar canal de texto"><svg class="icon"><use href="#i-plus"/></svg></button>
      </div>
      <div class="channels-list" data-type="text"></div>
    </div>
    <div class="channels-group">
      <div class="channels-group-head">
        <h3>CANAIS DE VOZ</h3>
        <button class="icon-btn xs" data-create="voice" title="Criar canal de voz"><svg class="icon"><use href="#i-plus"/></svg></button>
      </div>
      <div class="channels-list" data-type="voice"></div>
    </div>
  `;

  const textList = channelsSection.querySelector('[data-type="text"]');
  const voiceList = channelsSection.querySelector('[data-type="voice"]');

  if (!textCh.length) textList.innerHTML = `<div class="empty-channels">Nenhum ainda</div>`;
  if (!voiceCh.length) voiceList.innerHTML = `<div class="empty-channels">Nenhum ainda</div>`;

  textCh.forEach(ch => textList.appendChild(makeChannelEl(ch, server)));
  voiceCh.forEach(ch => voiceList.appendChild(makeChannelEl(ch, server)));

  channelsSection.querySelectorAll("[data-create]").forEach(btn => {
    btn.addEventListener("click", () => openCreateChannelModal(btn.dataset.create));
  });
}

function selectServer(server) {
  currentServer = server;
  currentChannel = null;

  serverName.textContent = server.name;
  serverSub.textContent = server.description || "Servidor";
  serverTag.textContent = server.tag ? `TAG: ${server.tag}` : "";

  chatTitle.textContent = "—";
  chatSubtitle.textContent = "Escolha um canal";
  chatInput.disabled = true;
  chatInput.value = "";
  chatMessages.innerHTML = `
    <div class="chat-empty">
      <div class="chat-empty-icon">#</div>
      <p>${escapeHTML(server.name)}</p>
      <small>Escolha um canal à esquerda para começar</small>
    </div>`;

  if (unsubChannels) unsubChannels();
  if (unsubMessages) unsubMessages();

  unsubChannels = listenChannels(server.id, (channels) => {
    renderChannels(channels, server);
    const firstText = channels.find(c => c.type === "text");
    if (firstText) selectChannel(server, firstText);
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

  appBody.classList.remove("sidebar-open");

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
    ? `<img src="${escapeHTML(m.authorAvatar)}" alt="">`
    : initial;
  let time = "";
  if (m.createdAt) {
    const d = new Date(m.createdAt);
    time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  el.innerHTML = `
    <div class="avatar" data-uid="${m.authorId}" style="cursor:pointer">${avatarInner}</div>
    <div class="msg-body">
      <div class="msg-head">
        <strong data-uid="${m.authorId}" style="cursor:pointer">${escapeHTML(m.authorName || "Usuário")}</strong>
        <span class="time">${time}</span>
      </div>
      <div class="msg-text">${escapeHTML(m.content || "")}</div>
    </div>`;
  el.querySelectorAll("[data-uid]").forEach(n => {
    n.addEventListener("click", () => openProfile(n.dataset.uid));
  });
  return el;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentServer || !currentChannel) return;
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  emojiPicker.classList.add("hidden");
  try { await sendMessage(currentServer.id, currentChannel.id, text); }
  catch (err) { toast("Erro: " + err.message, "error"); }
});

/* ---------- CALL UI ---------- */
let callState = { mic: true, camera: false, screen: false };

function openCallUI(channel, server) {
  callState = { mic: true, camera: false, screen: false };
  callBackdrop.classList.remove("hidden");

  const me = myProfile || { displayName: currentUser.displayName || "Você", avatar: currentUser.photoURL || "" };
  renderCallUI(channel, server, [me]);
}

function renderCallUI(channel, server, participants) {
  callModal.innerHTML = `
    <div class="call-header">
      <h3>🔊 ${escapeHTML(channel.name)} — ${escapeHTML(server.name)}</h3>
      <button class="icon-btn" id="call-close"><svg class="icon"><use href="#i-close"/></svg></button>
    </div>
    <div class="call-participants">
      ${participants.map(p => `
        <div class="call-person">
          <div class="call-avatar">${p.avatar ? `<img src="${escapeHTML(p.avatar)}">` : (p.displayName || "U").charAt(0).toUpperCase()}</div>
          <strong>${escapeHTML(p.displayName || "Usuário")}</strong>
          <small>Conectado</small>
        </div>
      `).join("")}
    </div>
    <div class="call-controls">
      <button class="call-btn ${callState.mic ? "active" : ""}" id="call-mic" title="Microfone">
        <svg class="icon"><use href="#i-${callState.mic ? "mic" : "mic-off"}"/></svg>
      </button>
      <button class="call-btn ${callState.camera ? "active" : ""}" id="call-cam" title="Câmera">
        <svg class="icon"><use href="#i-${callState.camera ? "camera" : "camera-off"}"/></svg>
      </button>
      <button class="call-btn ${callState.screen ? "active" : ""}" id="call-screen" title="Compartilhar tela">
        <svg class="icon"><use href="#i-screen"/></svg>
      </button>
      <button class="call-btn danger" id="call-leave" title="Sair da call">
        <svg class="icon"><use href="#i-phone-off"/></svg>
      </button>
    </div>
  `;

  callModal.querySelector("#call-close").addEventListener("click", () => callBackdrop.classList.add("hidden"));
  callModal.querySelector("#call-leave").addEventListener("click", () => {
    callBackdrop.classList.add("hidden");
    toast("Você saiu da call");
  });
  callModal.querySelector("#call-mic").addEventListener("click", (e) => {
    callState.mic = !callState.mic;
    e.currentTarget.classList.toggle("active", callState.mic);
    e.currentTarget.querySelector("use").setAttribute("href", `#i-${callState.mic ? "mic" : "mic-off"}`);
  });
  callModal.querySelector("#call-cam").addEventListener("click", (e) => {
    callState.camera = !callState.camera;
    e.currentTarget.classList.toggle("active", callState.camera);
    e.currentTarget.querySelector("use").setAttribute("href", `#i-${callState.camera ? "camera" : "camera-off"}`);
    if (callState.camera) {
      toast("Câmera ativada (WebRTC entra na próxima versão)");
    }
  });
  callModal.querySelector("#call-screen").addEventListener("click", (e) => {
    callState.screen = !callState.screen;
    e.currentTarget.classList.toggle("active", callState.screen);
    if (callState.screen) toast("Compartilhamento de tela em breve");
  });
}

callBackdrop.addEventListener("click", (e) => {
  if (e.target === callBackdrop) callBackdrop.classList.add("hidden");
});

/* ---------- START ---------- */
function startApp() {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");

  if (unsubProfile) unsubProfile();
  unsubProfile = listenUserProfile(currentUser.uid, (prof) => {
    myProfile = prof;
    if (prof?.avatar) {
      topbarLogo.innerHTML = `<img src="${escapeHTML(prof.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
      topbarLogo.style.background = "none";
    } else {
      topbarLogo.innerHTML = "K";
      topbarLogo.style.background = "";
    }
  });

  if (unsubServers) unsubServers();
  unsubServers = listenUserServers(currentUser.uid, (list) => {
    servers = list;
    if (!list.length) {
      serversTrack.innerHTML = `<div class="empty-channels" style="padding:12px 8px;white-space:nowrap">Clique em + para criar um servidor</div>`;
      return;
    }
    initCarousel(serversTrack, serversCarousel, list, (s) => selectServer(s));
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
    if (unsubProfile) unsubProfile();
    unsubServers = unsubChannels = unsubMessages = unsubProfile = null;
    app.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    serversTrack.innerHTML = "";
    channelsSection.innerHTML = `<div class="empty-channels">Selecione um servidor</div>`;
    chatMessages.innerHTML = "";
    topbarLogo.innerHTML = "K";
    topbarLogo.style.background = "";
  }
});