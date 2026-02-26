import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- Hardcoded Firebase Configuration ---
// Fill in these values to embed the Firebase config directly in the app so all
// users share the same database without needing to configure anything themselves.
// Leave the fields empty to fall back to environment variables or the Settings page.
const HARDCODED_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
// ----------------------------------------

const getFirebaseConfig = () => {
  // Priority 1: Environment Variables (Secrets)
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  // Priority 2: Hardcoded config (set at build/deploy time by the developer)
  if (HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.projectId) {
    return HARDCODED_FIREBASE_CONFIG;
  }

  // Priority 3: LocalStorage (Manual Input via Settings page)
  const savedConfig = localStorage.getItem('firebase_config');
  if (savedConfig) {
    try {
      return JSON.parse(savedConfig);
    } catch (e) {
      console.error("Error parsing saved firebase config", e);
    }
  }

  return null;
};

const config = getFirebaseConfig();

// Initialize Firebase only if config is available
let dbInstance: any = null;

if (config) {
  try {
    const app = !getApps().length ? initializeApp(config) : getApp();
    dbInstance = getFirestore(app);
  } catch (e) {
    console.error("Firebase initialization failed", e);
  }
}

export const db = dbInstance;
export const isFirebaseConfigured = !!dbInstance;
export const isHardcodedConfigActive =
  !!(HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.projectId);
