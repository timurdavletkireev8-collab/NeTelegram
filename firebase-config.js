// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getDatabase, ref, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtbTs3c5EEU0AdWXDw4qxCmwDwBJVtMwY",
  authDomain: "netelegram-d8c52.firebaseapp.com",
  databaseURL: "https://netelegram-d8c52-default-rtdb.firebaseio.com",
  projectId: "netelegram-d8c52",
  storageBucket: "netelegram-d8c52.firebasestorage.app",
  messagingSenderId: "214817548440",
  appId: "1:214817548440:web:05e6113620f7ce7a9548ed",
  measurementId: "G-GK4RMTBV4X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Export Firebase services
export { database, ref, set, push, onValue, update, remove };