import { rtdb } from "./firebase.js";
import {
  ref, set, get, push, update, onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export async function createServer(uid, name, description = "") {
  const serversRef = ref(rtdb, "servers");
  const serverId = push(serversRef).key;
  const channelId = push(ref(rtdb, `servers/${serverId}/channels`)).key;
  const now = Date.now();

  await update(ref(rtdb), {
    [`servers/${serverId}/name`]: name,
    [`servers/${serverId}/description`]: description || "Servidor de comunidade",
    [`servers/${serverId}/bio`]: "",
    [`servers/${serverId}/icon`]: "",
    [`servers/${serverId}/banner`]: "",
    [`servers/${serverId}/tag`]: "",
    [`servers/${serverId}/ownerId`]: uid,
    [`servers/${serverId}/memberCount`]: 1,
    [`servers/${serverId}/createdAt`]: now,
    [`servers/${serverId}/members/${uid}/joinedAt`]: now,
    [`servers/${serverId}/members/${uid}/role`]: "owner",
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
  const updates = {};
  if (data.name !== undefined) updates[`servers/${serverId}/name`] = data.name;
  if (data.description !== undefined) updates[`servers/${serverId}/description`] = data.description;
  if (data.bio !== undefined) updates[`servers/${serverId}/bio`] = data.bio;
  if (data.icon !== undefined) updates[`servers/${serverId}/icon`] = data.icon;
  if (data.banner !== undefined) updates[`servers/${serverId}/banner`] = data.banner;
  if (data.tag !== undefined) updates[`servers/${serverId}/tag`] = (data.tag || "").toUpperCase();
  await update(ref(rtdb), updates);
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
    const channels = Object.entries(val)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    callback(channels);
  });
}

export function listenCategories(serverId, callback) {
  return onValue(ref(rtdb, `servers/${serverId}/categories`), (snap) => {
    const val = snap.val() || {};
    const cats = Object.entries(val)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    callback(cats);
  });
}

export async function createChannel(serverId, name, type = "text", categoryId = "") {
  const channelsRef = ref(rtdb, `servers/${serverId}/channels`);
  const snap = await get(channelsRef);
  const position = snap.exists() ? Object.keys(snap.val()).length : 0;
  const newRef = push(channelsRef);
  const updates = {
    [`servers/${serverId}/channels/${newRef.key}/name`]: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    [`servers/${serverId}/channels/${newRef.key}/type`]: type,
    [`servers/${serverId}/channels/${newRef.key}/position`]: position,
    [`servers/${serverId}/channels/${newRef.key}/createdAt`]: Date.now()
  };
  if (categoryId) updates[`servers/${serverId}/channels/${newRef.key}/categoryId`] = categoryId;
  await update(ref(rtdb), updates);
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
  // Remove a categoria e desvincula canais
  const channelsSnap = await get(ref(rtdb, `servers/${serverId}/channels`));
  const updates = { [`servers/${serverId}/categories/${categoryId}`]: null };
  if (channelsSnap.exists()) {
    const channels = channelsSnap.val();
    for (const [chId, ch] of Object.entries(channels)) {
      if (ch.categoryId === categoryId) {
        updates[`servers/${serverId}/channels/${chId}/categoryId`] = null;
      }
    }
  }
  await update(ref(rtdb), updates);
}

// TAG do usuário em um servidor (aparece no perfil)
export async function setUserTagActive(uid, serverId, tag, active) {
  const ref_ = ref(rtdb, `users/${uid}/activeTags/${serverId}`);
  if (active && tag) {
    await set(ref_, { tag, serverId });
  } else {
    await set(ref_, null);
  }
}

export async function getUserActiveTags(uid) {
  const snap = await get(ref(rtdb, `users/${uid}/activeTags`));
  return snap.exists() ? snap.val() : {};
}

export async function addServerToUserIndex(uid, serverId, serverName, serverIcon = "") {
  await update(ref(rtdb), {
    [`serverList/${uid}/${serverId}/name`]: serverName,
    [`serverList/${uid}/${serverId}/icon`]: serverIcon,
    [`serverList/${uid}/${serverId}/addedAt`]: Date.now()
  });
}
