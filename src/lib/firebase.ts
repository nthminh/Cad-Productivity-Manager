
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const getFirebaseConfig = () => {
  // Priority 1: Environment Variables from Vite
  const envConfig = {
    apiKey: "AIzaSyCYAcruYx8ee37dfnUle7Djstd0vqhxDs4",
    authDomain: "cad-productivity-manager.firebaseapp.com",
    databaseURL: "https://cad-productivity-manager-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cad-productivity-manager",
    storageBucket: "cad-productivity-manager.firebasestorage.app",
    messagingSenderId: "832543652134",
    appId: "1:832543652134:web:34659e22fab627157a69e7",
    measurementId: "G-R1N58R71VE"
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

  // Priority 3: Hardcoded config (as a last resort)
  const hardcodedConfig = {
    apiKey: "AIzaSyCYAcruYx8ee37dfnUle7Djstd0vqhxDs4",
    authDomain: "cad-productivity-manager.firebaseapp.com",
    projectId: "cad-productivity-manager",
    storageBucket: "cad-productivity-manager.firebasestorage.app",
    messagingSenderId: "832543652134",
    appId: "1:832543652134:web:34659e22fab627157a69e7",
    measurementId: "G-R1N58R71VE"
  };

  if (hardcodedConfig.projectId) {
    return hardcodedConfig;
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

// Determine if the hardcoded config is active by comparing the project ID.
const hardcodedProjectId = "cad-productivity-manager"; 
export const isHardcodedConfigActive = config?.projectId === hardcodedProjectId;

