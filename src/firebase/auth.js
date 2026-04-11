import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();

export const registerVolunteer = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, 'volunteers', cred.user.uid), {
    uid: cred.user.uid,
    displayName,
    email,
    approved: true, // auto-approve for now
    totalSessions: 0,
    totalMinutes: 0,
    joinedAt: serverTimestamp(),
  });
  return cred.user;
};

export const loginVolunteer = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = async () => {
  const cred = await signInWithPopup(auth, googleProvider);
  const snap = await getDoc(doc(db, 'volunteers', cred.user.uid));
  if (!snap.exists()) {
    await setDoc(doc(db, 'volunteers', cred.user.uid), {
      uid: cred.user.uid,
      displayName: cred.user.displayName,
      email: cred.user.email,
      approved: true,
      totalSessions: 0,
      totalMinutes: 0,
      joinedAt: serverTimestamp(),
    });
  }
  return cred.user;
};

export const logoutVolunteer = () => signOut(auth);

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

export const getVolunteerProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'volunteers', uid));
  return snap.exists() ? snap.data() : null;
};
