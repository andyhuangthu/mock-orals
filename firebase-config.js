const firebaseConfig = {
    apiKey: "AIzaSyAN3r3KC5Kqrjp07Vide5DjXAi2TYEFd-s",
    authDomain: "mock-orals.firebaseapp.com",
    projectId: "mock-orals",
    storageBucket: "mock-orals.firebasestorage.app",
    messagingSenderId: "980267865246",
    appId: "1:980267865246:web:5605dfbe38d30bc3da178f",
    measurementId: "G-SQMBFDFWR7"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();