import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  update,
  remove,
  push,
  child,
  query,
  orderByChild,
  limitToLast,
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js';
import { FIREBASE_CONFIG } from './config.js';

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getDatabase(app);

void setPersistence(auth, browserSessionPersistence).catch(() => {
  // Keep the admin app booting even if persistence is unavailable in this browser session.
});

export {
  app,
  auth,
  db,
  ref,
  onValue,
  get,
  set,
  update,
  remove,
  push,
  child,
  query,
  orderByChild,
  limitToLast,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
};
