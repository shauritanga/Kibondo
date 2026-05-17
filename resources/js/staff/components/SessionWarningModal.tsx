import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogOut: () => void;
}

export function SessionWarningModal({ secondsRemaining, onStayLoggedIn, onLogOut }: Props) {
  const [count, setCount] = useState(secondsRemaining);

  useEffect(() => {
    setCount(secondsRemaining);
    const interval = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const mins = Math.floor(count / 60);
  const secs = count % 60;
  const display = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 p-2">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Session expiring soon
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You'll be logged out due to inactivity in{' '}
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                {display}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onStayLoggedIn}
            className="flex-1 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 transition-colors"
          >
            Stay logged in
          </button>
          <button
            onClick={onLogOut}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
