import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const TOKEN_REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000;

export function isFcmSupported(): boolean {
    return typeof window !== 'undefined'
        && 'Notification' in window
        && 'serviceWorker' in navigator
        && Boolean(VAPID_KEY)
        && Boolean(getFirebaseMessaging());
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
    if (!isFcmSupported()) return null;
    if (Notification.permission !== 'default') return Notification.permission;

    try {
        return await Notification.requestPermission();
    } catch {
        return null;
    }
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    return registration.active ? registration : navigator.serviceWorker.ready;
}

export async function fetchFcmToken(): Promise<string | null> {
    if (!isFcmSupported() || Notification.permission !== 'granted' || !VAPID_KEY) return null;

    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    const serviceWorkerRegistration = await getServiceWorkerRegistration();
    return getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration });
}

export async function saveCurrentFcmToken(saveToken: (token: string) => Promise<unknown>): Promise<void> {
    try {
        const token = await fetchFcmToken();
        if (token) await saveToken(token);
    } catch {
        // FCM is a best-effort channel; failed token fetches should not block auth.
    }
}

export function subscribeToForegroundMessages(onMessageReceived: () => void): (() => void) | null {
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    return onMessage(messaging, onMessageReceived);
}

export { TOKEN_REFRESH_INTERVAL };
