import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

const MAX_INLINE_FILE_BYTES = 350 * 1024;

export const sendMessage = (
  sessionId,
  { sender, senderName, text, fileUrl = null, fileType = null, fileName = null }
) => {
  const chatRef = collection(db, 'sessions', sessionId, 'messages');
  return addDoc(chatRef, {
    sender,
    senderName,
    text,
    fileUrl,
    fileType,
    fileName,
    sentAt: Date.now(),
  });
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });

export const uploadFile = async (sessionId, file) => {
  const fileId = `${Date.now()}_${file.name}`;
  if (file.size <= MAX_INLINE_FILE_BYTES) {
    const dataUrl = await fileToDataUrl(file);
    return {
      url: dataUrl,
      type: file.type,
      name: file.name,
      size: file.size,
      inline: true,
      fallbackReason: 'inline-small-file',
    };
  }

  try {
    const fileRef = storageRef(storage, `chats/${sessionId}/${fileId}`);
    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      type: file.type,
      name: file.name,
      size: file.size,
    };
  } catch (storageError) {
    if (file.size > MAX_INLINE_FILE_BYTES) {
      throw new Error('This file is too large to send right now. Please choose a file under 350 KB.');
    }

    const dataUrl = await fileToDataUrl(file);
    return {
      url: dataUrl,
      type: file.type,
      name: file.name,
      size: file.size,
      inline: true,
      fallbackReason: storageError?.code || 'storage-upload-failed',
    };
  }
};

export const listenToMessages = (sessionId, callback, onError) => {
  const chatQuery = query(
    collection(db, 'sessions', sessionId, 'messages'),
    orderBy('sentAt', 'asc')
  );
  return onSnapshot(
    chatQuery,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    },
    onError
  );
};
