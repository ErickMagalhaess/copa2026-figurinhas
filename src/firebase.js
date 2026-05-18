import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBomFrc36un5x-NshOmpF70EuCLbf7HWIU",
  authDomain: "copa2026-figurinhas.firebaseapp.com",
  projectId: "copa2026-figurinhas",
  storageBucket: "copa2026-figurinhas.firebasestorage.app",
  messagingSenderId: "450669857201",
  appId: "1:450669857201:web:393589f5680ea27ac59590",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
