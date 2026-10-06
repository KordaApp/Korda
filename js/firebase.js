import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCGxNMAZbfofs_r_m9UcLFxTW432yDAuHs",
  authDomain: "korda-app.firebaseapp.com",
  projectId: "korda-app",
  storageBucket: "korda-app.firebasestorage.app",
  messagingSenderId: "312645222520",
  appId: "1:312645222520:web:dfc60b8fcd4efed3782d8d"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
