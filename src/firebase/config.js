import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAP_iysB3fcpfkA1EF-SRiJtuwEB-63kbQ",
  authDomain: "icanflyconnect.firebaseapp.com",
  databaseURL: "https://icanflyconnect-default-rtdb.firebaseio.com",
  projectId: "icanflyconnect",
  storageBucket: "icanflyconnect.firebasestorage.app",
  messagingSenderId: "743096004659",
  appId: "1:743096004659:web:a09eca251368a6c330b346",
  measurementId: "G-F8EMDTED74"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
