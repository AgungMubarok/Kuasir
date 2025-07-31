import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCv6ea6xoD581w1P3dKtc_a-DtP_v1HmJ4",
  authDomain: "pos-apps-80dbe.firebaseapp.com",
  projectId: "pos-apps-80dbe",
  storageBucket: "pos-apps-80dbe.firebasestorage.app",
  messagingSenderId: "1004069618818",
  appId: "1:1004069618818:web:d4290d8a500787568c209b",
  measurementId: "G-VRTNKV1XYG",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

/**
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "firebase/app";
  import { getAnalytics } from "firebase/analytics";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCv6ea6xoD581w1P3dKtc_a-DtP_v1HmJ4",
    authDomain: "pos-apps-80dbe.firebaseapp.com",
    projectId: "pos-apps-80dbe",
    storageBucket: "pos-apps-80dbe.firebasestorage.app",
    messagingSenderId: "1004069618818",
    appId: "1:1004069618818:web:d4290d8a500787568c209b",
    measurementId: "G-VRTNKV1XYG"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
*/