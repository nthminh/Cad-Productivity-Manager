import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const getFirebaseConfig = () => {
    // Priority 1: Environment Variables (Secrets)
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
