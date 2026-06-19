import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXXuP4lIRVJpJ8iOVxhsNX1-hOts2s2Jg",
  authDomain: "riot-accounts-97c48.firebaseapp.com",
  projectId: "riot-accounts-97c48",
  storageBucket: "riot-accounts-97c48.firebasestorage.app",
  messagingSenderId: "454092046819",
  appId: "1:454092046819:web:a51d09c7db52b1c010e0d6",
  measurementId: "G-Y81LTPHMXT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
