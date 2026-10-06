import { rtdb } from "./firebase.js";
import {
  ref, set, get, push, update, onValue, remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export const PERMISSIONS = [
  { id: "viewChannels",   label: "Ver canais" },
  { id: "sendMessages",   label: "Enviar msgs" },
  { id: "attachFiles",    label: "Anexar arquivos" },
  { id: "connectVoice",   label: "Conectar em voz" },
  { id: "speak",          label: "Falar em voz" },
  { id: "stream",         label: "Compartilhar tela" },
  { id: "createInvites",  label: "Criar convites" },
  { id: "manageMessages", label: "Gerenciar msgs" },
  { id: "kickMembers",    label: "Expulsar" },
  { id: "banMembers",     label: "Banir" },
  { id: "manageChannels", label: "Gerenciar canais" },
  { id: "manageRoles",    label: "Gerenciar cargos" },
  { id: "manageServer",   label: "Gerenciar servidor" },
  { id: "administrator",  label: "Administrador" }
];

export const DEFAULT_PERMS = {
  viewChannels: true, sendMessages: true, attachFiles: true,
  connectVoice: true, speak: true, stream: false,
  createInvites: false, manageMessages: false, kickMembers: false,
  banMembers: false, manageChannels: false, manageRoles: false,
  manageServer: false, administrator: false
};

export async function createServer(uid, name, description = "") {
  const serverId = push(ref(rtdb, "servers")).key;
  const channelId = push(ref(rtdb, `servers/${serverId}/channels`)).key;
  const now = Date.now();

  await update(ref(rtdb), {
    [`servers/${serverId}/name`]: name,
    [`servers/${serverId}/description`]: description || "Servidor de comunidade",
    [`servers/${serverId}/bio`]: "",
    [`servers/${serverId}/icon`]: "",
    [`servers/${serverId}/banner`]: "",
    [`servers/${serverId}/tag`]: "",
    [`servers/${serverId}/tagIcon`]: "",
    [`servers/${serverId}/ownerId`]: uid,
    [`servers/${serverId}/memberCount`]: 1,
    [`servers/${serverId}/createdAt`]: now,
    [`servers/${serverId}/members/${uid}/joinedAt`]: now,
    [`servers/${serverId}/members/${uid}/roleIds/owner`]: true,
    [`servers/${serverId}/roles/owner/name`]: "Dono",
    [`servers/${serverId}/roles/owner/color`]: "#f59e0b",
    [`servers/${serverId}/roles/owner/position`]: 0,
    [`servers/${serverId}/roles/owner/permissions/administrator`]: true,
    [`servers/${serverId}/channels/${channelId}/name`]: "geral",
    [`servers/${serverId}/channels/${channelId}/type`]: "text",
    [`servers/${serverId}/channels/${channelId}/position`]: 0,
    [`servers/${serverId}/channels/${channelId}/createdAt`]: now,
    [`serverList/${uid}/${serverId}/name`]: name,
    [`serverList/${uid}/${serverId}/icon`]: "",
    [`serverList/${uid}/${serverId}/addedAt`]: now
  });

  return { serverId, channelId };
}

export async function updateServer(serverId, data) {
  const u = {};
  ["name","description","bio","icon","banner","tag","tagIcon"].forEach(k => {
    if (data[k] !== undefined) u[`servers/${serverId}/${k}`] = k === "tag" ? (data[k] || "").toUpperCase() : data[k];
  });
  await update(ref(rtdb), u);
}

export async function deleteServer(serverId, ownerUid) {
  await set(ref(rtdb, `servers/${serverId}`), null);
  await set(ref(rtdb, `serverList/${ownerUid}/${serverId}`), null);
}

export function listenUserServers(uid, callback) {
  return onValue(ref(rtdb, `serverList/${uid}`), async (snap) => {
    const ids = snap.exists() ? Object.keys(snap.val()) : [];
    if (!ids.length) return callback([]);
    const list = await Promise.all(ids.map(async (id) => {
      const s = await get(ref(rtdb, `servers/${id}`));
      return s.exists() ? { id, ...s.val() } : null;
    }));
    callback(list.filter(Boolean));
  });
}

export function listenChannels(serverId, callback) {
  return onValue(ref(rtdb, `servers/${serverId}/channels`), (snap) => {
    const val = snap.val() || {};
    const channels = Object.entries(val).map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    callback(channels);
  });
}

export function listenCategories(serverId, callback) {
  return onValue(ref(rtdb, `servers/${serverId}/categories`), (snap) => {
    const val = snap.val() || {};
    callback(Object.entries(val).map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => (a.position || 0) - (b.position || 0)));
  });
}

export function listenRoles(serverId, callback) {
  return onValue(ref(rtdb, `servers/${serverId}/roles`), (snap) => {
    const val = snap.val() || {};
    callback(Object.entries(val).map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => (a.position || 0) - (b.position || 0)));
  });
}

export function listenMembers(serverId, callback) {
  return onValue(ref(rtdb, `servers/${serverId}/members`), (snap) => {
    const val = snap.val() || {};
    callback(Object.entries(val).map(([id, d]) => ({ uid: id, ...d })));
  });
}

export async function createChannel(serverId, name, type = "text", categoryId = "") {
  const chRef = ref(rtdb, `servers/${serverId}/channels`);
  const snap = await get(chRef);
  const position = snap.exists() ? Object.keys(snap.val()).length : 0;
  const newRef = push(chRef);
  const u = {
    [`servers/${serverId}/channels/${newRef.key}/name`]: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    [`servers/${serverId}/channels/${newRef.key}/type`]: type,
    [`servers/${serverId}/channels/${newRef.key}/position`]: position,
    [`servers/${serverId}/channels/${newRef.key}/createdAt`]: Date.now()
  };
  if (categoryId) u[`servers/${serverId}/channels/${newRef.key}/categoryId`] = categoryId;
  await update(ref(rtdb), u);
  return newRef.key;
}

export async function deleteChannel(serverId, channelId) {
  await set(ref(rtdb, `servers/${serverId}/channels/${channelId}`), null);
}

export async function createCategory(serverId, name) {
  const ref_ = ref(rtdb, `servers/${serverId}/categories`);
  const snap = await get(ref_);
  const position = snap.exists() ? Object.keys(snap.val()).length : 0;
  const newRef = push(ref_);
  await set(newRef, { name, position, createdAt: Date.now() });
  return newRef.key;
}

export async function deleteCategory(serverId, categoryId) {
  const channelsSnap = await get(ref(rtdb, `servers/${serverId}/channels`));
  const u = { [`servers/${serverId}/categories/${categoryId}`]: null };
  if (channelsSnap.exists()) {
    for (const [chId, ch] of Object.entries(channelsSnap.val())) {
      if (ch.categoryId === categoryId) u[`servers/${serverId}/channels/${chId}/categoryId`] = null;
    }
  }
  await update(ref(rtdb), u);
}

/* ============ ROLES ============ */
export async function createRole(serverId, { name, color, permissions }) {
  const rRef = ref(rtdb, `servers/${serverId}/roles`);
  const snap = await get(rRef);
  const position = snap.exists() ? Object.keys(snap.val()).length : 0;
  const newRef = push(rRef);
  const u = {
    [`servers/${serverId}/roles/${newRef.key}/name`]: name,
    [`servers/${serverId}/roles/${newRef.key}/color`]: color || "#8b5cf6",
    [`servers/${serverId}/roles/${newRef.key}/position`]: position,
    [`servers/${serverId}/roles/${newRef.key}/createdAt`]: Date.now()
  };
  PERMISSIONS.forEach(p => {
    if (permissions?.[p.id]) u[`servers/${serverId}/roles/${newRef.key}/permissions/${p.id}`] = true;
  });
  await update(ref(rtdb), u);
  return newRef.key;
}

export async function updateRole(serverId, roleId, { name, color, permissions }) {
  const u = {};
  if (name !== undefined) u[`servers/${serverId}/roles/${roleId}/name`] = name;
  if (color !== undefined) u[`servers/${serverId}/roles/${roleId}/color`] = color;
  if (permissions) {
    u[`servers/${serverId}/roles/${roleId}/permissions`] = null;
    PERMISSIONS.forEach(p => {
      if (permissions[p.id]) u[`servers/${serverId}/roles/${roleId}/permissions/${p.id}`] = true;
    });
  }
  await update(ref(rtdb), u);
}

export async function deleteRole(serverId, roleId) {
  await set(ref(rtdb, `servers/${serverId}/roles/${roleId}`), null);
}

export async function assignRole(serverId, uid, roleId) {
  await set(ref(rtdb, `servers/${serverId}/members/${uid}/roleIds/${roleId}`), true);
}

export async function removeRole(serverId, uid, roleId) {
  await set(ref(rtdb, `servers/${serverId}/members/${uid}/roleIds/${roleId}`), null);
}

/* ============ MEMBERS ============ */
export async function kickMember(serverId, uid) {
  await set(ref(rtdb, `servers/${serverId}/members/${uid}`), null);
  await set(ref(rtdb, `serverList/${uid}/${serverId}`), null);
}

export async function banMember(serverId, uid, reason = "") {
  await set(ref(rtdb, `servers/${serverId}/bans/${uid}`), {
    bannedAt: Date.now(),
    reason
  });
  await kickMember(serverId, uid);
}

export async function warnMember(serverId, uid, reason, byUid) {
  const wRef = push(ref(rtdb, `servers/${serverId}/members/${uid}/warnings`));
  await set(wRef, {
    reason,
    by: byUid,
    at: Date.now()
  });
}

export async function setMemberNick(serverId, uid, nick) {
  await set(ref(rtdb, `servers/${serverId}/members/${uid}/nickname`), nick || null);
}

export async function setMemberAvatar(serverId, uid, url) {
  await set(ref(rtdb, `servers/${serverId}/members/${uid}/avatar`), url || null);
}

/* ============ TAG no perfil ============ */
export async function setUserTagActive(uid, serverId, tag, icon, active) {
  if (active && tag) {
    await set(ref(rtdb, `users/${uid}/activeTags/${serverId}`), { tag, icon: icon || "" });
  } else {
    await set(ref(rtdb, `users/${uid}/activeTags/${serverId}`), null);
  }
}

export async function getUserActiveTags(uid) {
  const snap = await get(ref(rtdb, `users/${uid}/activeTags`));
  return snap.exists() ? snap.val() : {};
                                   }
