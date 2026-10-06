import { rtdb } from "./firebase.js";
import {
  ref, get, update, onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export async function getUserProfile(uid) {
  const snap = await get(ref(rtdb, `users/${uid}`));
  return snap.exists() ? { uid, ...snap.val() } : null;
}

export function listenUserProfile(uid, callback) {
  return onValue(ref(rtdb, `users/${uid}`), (snap) => {
    callback(snap.exists() ? { uid, ...snap.val() } : null);
  });
}

export async function updateProfile(uid, data) {
  await update(ref(rtdb, `users/${uid}`), data);
}

export async function addLink(uid, { label, url, image }) {
  const links = await getLinks(uid);
  const id = "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  links[id] = { label, url, image: image || "" };
  await update(ref(rtdb, `users/${uid}`), { links });
  return id;
}

export async function getLinks(uid) {
  const snap = await get(ref(rtdb, `users/${uid}/links`));
  return snap.exists() ? snap.val() : {};
}

export async function removeLink(uid, linkId) {
  const links = await getLinks(uid);
  delete links[linkId];
  await update(ref(rtdb, `users/${uid}`), { links });
}

export const STATUS_LABELS = {
  online: { label: "Online", color: "#22c55e" },
  away:   { label: "Ausente", color: "#eab308" },
  dnd:    { label: "Não perturbe", color: "#ef4444" },
  offline:{ label: "Invisível", color: "#7a7a8a" }
};

// Gera o estilo de fundo do perfil com base nas preferências salvas
export function buildProfileStyle(profile) {
  const t = profile?.profileTheme || {};
  const g = t.gradient || {};
  if (g.enabled && g.colorFrom && g.colorTo) {
    const dir = g.direction === "to top" ? "to top" : "to bottom";
    return `background: linear-gradient(${dir}, ${g.colorFrom}, ${g.colorTo});`;
  }
  return `background: ${t.bgColor || "#1c1c2a"};`;
}
