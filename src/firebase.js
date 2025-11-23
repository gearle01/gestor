import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCcP5qt0G2VQT2JLj6po_rLXpQ2Hp5ZFBY",
  authDomain: "gestor-25758.firebaseapp.com",
  projectId: "gestor-25758",
  storageBucket: "gestor-25758.firebasestorage.app",
  messagingSenderId: "318964628366",
  appId: "1:318964628366:web:719222f154d026db2682df",
  measurementId: "G-G8LYNL0BG4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
// O appId é usado para separar dados em multi-tenancy se necessário, 
// mas para uso simples o user.uid já basta.
export const appId = 'gearle-app-production';