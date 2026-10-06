import { rtdb } from "./firebase.js";
import {
  ref, set, get, push, update, onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export async function createServer(uid, name, description = "") {
  const serversRef = ref(rtdb, "servers");
  const serverId = push(serversRef).key;
  const channelId = push(ref(rtdb, `servers/${serverId}/channels`)).key;
  const now = Date.now();

  // Executa todas as escritas em paralelo — cada uma escreve numa folha diferente
  await Promise.all([
    set(ref(rtdb, `servers/${serverId}/name`), name),
    set(ref(rtdb, `servers/${serverId}/description`), description || "Servidor de comunidade"),
    set(ref(rtdb, `servers/${serverId}/icon`), ""),
    set(ref(rtdb, `servers/${serverId}/ownerId`), uid),
    set(ref(rtdb, `servers/${serverId}/memberCount`), 1),
    set(ref(rtdb, `servers/${serverId}/createdAt`), now),

    set(ref(rtdb, `servers/${serverId}/members/${uid}/joinedAt`), now),
    set(ref(rtdb, `servers/${serverId}/members/${uid}/role`), "owner"),

    set(ref(rtdb, `servers/${serverId}/channels/${channelId}/name`), "geral"),
    set(ref(rtdb, `servers/${serverId}/channels/${channelId}/type`), "text"),
    set(ref(rtdb, `servers/${serverId}/channels/${channelId}/position`), 0),
    set(ref(rtdb, `servers/${serverId}/channels/${channelId}/createdAt`), now),

    set(ref(rtdb, `serverList/${uid}/${serverId}/name`), name),
    set(ref(rtdb, `serverList/${uid}/${serverId}/icon`), ""),
    set(ref(rtdb, `serverList/${uid}/${serverId}/addedAt`), now)
  ]);

  return { serverId, channelId };
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

export async function addServerToUserIndex(uid, serverId, serverName, serverIcon = "") {
  await set(ref(rtdb, `serverList/${uid}/${serverId}`), {
    name: serverName,
    icon: serverIcon,
    addedAt: Date.now()
  });
}
