import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '../lib/firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
const TOKEN_REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface UseFcmOptions {
    enabled: boolean;
    onForegroundMessage: () => void;
    onTokenObtained: (token: string) => Promise<void>;
}

export function useFcm({ enabled, onForegroundMessage, onTokenObtained }: UseFcmOptions) {
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        async function init() {
            const messaging = getFirebaseMessaging();
            if (!messaging) return;

            const permission = await Notification.requestPermission();
            if (permission !== 'granted' || cancelled) return;

            try {
                await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            } catch {
                return;
            }

            async function fetchAndSaveToken() {
                if (!messaging || cancelled) return;
                try {
                    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
                    if (token && !cancelled) {
                        await onTokenObtained(token);
                    }
                } catch {
                    // Permission revoked or token fetch failed — silent fallback
                }
            }

            await fetchAndSaveToken();

            intervalRef.current = setInterval(fetchAndSaveToken, TOKEN_REFRESH_INTERVAL);

            unsubscribeRef.current = onMessage(messaging, () => {
                onForegroundMessage();
            });
        }

        init();

        return () => {
            cancelled = true;
            unsubscribeRef.current?.();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [enabled]);
}
