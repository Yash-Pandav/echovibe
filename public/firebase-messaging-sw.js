importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDzrjax2FQ3eR9LEVPjoTHBogNHh_Eva4Y",
  authDomain: "real-time-chat-app-2f43a.firebaseapp.com",
  projectId: "real-time-chat-app-2f43a",
  storageBucket: "real-time-chat-app-2f43a.firebasestorage.app",
  messagingSenderId: "245118108419",
  appId: "1:245118108419:web:7ea0e2649f048a6afb1f36",
  measurementId: "G-HG5FVCW2MN"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();


messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Echovibe';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/logo.png', 
    badge: '/logo.png',
    sound: 'default'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});