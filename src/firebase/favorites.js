import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './config';
import { getStudentToken } from './requests';

const getFavDoc = () => doc(db, 'favorites', getStudentToken());

export const getFavorites = async () => {
  const snap = await getDoc(getFavDoc());
  return snap.exists() ? snap.data().volunteerIds || [] : [];
};

export const addFavorite = async (volunteerId) => {
  const favRef = getFavDoc();
  const snap = await getDoc(favRef);
  if (snap.exists()) {
    await updateDoc(favRef, { volunteerIds: arrayUnion(volunteerId) });
  } else {
    await setDoc(favRef, { studentToken: getStudentToken(), volunteerIds: [volunteerId] });
  }
};

export const removeFavorite = async (volunteerId) => {
  await updateDoc(getFavDoc(), { volunteerIds: arrayRemove(volunteerId) });
};

export const isFavorite = async (volunteerId) => {
  const favs = await getFavorites();
  return favs.includes(volunteerId);
};
