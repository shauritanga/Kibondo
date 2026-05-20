import { useEffect, useRef } from 'react';
import {
    requestNotificationPermission,
    saveCurrentFcmToken,
    subscribeToForegroundMessages,
    TOKEN_REFRESH_INTERVAL,
} from '../lib/fcm';

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
            const permission = await requestNotificationPermission();
            if (permission !== 'granted' || cancelled) return;

            async function fetchAndSaveToken() {
                if (cancelled) return;
                await saveCurrentFcmToken(onTokenObtained);
            }

            await fetchAndSaveToken();

            intervalRef.current = setInterval(fetchAndSaveToken, TOKEN_REFRESH_INTERVAL);

            unsubscribeRef.current = subscribeToForegroundMessages(() => {
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
