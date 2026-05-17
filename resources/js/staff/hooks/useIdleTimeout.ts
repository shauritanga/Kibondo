import { useEffect, useRef, useCallback } from 'react';

const EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel'];

interface Options {
  timeoutMs: number;
  warningMs: number;  // how long before timeout to fire onWarning
  onWarning: () => void;
  onIdle: () => void;
}

export function useIdleTimeout({ timeoutMs, warningMs, onWarning, onIdle }: Options) {
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (idleTimer.current)    clearTimeout(idleTimer.current);
    warningTimer.current = setTimeout(onWarning, timeoutMs - warningMs);
    idleTimer.current    = setTimeout(onIdle,    timeoutMs);
  }, [timeoutMs, warningMs, onWarning, onIdle]);

  useEffect(() => {
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (idleTimer.current)    clearTimeout(idleTimer.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [reset]);

  return reset; // expose so "Stay logged in" can manually reset
}
