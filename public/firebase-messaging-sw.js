importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');

// Placeholder - fill with real config if needed for background persistence
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "peakswim-xxxx.firebaseapp.com",
  projectId: "peakswim-xxxx",
  storageBucket: "peakswim-xxxx.appspot.com",
  messagingSenderId: "xxxx",
  appId: "xxxx"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
