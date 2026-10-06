import { db, auth } from "./firebase.js";
import {
  collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Escuta as últimas 100 mensagens de um canal.
 */
export function listenMessages(serverId, channelId, callback) {
  const ref = collection(db, "servers", serverId, "channels", channelId, "messages");
  const q = query(ref, orderBy("createdAt", "asc"), limit(100));

  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  }, (err) => {
    console.error("Erro ao escutar mensagens:", err);
    callback([]);
  });
}

/**
 * Envia uma mensagem para o canal.
 */
export async function sendMessage(serverId, channelId, content) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const text = content.trim();
  if (!text) return;

  const ref = collection(db, "servers", serverId, "channels", channelId, "messages");
  await addDoc(ref, {
    authorId: user.uid,
    authorName: user.displayName || "Usuário",
    authorAvatar: user.photoURL || "",
    content: text,
    createdAt: serverTimestamp()
  });
}
