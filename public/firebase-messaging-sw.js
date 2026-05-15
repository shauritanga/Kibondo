importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyCdR7wInlQkKao5tfJfMaJUGm0xRm89VRY',
    authDomain: 'kibondo-4bd3e.firebaseapp.com',
    projectId: 'kibondo-4bd3e',
    storageBucket: 'kibondo-4bd3e.appspot.com',
    messagingSenderId: '705060585010',
    appId: '1:705060585010:web:d8d0f69ef2fd10a018062b',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification ?? {};
    const data = payload.data ?? {};

    self.registration.showNotification(title ?? 'Notification', {
        body: body ?? '',
        icon: '/favicon.ico',
        tag: data.type ?? 'default',
        data: { url: data.url ?? '/' },
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
