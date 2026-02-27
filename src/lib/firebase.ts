
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const getFirebaseConfig = () => {
  // Priority 1: Environment Variables from Vite (set via .env file)
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  // Priority 2: LocalStorage (Manual Input via Settings page)
  const savedConfig = localStorage.getItem('firebase_config');
  if (savedConfig) {
    try {
      return JSON.parse(savedConfig);
    } catch (e) {
      console.error("Error parsing saved firebase config", e);
    }
  }

  console.warn("Firebase configuration not found. Please set VITE_FIREBASE_* environment variables or configure via localStorage.");
  return null;
};

const config = getFirebaseConfig();

// Initialize Firebase only if config is available
let dbInstance: any = null;
let storageInstance: any = null;

if (config) {
  try {
    const app = !getApps().length ? initializeApp(config) : getApp();
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
  } catch (e) {
    console.error("Firebase initialization failed", e);
  }
}

export const db = dbInstance;
export const storage = storageInstance;
export const isFirebaseConfigured = !!dbInstance;

