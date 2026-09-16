import { useEffect, useState } from 'react';

/**
 * Countdown gate for OTP resend actions.
 * Call `startCooldown()` after a successful send/resend.
 */
export function useOtpResendTimer(cooldownSeconds = 60) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  function startCooldown() {
    setSecondsLeft(cooldownSeconds);
  }

  function resetCooldown() {
    setSecondsLeft(0);
  }

  return {
    secondsLeft,
    canResend: secondsLeft <= 0,
    startCooldown,
    resetCooldown,
  };
}

export function formatResendLabel(secondsLeft: number, idleLabel = 'Resend code'): string {
  if (secondsLeft <= 0) return idleLabel;
  return `Resend in ${secondsLeft}s`;
}
