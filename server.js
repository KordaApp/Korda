import { rtdb } from "./firebase.js";
import {
  ref, set, get, push, update, onValue, remove
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
  const listRef = ref(rtdb, `serverList/${uid}`);
  return onValue(listRef, async (snap) => {
    const ids = snap.exists() ? Object.keys(snap.val()) : [];
    if (!ids.length) return callback([]);

    const serverPromises = ids.map(async (id) => {
      const s = await get(ref(rtdb, `servers/${id}`));
      return s.exists() ? { id, ...s.val() } : null;
    });
    const servers = (await Promise.all(serverPromises)).filter(Boolean);
    callback(servers);
  });
}

export function listenChannels(serverId, callback) {
  const channelsRef = ref(rtdb, `servers/${serverId}/channels`);
  return onValue(channelsRef, (snap) => {
    const val = snap.val() || {};
    const channels = Object.entries(val)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    callback(channels);
  });
}

export async function createChannel(serverId, name, type = "text") {
  const channelsRef = ref(rtdb, `servers/${serverId}/channels`);
  const snap = await get(channelsRef);
  const position = snap.exists() ? Object.keys(snap.val()).length : 0;
  const newRef = push(channelsRef);
  await set(newRef, {
    name: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    type,
    position,
    createdAt: Date.now()
  });
  return newRef.key;
}

export async function deleteChannel(serverId, channelId) {
  await set(ref(rtdb, `servers/${serverId}/channels/${channelId}`), null);
}

export async function addServerToUserIndex(uid, serverId, serverName, serverIcon = "") {
  await update(ref(rtdb), {
    [`serverList/${uid}/${serverId}/name`]: serverName,
    [`serverList/${uid}/${serverId}/icon`]: serverIcon,
    [`serverList/${uid}/${serverId}/addedAt`]: Date.now()
  });
}