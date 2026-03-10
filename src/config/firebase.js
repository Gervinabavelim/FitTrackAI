import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCD8CnOzni2NbwFktkoHxAc6wXD4C7K3rg',
  authDomain: 'fittrackai-69085.firebaseapp.com',
  projectId: 'fittrackai-69085',
  storageBucket: 'fittrackai-69085.firebasestorage.app',
  messagingSenderId: '351455489511',
  appId: '1:351455489511:web:af930ca0be16be0ed8e142',
};

if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db };
export default firebase.app();
