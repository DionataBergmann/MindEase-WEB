import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  const apps = getApps();
  if (apps.length > 0) return apps[0] as FirebaseApp;
  if (!firebaseConfig.apiKey) return null;
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  const auth = getAuth(app);
  // Mantém o usuário logado ao recarregar (F5) e entre abas
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  return auth;
}

/** Aguarda o Auth estar pronto (ex.: restauração da sessão) e retorna o usuário atual. Evita "Faça login" quando a sessão ainda não foi restaurada. */
export function getCurrentUserWhenReady(auth: Auth | null, timeoutMs = 3000): Promise<User | null> {
  if (!auth) return Promise.resolve(null);
  const current = auth.currentUser;
  if (current) return Promise.resolve(current);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user ?? null);
    });
  });
}

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseAnalytics() {
  if (typeof window === "undefined") return null;
  const app = getFirebaseApp();
  if (!app) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAnalytics } = require("firebase/analytics");
  return getAnalytics(app);
}
