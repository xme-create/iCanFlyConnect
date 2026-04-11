import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  increment,
} from 'firebase/firestore';
import { db } from './config';

export const createSession = async ({ requestId, volunteerId, volunteerName, studentNickname, topic }) => {
  // Create a Daily.co room URL (using a random room name for now)
  const roomName = `icanfly-${crypto.randomUUID().slice(0, 8)}`;
  const dailyRoomUrl = `https://icanflyconnect.daily.co/${roomName}`;

  const ref = await addDoc(collection(db, 'sessions'), {
    requestId,
    volunteerId,
    volunteerName,
    studentNickname,
    topic,
    startTime: serverTimestamp(),
    endTime: null,
    durationMinutes: 0,
    extended: false,
    dailyRoomUrl,
    status: 'active',
  });
  return { sessionId: ref.id, dailyRoomUrl };
};

export const extendSession = async (sessionId) => {
  await updateDoc(doc(db, 'sessions', sessionId), {
    extended: true,
  });
};

export const endSession = async (sessionId, startTimeMs, extended) => {
  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTimeMs) / 60000);

  const snap = await getDoc(doc(db, 'sessions', sessionId));
  const { volunteerId, requestId } = snap.data();

  await updateDoc(doc(db, 'sessions', sessionId), {
    endTime: serverTimestamp(),
    durationMinutes,
    status: 'ended',
  });

  // Finish the request so it does not stay 'matched' on the student dashboard
  if (requestId) {
    try {
      await updateDoc(doc(db, 'requests', requestId), {
        status: 'completed',
        sessionId: null,
      });
    } catch (e) {
      console.error('Could not complete request:', e);
    }
  }

  // Update volunteer totals
  await updateDoc(doc(db, 'volunteers', volunteerId), {
    totalSessions: increment(1),
    totalMinutes: increment(durationMinutes),
  });

  return durationMinutes;
};

export const getSession = async (sessionId) => {
  const snap = await getDoc(doc(db, 'sessions', sessionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Live listener for a specific session
export const listenToSession = (sessionId, callback) => {
  return onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null); // Document does not exist
    }
  });
};

// Update session when student arrives
export const markStudentJoined = async (sessionId) => {
  try {
    await updateDoc(doc(db, 'sessions', sessionId), {
      studentJoined: true,
    });
  } catch (err) {
    console.error('Failed to mark student joined:', err);
  }
};

// Volunteer session history
export const listenToVolunteerHistory = (volunteerId, callback) => {
  const q = query(
    collection(db, 'sessions'),
    where('volunteerId', '==', volunteerId),
    orderBy('startTime', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(sessions);
  });
};
