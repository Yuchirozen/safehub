import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC1us7eXlX8XIB4p2CeTJURDJn7MP0CAxA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smarthub-c8309.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smarthub-c8309",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smarthub-c8309.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "764172958278",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:764172958278:web:9c4dc9d5f3616469046847",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5GQN0WR3D6"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
