import { ref as dbRef, push, onChildAdded, off } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { rtdb, storage } from './config';

export const sendMessage = (sessionId, { sender, senderName, text, fileUrl = null, fileType = null }) => {
  const chatRef = dbRef(rtdb, `chats/${sessionId}/messages`);
  return push(chatRef, {
    sender,
    senderName,
    text,
    fileUrl,
    fileType,
    timestamp: Date.now(),
  });
};

export const uploadFile = async (sessionId, file) => {
  const fileId = `${Date.now()}_${file.name}`;
  const fileRef = storageRef(storage, `chats/${sessionId}/${fileId}`);
  const snapshot = await uploadBytes(fileRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, type: file.type };
};

export const listenToMessages = (sessionId, callback) => {
  const chatRef = dbRef(rtdb, `chats/${sessionId}/messages`);
  const handler = onChildAdded(chatRef, (snap) => {
    callback({ id: snap.key, ...snap.val() });
  });
  return () => off(chatRef, 'child_added', handler);
};
