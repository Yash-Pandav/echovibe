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
  console.log('[Service Worker] Background message aagaya bhai:', payload);
  
  
  const title = payload.notification?.title || payload.data?.title || 'Echovibe';
  const body = payload.notification?.body || payload.data?.body || 'You have a new message.';

  const notificationOptions = {
    body: body,
    icon: '/logo.png', 
    badge: '/logo.png',
    vibrate: [200, 100, 200], 
    tag: 'echovibe-chat', 
    data: {
      url: payload.data?.click_action || '/chat-list' 
    }
  };

  return self.registration.showNotification(title, notificationOptions);
});


self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification par click hua!');

  event.notification.close(); 

  
  const urlToOpen = event.notification.data.url || '/chat-list';

  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('echovibe') && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});