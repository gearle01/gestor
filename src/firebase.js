import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// 👇 1. Adicione a importação do Storage
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const functions = getFunctions(app);
// 👇 2. Inicialize o Storage
const storage = getStorage(app);

// 👇 3. Exporte o storage
export { auth, googleProvider, db, functions, storage, app };
// 👆 Adicione esta linha no final do seu arquivo, se certifique de incluir o 'appId' que usamos em outros lugares
export const appId = 'gestor-6040299391d8ecfb5972a8ade78c88bde8f50bdd';