import { db } from "./firebase.js";
import {
  collection, doc, addDoc, setDoc, getDocs, query, where,
  orderBy, onSnapshot, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Cria um servidor novo + membro + canal #geral em batch.
 * Retorna o ID do servidor.
 */
export async function createServer(uid, name, description = "") {
  const serverRef = doc(collection(db, "servers"));
  const serverId = serverRef.id;
  const geralRef = doc(collection(db, "servers", serverId, "channels"));
  const memberRef = doc(db, "servers", serverId, "members", uid);

  const batch = writeBatch(db);

  batch.set(serverRef, {
    name,
    description: description || "Servidor de comunidade",
    icon: "",
    ownerId: uid,
    memberCount: 1,
    createdAt: serverTimestamp()
  });

  batch.set(memberRef, {
    joinedAt: serverTimestamp(),
    role: "owner"
  });

  batch.set(geralRef, {
    name: "geral",
    type: "text",
    position: 0,
    createdAt: serverTimestamp()
  });

  await batch.commit();
  return { serverId, channelId: geralRef.id };
}

/**
 * Escuta em tempo real todos os servidores que o usuário é membro.
 */
export function listenUserServers(uid, callback) {
  // Primeiro busca os IDs dos servidores que o user participa
  // Estrutura simples: busca em todas as subs collections members
  // Solução MVP: manter índice reverso users/{uid}/servers/{serverId}
  const userServersRef = collection(db, "users", uid, "serverList");
  return onSnapshot(userServersRef, async (snap) => {
    const ids = snap.docs.map(d => d.id);
    if (!ids.length) return callback([]);

    const servers = [];
    for (const id of ids) {
      // Pega snapshot de cada servidor
      const serverSnap = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
        .then(m => m.getDoc(doc(db, "servers", id)));
      if (serverSnap.exists()) {
        servers.push({ id: serverSnap.id, ...serverSnap.data() });
      }
    }
    callback(servers);
  });
}

/**
 * Adiciona o servidor ao índice do usuário (para listagem rápida).
 */
export async function addServerToUserIndex(uid, serverId, serverName, serverIcon = "") {
  await setDoc(doc(db, "users", uid, "serverList", serverId), {
    name: serverName,
    icon: serverIcon,
    addedAt: serverTimestamp()
  });
}

/**
 * Lista canais de um servidor em tempo real.
 */
export function listenChannels(serverId, callback) {
  const ref = collection(db, "servers", serverId, "channels");
  const q = query(ref, orderBy("position"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Cria um canal novo num servidor.
 */
export async function createChannel(serverId, name, type = "text") {
  const ref = collection(db, "servers", serverId, "channels");
  const snap = await getDocs(ref);
  await addDoc(ref, {
    name: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    type,
    position: snap.size,
    createdAt: serverTimestamp()
  });
    }
