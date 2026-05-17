import { useEffect, useRef, useCallback } from 'react';

const EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel'];

/**
 * Logs the user out after `timeoutMs` of no interaction.
 * The timer resets on any mouse, keyboard, or touch event.
 */
export function useIdleTimeout(timeoutMs: number, onIdle: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onIdle, timeoutMs);
  }, [timeoutMs, onIdle]);

  useEffect(() => {
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [reset]);
}
