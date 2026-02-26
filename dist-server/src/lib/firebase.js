import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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
    // Priority 2: LocalStorage (Manual Input)
    const savedConfig = localStorage.getItem('firebase_config');
    if (savedConfig) {
        try {
            return JSON.parse(savedConfig);
        }
        catch (e) {
            console.error("Error parsing saved firebase config", e);
        }
    }
    return null;
};
const config = getFirebaseConfig();
// Initialize Firebase only if config is available
let dbInstance = null;
if (config) {
    try {
        const app = !getApps().length ? initializeApp(config) : getApp();
        dbInstance = getFirestore(app);
    }
    catch (e) {
        console.error("Firebase initialization failed", e);
    }
}
export const db = dbInstance;
export const isFirebaseConfigured = !!dbInstance;
