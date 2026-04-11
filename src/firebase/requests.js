import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from './config';

// Get or create anonymous student ID
export const getStudentToken = () => {
  let token = localStorage.getItem('icanfly_student_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('icanfly_student_token', token);
  }
  return token;
};

export const submitHelpRequest = async ({ nickname, topic, timing }) => {
  const studentToken = getStudentToken();
  const ref = await addDoc(collection(db, 'requests'), {
    nickname,
    topic,
    timing,
    status: 'pending',
    studentToken,
    volunteerId: null,
    volunteerName: null,
    createdAt: serverTimestamp(),
    sessionId: null,
  });
  return ref.id;
};

// Live listener for pending requests (volunteer dashboard)
export const listenToQueue = (callback) => {
  const q = query(
    collection(db, 'requests'),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
    callback(requests);
  });
};

// Listen to requests for a student token
export const listenToMyRequests = (studentToken, callback) => {
  const q = query(
    collection(db, 'requests'),
    where('studentToken', '==', studentToken)
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    callback(requests);
  });
};

export const acceptRequest = async (requestId, volunteer, sessionId) => {
  await updateDoc(doc(db, 'requests', requestId), {
    status: 'matched',
    volunteerId: volunteer.uid,
    volunteerName: volunteer.displayName,
    sessionId: sessionId,
  });
};

export const getRequest = async (requestId) => {
  const snap = await getDoc(doc(db, 'requests', requestId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const completeRequest = async (requestId, sessionId) => {
  await updateDoc(doc(db, 'requests', requestId), {
    status: 'completed',
    sessionId,
  });
};

// Listen to the most recent active or matched request for a student
export const listenToActiveRequest = (studentToken, callback) => {
  const q = query(
    collection(db, 'requests'),
    where('studentToken', '==', studentToken),
    where('status', 'in', ['pending', 'matched'])
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
    } else {
      // Get the most recent one
      const requests = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(requests[0]);
    }
  });
};
// Listen to all active or matched requests for a student
export const listenToMyActiveRequests = (studentToken, callback) => {
  const q = query(
    collection(db, 'requests'),
    where('studentToken', '==', studentToken),
    where('status', 'in', ['pending', 'matched'])
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    callback(requests);
  });
};
