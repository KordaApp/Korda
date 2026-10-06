import { rtdb, auth } from "./firebase.js";
import {
  ref, push, set, query, limitToLast, onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export function listenMessages(serverId, channelId, callback) {
  const messagesRef = ref(rtdb, `servers/${serverId}/channels/${channelId}/messages`);
  const q = query(messagesRef, limitToLast(100));

  return onValue(q, (snap) => {
    const msgs = [];
    snap.forEach((child) => {
      msgs.push({ id: child.key, ...child.val() });
    });
    callback(msgs);
  }, (err) => {
    console.error("Erro ao escutar mensagens:", err);
    callback([]);
  });
}

export async function sendMessage(serverId, channelId, content) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const text = content.trim();
  if (!text) return;

  const messagesRef = ref(rtdb, `servers/${serverId}/channels/${channelId}/messages`);
  const newRef = push(messagesRef);

  await set(newRef, {
    authorId: user.uid,
    authorName: user.displayName || "Usuário",
    authorAvatar: user.photoURL || "",
    content: text,
    createdAt: Date.now()
  });
}
