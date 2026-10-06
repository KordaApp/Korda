import { auth } from "./firebase.js";
import { onAuth, loginGoogle, registerEmail, loginEmail, logout, traduzErro } from "./auth.js";
import { initCarousel } from "./carousel.js";
import {
  createServer, updateServer, deleteServer,
  listenUserServers, listenChannels, listenCategories,
  createChannel, deleteChannel, createCategory, deleteCategory,
  listenRoles, listenMembers, createRole, updateRole, deleteRole,
  assignRole, removeRole, kickMember, banMember, warnMember,
  setMemberNick, setMemberAvatar,
  setUserTagActive, getUserActiveTags, PERMISSIONS, DEFAULT_PERMS
} from "./servers.js";
import { listenMessages, sendMessage, sendImageMessage } from "./chat.js";
import { renderEmojiPicker } from "./emoji.js";
import { enterCall, leaveCall, isInCall } from "./call.js";
import { listenUserProfile, updateProfile, addLink, removeLink, STATUS_LABELS, buildProfileStyle } from "./profile.js";

const $ = (id) => document.getElementById(id);
const appBody = $("app-body");

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
const btnMyProfile = $("btn-my-profile");
const topbarLogo = document.querySelector(".topbar-logo");
const btnSidebar = $("btn-sidebar");
const sidebarBackdrop = $("sidebar-backdrop");
const btnMailbox = $("btn-mailbox");
const mailboxBadge = $("mailbox-badge");

const serverBanner = $("server-banner");
const serverName = $("server-name");
const serverSub = $("server-sub");
const serverTagRow = $("server-tag-row");
const btnServerSettings = $("btn-server-settings");
const channelsSection = $("channels-section");

const chatTitle = $("chat-title");
const chatSubtitle = $("chat-subtitle");
const chatMessages = $("chat-messages");
const chatForm = $("chat-form");
const chatInput = $("chat-input");
const btnEmoji = $("btn-emoji");
const btnImage = $("btn-image");
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
const channelCategorySelect = $("channel-category-select");

const categoryBackdrop = $("category-backdrop");
const categoryClose = $("category-close");
const formCreateCategory = $("form-create-category");
const categoryNameInput = $("category-name-input");

const serverSettingsBackdrop = $("server-settings-backdrop");
const serverSettingsClose = $("server-settings-close");
const formServerSettings = $("form-server-settings");
const btnDeleteServer = $("btn-delete-server");
const rolesList = $("roles-list");
const membersList = $("members-list");
const btnNewRole = $("btn-new-role");

const serverProfileBackdrop = $("server-profile-backdrop");
const serverProfileClose = $("server-profile-close");

const roleBackdrop = $("role-backdrop");
const roleClose = $("role-close");
const formRole = $("form-role");
const roleModalTitle = $("role-modal-title");
const roleName = $("role-name");
const roleColor = $("role-color");
const rolePerms = $("role-perms");
const roleSubmit = $("role-submit");
const roleDelete = $("role-delete");

const profileBackdrop = $("profile-backdrop");
const profileModal = $("profile-modal");

const mailboxBackdrop = $("mailbox-backdrop");
const mailboxClose = $("mailbox-close");
const mailboxUpdates = $("mailbox-updates");
const mailboxInvites = $("mailbox-invites");

const toastRoot = $("toast-root");

let authMode = "login";
let currentUser = null;
let myProfile = null;
let servers = [];
let currentServer = null;
let currentChannels = [];
let currentCategories = [];
let currentRoles = [];
let currentMembers = [];
let currentChannel = null;
let editingRoleId = null;
let unsubServers, unsubChannels, unsubCategories, unsubRoles, unsubMembers, unsubMessages, unsubProfile;
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

/* ---------- SIDEBAR ---------- */
btnSidebar.addEventListener("click", () => appBody.classList.toggle("sidebar-open"));
sidebarBackdrop.addEventListener("click", () => appBody.classList.remove("sidebar-open"));

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
    if (authMode === "register") await registerEmail(inputName.value.trim(), inputEmail.value.trim(), inputPass.value);
    else await loginEmail(inputEmail.value.trim(), inputPass.value);
  } catch (err) { loginError.textContent = traduzErro(err.code); }
  finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = authMode === "register" ? "Criar conta" : "Entrar";
  }
});

btnLogout.addEventListener("click", async () => {
  if (isInCall()) await leaveCall();
  await logout();
  toast("Você saiu da conta");
});

/* ---------- CRIAR SERVIDOR ---------- */
btnAddServer.addEventListener("click", () => { modalBackdrop.classList.remove("hidden"); serverNameInput.focus(); });
modalClose.addEventListener("click", () => modalBackdrop.classList.add("hidden"));
modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) modalBackdrop.classList.add("hidden"); });
formCreateServer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = serverNameInput.value.trim();
  const desc = serverDescInput.value.trim();
  if (!name || !currentUser) return;
  const btn = formCreateServer.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Criando...";
  try {
    await createServer(currentUser.uid, name, desc);
    modalBackdrop.classList.add("hidden");
    formCreateServer.reset();
    toast("Servidor criado!", "success");
  } catch (err) { toast("Erro: " + err.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "Criar servidor"; }
});

/* ---------- CRIAR CANAL / CATEGORIA ---------- */
function openCreateChannelModal(type = "text") {
  createChannelType = type;
  channelBackdrop.classList.remove("hidden");
  formCreateChannel.querySelector(`input[value="${type}"]`).checked = true;
  channelCategorySelect.innerHTML = `<option value="">Sem categoria</option>` +
    currentCategories.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("");
  channelNameInput.value = "";
  channelNameInput.focus();
}
channelClose.addEventListener("click", () => channelBackdrop.classList.add("hidden"));
channelBackdrop.addEventListener("click", (e) => { if (e.target === channelBackdrop) channelBackdrop.classList.add("hidden"); });
formCreateChannel.querySelectorAll('input[name="channel-type"]').forEach(r => r.addEventListener("change", () => { createChannelType = r.value; }));
formCreateChannel.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentServer) return;
  const name = channelNameInput.value.trim();
  const categoryId = channelCategorySelect.value;
  if (!name) return;
  const btn = formCreateChannel.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Criando...";
  try {
    await createChannel(currentServer.id, name, createChannelType, categoryId);
    channelBackdrop.classList.add("hidden");
    formCreateChannel.reset();
    toast("Canal criado!", "success");
  } catch (err) { toast("Erro: " + err.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "Criar canal"; }
});

function openCreateCategoryModal() {
  categoryBackdrop.classList.remove("hidden");
  categoryNameInput.value = "";
  categoryNameInput.focus();
}
categoryClose.addEventListener("click", () => categoryBackdrop.classList.add("hidden"));
categoryBackdrop.addEventListener("click", (e) => { if (e.target === categoryBackdrop) categoryBackdrop.classList.add("hidden"); });
formCreateCategory.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentServer) return;
  const name = categoryNameInput.value.trim();
  if (!name) return;
  const btn = formCreateCategory.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Criando...";
  try {
    await createCategory(currentServer.id, name);
    categoryBackdrop.classList.add("hidden");
    formCreateCategory.reset();
    toast("Categoria criada!", "success");
  } catch (err) { toast("Erro: " + err.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "Criar categoria"; }
});

/* ---------- CONFIG SERVIDOR ---------- */
function openServerSettings() {
  if (!currentServer) return;
  const isOwner = currentServer.ownerId === currentUser.uid;
  if (!isOwner) { openServerProfile(); return; }
  $("ss-name").value = currentServer.name || "";
  $("ss-description").value = currentServer.description || "";
  $("ss-bio").value = currentServer.bio || "";
  $("ss-icon").value = currentServer.icon || "";
  $("ss-banner").value = currentServer.banner || "";
  $("ss-tag").value = currentServer.tag || "";
  $("ss-tag-icon").value = currentServer.tagIcon || "";
  getUserActiveTags(currentUser.uid).then(tags => {
    $("ss-tag-active").checked = !!tags[currentServer.id];
  });
  renderRolesList();
  renderMembersList();
  serverSettingsBackdrop.classList.remove("hidden");
  // Default tab
  document.querySelectorAll(".modal-tab").forEach(t => t.classList.remove("active"));
  document.querySelector(".modal-tab[data-tab=geral]").classList.add("active");
  document.querySelectorAll(".modal-tab-panel").forEach(p => p.classList.add("hidden"));
  document.querySelector("[data-panel=geral]").classList.remove("hidden");
}
btnServerSettings.addEventListener("click", openServerSettings);
serverSettingsClose.addEventListener("click", () => serverSettingsBackdrop.classList.add("hidden"));
serverSettingsBackdrop.addEventListener("click", (e) => { if (e.target === serverSettingsBackdrop) serverSettingsBackdrop.classList.add("hidden"); });

document.querySelectorAll(".modal-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".modal-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".modal-tab-panel").forEach(p => p.classList.add("hidden"));
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`)?.classList.remove("hidden");
  });
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
    tag: $("ss-tag").value.trim().toUpperCase(),
    tagIcon: $("ss-tag-icon").value.trim()
  };
  if (!data.name) { toast("Nome obrigatório", "error"); return; }
  const btn = formServerSettings.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Salvando...";
  try {
    await updateServer(currentServer.id, data);
    const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
    const { rtdb } = await import("./firebase.js");
    await update(ref(rtdb), {
      [`serverList/${currentUser.uid}/${currentServer.id}/name`]: data.name,
      [`serverList/${currentUser.uid}/${currentServer.id}/icon`]: data.icon
    });
    const tagActive = $("ss-tag-active").checked;
    await setUserTagActive(currentUser.uid, currentServer.id, data.tag, data.tagIcon, tagActive);
    toast("Servidor atualizado!", "success");
    serverSettingsBackdrop.classList.add("hidden");
  } catch (err) { toast("Erro: " + err.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "Salvar"; }
});

btnDeleteServer.addEventListener("click", async () => {
  if (!currentServer || currentServer.ownerId !== currentUser.uid) return;
  if (!confirm(`Excluir "${currentServer.name}"?`)) return;
  try {
    const sid = currentServer.id;
    await deleteServer(sid, currentUser.uid);
    await setUserTagActive(currentUser.uid, sid, "", "", false).catch(() => {});
    serverSettingsBackdrop.classList.add("hidden");
    toast("Servidor excluído");
    resetServerPanel();
  } catch (err) { toast("Erro: " + err.message, "error"); }
});

/* ---------- SERVER PROFILE (não-dono) ---------- */
async function openServerProfile() {
  if (!currentServer) return;
  const isOwner = currentServer.ownerId === currentUser.uid;
  if (isOwner) { openServerSettings(); return; }

  serverProfileBackdrop.classList.remove("hidden");
  const banner = currentServer.banner || "";
  const icon = currentServer.icon || "";
  $("sp-banner").style.backgroundImage = banner ? `url('${banner}')` : "";
  $("sp-icon").innerHTML = icon ? `<img src="${escapeHTML(icon)}">` : escapeHTML((currentServer.name || "?").charAt(0).toUpperCase());
  $("sp-name").textContent = currentServer.name || "—";
  $("sp-desc").textContent = currentServer.description || "";
  $("sp-bio").textContent = currentServer.bio || "Sem descrição longa.";

  // Carrega perfil por servidor
  const snap = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js").then(m => m.get(m.ref((await import("./firebase.js")).rtdb, `servers/${currentServer.id}/members/${currentUser.uid}`)));
  const member = snap.exists() ? snap.val() : {};
  $("sp-nick").value = member.nickname || "";
  $("sp-avatar").value = member.avatar || "";
}
serverProfileClose.addEventListener("click", () => serverProfileBackdrop.classList.add("hidden"));
serverProfileBackdrop.addEventListener("click", (e) => { if (e.target === serverProfileBackdrop) serverProfileBackdrop.classList.add("hidden"); });
$("sp-save").addEventListener("click", async () => {
  if (!currentServer) return;
  try {
    await setMemberNick(currentServer.id, currentUser.uid, $("sp-nick").value.trim());
    await setMemberAvatar(currentServer.id, currentUser.uid, $("sp-avatar").value.trim());
    toast("Perfil do servidor salvo!", "success");
    serverProfileBackdrop.classList.add("hidden");
  } catch (err) { toast("Erro: " + err.message, "error"); }
});

/* ---------- ROLES ---------- */
function renderRolesList() {
  if (!currentServer) return;
  rolesList.innerHTML = currentRoles.map(r => {
    const permCount = r.permissions ? Object.keys(r.permissions).length : 0;
    return `
      <div class="role-card" data-role="${r.id}" style="border-left-color:${escapeHTML(r.color || "#8b5cf6")}">
        <div class="role-dot" style="background:${escapeHTML(r.color || "#8b5cf6")}"></div>
        <div class="role-info">
          <strong>${escapeHTML(r.name)}</strong>
          <small>${permCount} permiss${permCount === 1 ? "ão" : "ões"}</small>
        </div>
      </div>
    `;
  }).join("") || `<p class="empty-channels">Nenhum cargo ainda</p>`;

  rolesList.querySelectorAll("[data-role]").forEach(card => {
    card.addEventListener("click", () => openRoleEditor(card.dataset.role));
  });
}

function openRoleEditor(roleId = null) {
  editingRoleId = roleId;
  const role = roleId ? currentRoles.find(r => r.id === roleId) : null;
  roleModalTitle.textContent = role ? "Editar cargo" : "Criar cargo";
  roleName.value = role?.name || "";
  roleColor.value = role?.color || "#8b5cf6";
  roleDelete.classList.toggle("hidden", !role || role.id === "owner");
  roleSubmit.textContent = role ? "Salvar" : "Criar cargo";

  // Render perms
  rolePerms.innerHTML = PERMISSIONS.map(p => {
    const checked = role?.permissions?.[p.id] ? "checked" : "";
    return `<label class="perm-item"><input type="checkbox" data-perm="${p.id}" ${checked} /><span>${p.label}</span></label>`;
  }).join("");

  roleBackdrop.classList.remove("hidden");
}
roleClose.addEventListener("click", () => roleBackdrop.classList.add("hidden"));
roleBackdrop.addEventListener("click", (e) => { if (e.target === roleBackdrop) roleBackdrop.classList.add("hidden"); });
btnNewRole.addEventListener("click", () => openRoleEditor(null));

formRole.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentServer) return;
  const name = roleName.value.trim();
  if (!name) return;
  const permissions = {};
  rolePerms.querySelectorAll("[data-perm]").forEach(cb => {
    if (cb.checked) permissions[cb.dataset.perm] = true;
  });
  const btn = formRole.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Salvando...";
  try {
    if (editingRoleId) {
      await updateRole(currentServer.id, editingRoleId, { name, color: roleColor.value, permissions });
    } else {
      await createRole(currentServer.id, { name, color: roleColor.value, permissions });
    }
    roleBackdrop.classList.add("hidden");
    toast(editingRoleId ? "Cargo atualizado!" : "Cargo criado!", "success");
  } catch (err) { toast("Erro: " + err.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "Salvar"; }
});

roleDelete.addEventListener("click", async () => {
  if (!editingRoleId || !currentServer) return;
  if (!confirm("Excluir este cargo?")) return;
  try {
    await deleteRole(currentServer.id, editingRoleId);
    roleBackdrop.classList.add("hidden");
    toast("Cargo excluído");
  } catch (err) { toast("Erro: " + err.message, "error"); }
});

/* ---------- MEMBERS ---------- */
function renderMembersList() {
  if (!currentServer) return;
  const isOwner = currentServer.ownerId === currentUser.uid;
  membersList.innerHTML = currentMembers.map(m => {
    const roleIds = m.roleIds ? Object.keys(m.roleIds) : [];
    const roleNames = roleIds.map(rid => currentRoles.find(r => r.id === rid)?.name).filter(Boolean).join(", ") || "Sem cargo";
    return `
      <div class="member-card" data-uid="${m.uid}">
        <div class="avatar-sm">${m.avatar ? `<img src="${escapeHTML(m.avatar)}">` : escapeHTML((m.nickname || "U").charAt(0).toUpperCase())}</div>
        <div class="member-info">
          <strong>${escapeHTML(m.nickname || "Membro")}${m.uid === currentUser.uid ? " (você)" : ""}</strong>
          <small>${escapeHTML(roleNames)}</small>
        </div>
        ${isOwner && m.uid !== currentUser.uid ? `
          <div class="member-actions">
            <button class="icon-btn" data-act="warn" title="Advertir"><svg class="icon"><use href="#i-bell"/></svg></button>
            <button class="icon-btn" data-act="kick" title="Expulsar"><svg class="icon"><use href="#i-logout"/></svg></button>
            <button class="icon-btn" data-act="ban" title="Banir"><svg class="icon"><use href="#i-lock"/></svg></button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("") || `<p class="empty-channels">Nenhum membro</p>`;

  membersList.querySelectorAll("[data-act]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uid = btn.closest("[data-uid]").dataset.uid;
      const act = btn.dataset.act;
      if (act === "warn") {
        const reason = prompt("Motivo da advertência?");
        if (reason === null) return;
        await warnMember(currentServer.id, uid, reason || "Sem motivo", currentUser.uid);
        toast("Advertência registrada");
      }
      if (act === "kick") {
        if (!confirm("Expulsar este membro?")) return;
        await kickMember(currentServer.id, uid);
        toast("Membro expulso");
      }
      if (act === "ban") {
        const reason = prompt("Motivo do banimento?");
        if (reason === null) return;
        await banMember(currentServer.id, uid, reason || "Sem motivo");
        toast("Membro banido");
      }
    });
  });
}

/* ---------- PERFIL DE USUÁRIO ---------- */
function renderAvatarHTML(p) {
  if (p?.avatar) return `<img src="${escapeHTML(p.avatar)}">`;
  return `<div class="profile-avatar-fallback">${escapeHTML((p?.displayName || "U").charAt(0).toUpperCase())}</div>`;
}

async function getTagsHTML(uid) {
  const tags = await getUserActiveTags(uid);
  const list = Object.values(tags).filter(t => t && t.tag);
  if (!list.length) return "";
  return `<div class="profile-tags-row">${list.map(t => {
    const icon = t.icon
      ? (t.icon.startsWith("http") ? `<img src="${escapeHTML(t.icon)}" style="width:14px;height:14px;border-radius:3px;">` : escapeHTML(t.icon))
      : "";
    return `<span class="profile-tag">${icon}[${escapeHTML(t.tag)}]</span>`;
  }).join("")}</div>`;
}

async function renderProfileView(profile, isMe) {
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
  const tagsHTML = await getTagsHTML(profile.uid);

  return `
    <div class="profile-banner" style="${bannerStyle}">
      <button class="profile-close" id="profile-close-btn"><svg class="icon"><use href="#i-close"/></svg></button>
      <div class="profile-avatar-wrap">${renderAvatarHTML(profile)}</div>
    </div>
    <div class="profile-body">
      ${tagsHTML}
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
    if (!snap.exists()) { profileModal.innerHTML = `<div class="profile-body"><p>Perfil não encontrado.</p></div>`; return; }
    const profile = { uid, ...snap.val() };
    const isMe = currentUser && currentUser.uid === uid;
    profileModal.innerHTML = await renderProfileView(profile, isMe);
    profileModal.querySelector("#profile-close-btn").addEventListener("click", () => profileBackdrop.classList.add("hidden"));
    if (isMe) profileModal.querySelector("#profile-edit-btn").addEventListener("click", () => renderProfileEdit(profile));
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
      <label><span>Status personalizado</span><input type="text" id="pf-customStatus" maxlength="60" value="${escapeHTML(profile.customStatus || "")}" /></label>
      <label><span>Bio</span><textarea id="pf-bio" maxlength="300">${escapeHTML(profile.bio || "")}</textarea></label>
      <label><span>Avatar (URL ou .gif)</span><input type="url" id="pf-avatar" value="${escapeHTML(profile.avatar || "")}" /></label>
      <label><span>Banner (URL ou .gif)</span><input type="url" id="pf-banner" value="${escapeHTML(theme.banner || "")}" /></label>
      <label><span>Status</span><select id="pf-status">${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${profile.status === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></label>
      <div class="profile-section-title">Cor de fundo</div>
      <div class="color-row"><input type="color" id="pf-bgColor" value="${theme.bgColor || "#1c1c2a"}" /><span>Cor sólida</span></div>
      <div class="profile-section-title">Gradiente</div>
      <label style="flex-direction:row;align-items:center;gap:10px;"><input type="checkbox" id="pf-gradEnabled" ${g.enabled ? "checked" : ""} style="width:auto;" /><span>Ativar gradiente</span></label>
      <div class="color-row">
        <input type="color" id="pf-gradFrom" value="${g.colorFrom || "#8b5cf6"}" />
        <input type="color" id="pf-gradTo" value="${g.colorTo || "#3b82f6"}" />
        <select id="pf-gradDir" style="flex:1;"><option value="to bottom" ${g.direction !== "to top" ? "selected" : ""}>Cima → Baixo</option><option value="to top" ${g.direction === "to top" ? "selected" : ""}>Baixo → Cima</option></select>
      </div>
      <div class="profile-section-title">Links</div>
      <div id="pf-links-list">${Object.entries(links).map(([id, l]) => `<div class="link-item">${l.image ? `<img src="${escapeHTML(l.image)}">` : ""}<div class="link-meta"><strong>${escapeHTML(l.label)}</strong><small>${escapeHTML(l.url)}</small></div><button type="button" class="icon-btn pf-link-remove" data-id="${id}"><svg class="icon"><use href="#i-trash"/></svg></button></div>`).join("")}</div>
      <label><span>Nome do link</span><input type="text" id="pf-link-label" maxlength="30" /></label>
      <label><span>URL do link</span><input type="url" id="pf-link-url" /></label>
      <label><span>URL do ícone</span><input type="url" id="pf-link-image" /></label>
      <button type="button" class="btn-primary full" id="pf-add-link" style="margin-bottom:16px;">Adicionar link</button>
      <div class="profile-actions"><button class="btn-primary" id="pf-save">Salvar</button></div>
    </div>
  `;

  profileModal.querySelector("#profile-close-btn").addEventListener("click", () => profileBackdrop.classList.add("hidden"));
  profileModal.querySelector("#pf-add-link").addEventListener("click", async () => {
    const label = profileModal.querySelector("#pf-link-label").value.trim();
    const url = profileModal.querySelector("#pf-link-url").value.trim();
    const image = profileModal.querySelector("#pf-link-image").value.trim();
    if (!label || !url) { toast("Preencha nome e URL", "error"); return; }
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
    if (!data.displayName) { toast("Nome obrigatório", "error"); return; }
    try {
      await updateProfile(currentUser.uid, data);
      toast("Perfil salvo!", "success");
      const fresh = await import("./profile.js").then(m => m.getUserProfile(currentUser.uid));
      profileModal.innerHTML = await renderProfileView(fresh, true);
      profileModal.querySelector("#profile-close-btn").addEventListener("click", () => profileBackdrop.classList.add("hidden"));
      profileModal.querySelector("#profile-edit-btn")?.addEventListener("click", () => renderProfileEdit(fresh));
    } catch (err) { toast("Erro: " + err.message, "error"); }
  });
}

btnMyProfile.addEventListener("click", () => { if (currentUser) openProfile(currentUser.uid); });
profileBackdrop.addEventListener("click", (e) => { if (e.target === profileBackdrop) profileBackdrop.classList.add("hidden"); });

/* ---------- EMOJI ---------- */
btnEmoji.addEventListener("click", (e) => {
  e.preventDefault();
  const isHidden = emojiPicker.classList.contains("hidden");
  if (isHidden) {
    emojiPicker.classList.remove("hidden");
    renderEmojiPicker(emojiPicker, (emoji) => {
      const s = chatInput.selectionStart ?? chatInput.value.length;
      const en = chatInput.selectionEnd ?? chatInput.value.length;
      chatInput.value = chatInput.value.slice(0, s) + emoji + chatInput.value.slice(en);
      chatInput.selectionStart = chatInput.selectionEnd = s + emoji.length;
      chatInput.focus();
    });
  } else emojiPicker.classList.add("hidden");
});
document.addEventListener("click", (e) => {
  if (!emojiPicker.classList.contains("hidden") && !emojiPicker.contains(e.target) && !btnEmoji.contains(e.target)) {
    emojiPicker.classList.add("hidden");
  }
});

/* ---------- IMAGEM ---------- */
btnImage.addEventListener("click", () => {
  const url = prompt("URL da imagem (aceita .gif):");
  if (!url) return;
  if (!currentServer || !currentChannel) { toast("Entre num canal primeiro", "error"); return; }
  sendImageMessage(currentServer.id, currentChannel.id, url).catch(err => toast("Erro: " + err.message, "error"));
});

/* ---------- SERVIDOR ---------- */
function resetServerPanel() {
  currentServer = null; currentChannel = null;
  serverBanner.style.backgroundImage = "";
  serverName.textContent = "Selecione um servidor";
  serverSub.textContent = "—";
  serverTagRow.innerHTML = "";
  channelsSection.innerHTML = `<div class="empty-channels">Selecione um servidor</div>`;
  chatTitle.textContent = "—";
  chatSubtitle.textContent = "Selecione um canal para começar";
  chatMessages.innerHTML = "";
  chatInput.disabled = true;
}

function makeChannelEl(ch, server) {
  const el = document.createElement("div");
  el.className = "channel";
  const iconId = ch.type === "voice" ? "i-volume" : "i-hash";
  el.innerHTML = `<svg class="icon"><use href="#${iconId}"/></svg>${escapeHTML(ch.name)}`;
  el.addEventListener("click", () => {
    if (ch.type === "voice") enterCallUI(server.id, server.name, ch);
    else selectChannel(server, ch);
  });
  return el;
}

function renderChannels() {
  if (!currentServer) { channelsSection.innerHTML = `<div class="empty-channels">Selecione um servidor</div>`; return; }
  const isOwner = currentServer.ownerId === currentUser.uid;
  const textCh = currentChannels.filter(c => c.type === "text");
  const voiceCh = currentChannels.filter(c => c.type === "voice");
  const noCatText = textCh.filter(c => !c.categoryId);
  const noCatVoice = voiceCh.filter(c => !c.categoryId);

  let html = "";

  if (noCatText.length) {
    html += `<div class="channels-group"><div class="channels-group-head"><h3>Canais de texto</h3><button class="icon-btn xs" data-create="text"><svg class="icon"><use href="#i-plus"/></svg></button></div><div data-list="text-nocat"></div></div>`;
  }
  if (noCatVoice.length) {
    html += `<div class="channels-group"><div class="channels-group-head"><h3>Canais de voz</h3><button class="icon-btn xs" data-create="voice"><svg class="icon"><use href="#i-plus"/></svg></button></div><div data-list="voice-nocat"></div></div>`;
  }
  currentCategories.forEach(cat => {
    const cats = currentChannels.filter(c => c.categoryId === cat.id);
    if (!cats.length) return;
    html += `<div class="channels-group" data-cat="${cat.id}"><div class="category-label"><span>${escapeHTML(cat.name)}</span>${isOwner ? `<button class="icon-btn xs" data-del-cat="${cat.id}"><svg class="icon"><use href="#i-trash"/></svg></button>` : ""}</div><div data-list="cat-${cat.id}"></div></div>`;
  });
  if (isOwner) {
    html += `<div style="padding:12px 8px;"><button class="icon-btn xs" id="btn-add-category" style="width:100%;height:auto;padding:8px;gap:6px;display:flex;justify-content:center;color:var(--text-2);font-size:12px;"><svg class="icon"><use href="#i-plus"/></svg> Nova categoria</button></div>`;
  }
  if (!currentChannels.length) {
    html = `<div class="empty-channels" style="padding:16px 12px">Nenhum canal ainda</div>` + html;
  }

  channelsSection.innerHTML = html;

  const t = channelsSection.querySelector('[data-list="text-nocat"]');
  if (t) noCatText.forEach(ch => t.appendChild(makeChannelEl(ch, currentServer)));
  const v = channelsSection.querySelector('[data-list="voice-nocat"]');
  if (v) noCatVoice.forEach(ch => v.appendChild(makeChannelEl(ch, currentServer)));
  currentCategories.forEach(cat => {
    const list = channelsSection.querySelector(`[data-list="cat-${cat.id}"]`);
    if (list) currentChannels.filter(c => c.categoryId === cat.id).forEach(ch => list.appendChild(makeChannelEl(ch, currentServer)));
  });

  channelsSection.querySelectorAll("[data-create]").forEach(btn => btn.addEventListener("click", () => openCreateChannelModal(btn.dataset.create)));
  channelsSection.querySelectorAll("[data-del-cat]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Excluir categoria?")) return;
    await deleteCategory(currentServer.id, btn.dataset.delCat);
    toast("Categoria excluída");
  }));
  const btnAddCat = channelsSection.querySelector("#btn-add-category");
  if (btnAddCat) btnAddCat.addEventListener("click", openCreateCategoryModal);
}

async function selectServer(server) {
  currentServer = server;
  currentChannel = null;

  serverName.textContent = server.name;
  serverSub.textContent = server.description || "Servidor";
  serverBanner.style.backgroundImage = server.banner ? `url('${server.banner}')` : "";
  serverTagRow.innerHTML = server.tag ? `<span class="server-tag-chip">${server.tagIcon ? (server.tagIcon.startsWith("http") ? `<img src="${escapeHTML(server.tagIcon)}">` : escapeHTML(server.tagIcon)) : ""}${escapeHTML(server.tag)}</span>` : "";

  chatTitle.textContent = "—";
  chatSubtitle.textContent = "Escolha um canal";
  chatInput.disabled = true;
  chatInput.value = "";
  chatMessages.innerHTML = `<div class="chat-empty"><div class="chat-empty-icon">#</div><p>${escapeHTML(server.name)}</p><small>Escolha um canal à esquerda</small></div>`;

  if (unsubChannels) unsubChannels();
  if (unsubCategories) unsubCategories();
  if (unsubRoles) unsubRoles();
  if (unsubMembers) unsubMembers();
  if (unsubMessages) unsubMessages();

  unsubChannels = listenChannels(server.id, (channels) => {
    currentChannels = channels;
    renderChannels();
    if (!currentChannel) {
      const firstText = channels.find(c => c.type === "text");
      if (firstText) selectChannel(server, firstText);
    }
  });
  unsubCategories = listenCategories(server.id, (cats) => { currentCategories = cats; renderChannels(); });
  unsubRoles = listenRoles(server.id, (roles) => { currentRoles = roles; if (!serverSettingsBackdrop.classList.contains("hidden")) renderRolesList(); });
  unsubMembers = listenMembers(server.id, (members) => { currentMembers = members; if (!serverSettingsBackdrop.classList.contains("hidden")) renderMembersList(); });
}

function selectChannel(server, channel) {
  currentChannel = channel;
  channelsSection.querySelectorAll(".channel").forEach(el => el.classList.toggle("active", el.textContent.trim() === channel.name));
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
      chatMessages.innerHTML = `<div class="chat-empty"><div class="chat-empty-icon">#</div><p>Nenhuma mensagem ainda</p><small>Seja o primeiro a enviar</small></div>`;
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
  const avatarInner = m.authorAvatar ? `<img src="${escapeHTML(m.authorAvatar)}">` : initial;
  let time = "";
  if (m.createdAt) time = new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const contentHTML = m.imageUrl
    ? `<img class="msg-image" src="${escapeHTML(m.imageUrl)}" onclick="window.open('${escapeHTML(m.imageUrl)}','_blank')">`
    : `<div class="msg-text">${escapeHTML(m.content || "")}</div>`;

  el.innerHTML = `
    <div class="avatar" data-uid="${m.authorId}" style="cursor:pointer">${avatarInner}</div>
    <div class="msg-body">
      <div class="msg-head">
        <strong data-uid="${m.authorId}" style="cursor:pointer">${escapeHTML(m.authorName || "Usuário")}</strong>
        <span class="time">${time}</span>
      </div>
      ${contentHTML}
    </div>`;
  el.querySelectorAll("[data-uid]").forEach(n => n.addEventListener("click", () => openProfile(n.dataset.uid)));
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

/* ---------- CALL UI (chat + vídeo) ---------- */
async function enterCallUI(serverId, serverName, channel) {
  enterCall(serverId, serverName, channel);
}

/* ---------- MAILBOX ---------- */
const CURRENT_VERSION = "0.5.0";
const UPDATE_LOG = [
  { v: "0.5.0", title: "Sistema de cargos e membros", body: "Agora você pode criar cargos, gerenciar permissões, advertir, expulsar e banir membros." },
  { v: "0.4.0", title: "WebRTC real", body: "Chamadas de voz de verdade com compartilhamento de tela e câmera." },
  { v: "0.3.0", title: "Categorias e perfil por servidor", body: "Organize canais em categorias e personalize seu apelido/avatar por servidor." },
  { v: "0.2.0", title: "Perfil completo", body: "Avatar, banner, bio, gradiente e links no perfil." }
];

async function checkForUpdates() {
  if (!currentUser) return;
  const { ref, get, update: rtUpdate } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
  const { rtdb } = await import("./firebase.js");
  const snap = await get(ref(rtdb, `mailbox/${currentUser.uid}/readUpdates`));
  const read = snap.exists() ? snap.val() : {};
  const unread = UPDATE_LOG.filter(u => !read[u.v]);
  if (unread.length) {
    const u = {};
    unread.forEach(up => {
      u[`mailbox/${currentUser.uid}/updates/${up.v}`] = {
        title: up.title, body: up.body, v: up.v,
        createdAt: Date.now(), read: false
      };
    });
    await rtUpdate(ref(rtdb), u);
  }
}
btnMailbox.addEventListener("click", async () => {
  mailboxBackdrop.classList.remove("hidden");
  await renderMailbox();
});
mailboxClose.addEventListener("click", () => mailboxBackdrop.classList.add("hidden"));
mailboxBackdrop.addEventListener("click", (e) => { if (e.target === mailboxBackdrop) mailboxBackdrop.classList.add("hidden"); });

document.querySelectorAll('[data-mtab]').forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll('[data-mtab]').forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll('[data-mpanel]').forEach(p => p.classList.add("hidden"));
    document.querySelector(`[data-mpanel="${tab.dataset.mtab}"]`).classList.remove("hidden");
  });
});

async function renderMailbox() {
  const { ref, get, update: rtUpdate } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
  const { rtdb } = await import("./firebase.js");

  const updatesSnap = await get(ref(rtdb, `mailbox/${currentUser.uid}/updates`));
  const updates = updatesSnap.exists() ? updatesSnap.val() : {};
  const updList = Object.entries(updates).sort((a,b) => (b[1].createdAt||0)-(a[1].createdAt||0));
  mailboxUpdates.innerHTML = updList.map(([id, u]) => `
    <div class="mail-item ${u.read ? "" : "unread"}">
      <h4>v${escapeHTML(u.v)} — ${escapeHTML(u.title)}</h4>
      <p>${escapeHTML(u.body)}</p>
      <small>${new Date(u.createdAt).toLocaleString("pt-BR")}</small>
    </div>
  `).join("") || `<p class="empty-channels">Sem atualizações</p>`;

  // Marca como lidas
  const mark = {};
  Object.keys(updates).forEach(v => { mark[`mailbox/${currentUser.uid}/updates/${v}/read`] = true; mark[`mailbox/${currentUser.uid}/readUpdates/${v}`] = true; });
  if (Object.keys(mark).length) await rtUpdate(ref(rtdb), mark).catch(() => {});

  const invSnap = await get(ref(rtdb, `mailbox/${currentUser.uid}/invites`));
  const invites = invSnap.exists() ? invSnap.val() : {};
  mailboxInvites.innerHTML = Object.entries(invites).map(([id, inv]) => `
    <div class="mail-item">
      <h4>Convite para ${escapeHTML(inv.serverName || "servidor")}</h4>
      <p>Você foi convidado por <strong>${escapeHTML(inv.fromName || "alguém")}</strong>.</p>
      <div class="mail-actions">
        <button class="accept" data-accept="${id}">Aceitar</button>
        <button class="decline" data-decline="${id}">Recusar</button>
      </div>
    </div>
  `).join("") || `<p class="empty-channels">Sem convites</p>`;

  mailboxInvites.querySelectorAll("[data-accept]").forEach(b => b.addEventListener("click", async () => {
    const id = b.dataset.accept;
    const inv = invites[id];
    try {
      const { addServerToUserIndex } = await import("./servers.js");
      await addServerToUserIndex(currentUser.uid, inv.serverId, inv.serverName, inv.serverIcon || "");
      await rtUpdate(ref(rtdb), { [`mailbox/${currentUser.uid}/invites/${id}`]: null });
      toast("Entrou no servidor!", "success");
      renderMailbox();
    } catch (e) { toast("Erro: " + e.message, "error"); }
  }));
  mailboxInvites.querySelectorAll("[data-decline]").forEach(b => b.addEventListener("click", async () => {
    await rtUpdate(ref(rtdb), { [`mailbox/${currentUser.uid}/invites/${b.dataset.decline}`]: null });
    renderMailbox();
  }));

  updateMailboxBadge();
}

async function updateMailboxBadge() {
  if (!currentUser) return;
  const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
  const { rtdb } = await import("./firebase.js");
  const snap = await get(ref(rtdb, `mailbox/${currentUser.uid}/invites`));
  const invites = snap.exists() ? Object.keys(snap.val()).length : 0;
  const updatesSnap = await get(ref(rtdb, `mailbox/${currentUser.uid}/updates`));
  let updatesUnread = 0;
  if (updatesSnap.exists()) {
    for (const u of Object.values(updatesSnap.val())) if (!u.read) updatesUnread++;
  }
  const total = invites + updatesUnread;
  if (total > 0) { mailboxBadge.textContent = total; mailboxBadge.classList.remove("hidden"); }
  else mailboxBadge.classList.add("hidden");
}

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
    if (list[0] && !currentServer) selectServer(list[0]);
  });

  checkForUpdates().then(updateMailboxBadge);
}

onAuth((user) => {
  if (user) {
    currentUser = user;
    startApp();
  } else {
    currentUser = null;
    [unsubServers, unsubChannels, unsubCategories, unsubRoles, unsubMembers, unsubMessages, unsubProfile].forEach(u => { try { u && u(); } catch {} });
    unsubServers = unsubChannels = unsubCategories = unsubRoles = unsubMembers = unsubMessages = unsubProfile = null;
    app.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    resetServerPanel();
    topbarLogo.innerHTML = "K";
    topbarLogo.style.background = "";
  }
});