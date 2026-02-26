import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const getFirebaseConfig = () => {
    // Priority 1: Environment Variables (Secrets)
    const envConfig = {
        apiKey: "AIzaSyAf8Jkx_nDToPSmd4UiJllY-j9AHKjc2gI",
        authDomain: "cad-pm-19276058-4889e.firebaseapp.com",
        databaseURL: "https://cad-pm-19276058-4889e-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "cad-pm-19276058-4889e",
        storageBucket: "cad-pm-19276058-4889e.firebasestorage.app",
        messagingSenderId: "243255494351",
        appId: "1:243255494351:web:754b7eb23f44297a77d9ba"
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
