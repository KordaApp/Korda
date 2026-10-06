import { auth, rtdb } from "./firebase.js";
import {
  GoogleAuthProvider, signInWithPopup, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  ref, get, set, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const googleProvider = new GoogleAuthProvider();

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loginGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(result.user);
  return result.user;
}

export async function registerEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await ensureUserDoc(cred.user, name);
  return cred.user;
}

export async function loginEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(cred.user);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

async function ensureUserDoc(user, nameOverride) {
  const userRef = ref(rtdb, `users/${user.uid}`);
  const snap = await get(userRef);
  if (snap.exists()) return;

  const base = (user.email || "user").split("@")[0]
    .toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
  const username = `${base}${Math.floor(Math.random() * 9999)}`;

  await set(userRef, {
    displayName: nameOverride || user.displayName || "Usuário",
    username,
    email: user.email || "",
    avatar: user.photoURL || "",
    banner: "",
    bio: "",
    status: "online",
    createdAt: Date.now(),
    lastSeen: Date.now()
  });
}

export function traduzErro(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "Senha muito curta (mínimo 6 caracteres).",
    "auth/popup-closed-by-user": "Login cancelado.",
    "auth/unauthorized-domain": "Domínio não autorizado no Firebase."
  };
  return map[code] || "Erro ao autenticar. Tente novamente.";
}
