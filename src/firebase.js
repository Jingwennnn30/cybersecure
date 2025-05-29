import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCW6SaH7Ghe7fXPXF6sOtljw40rT-1iwbQ",
  authDomain: "cyber-d0e0b.firebaseapp.com",
  projectId: "cyber-d0e0b",
  storageBucket: "cyber-d0e0b.appspot.com",
  messagingSenderId: "350313172157",
  appId: "1:350313172157:web:9396660dc50797bb023bd4",
  measurementId: "G-QTHH6PF14P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const analytics = getAnalytics(app);