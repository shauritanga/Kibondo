import clsx from 'clsx';

interface Props {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onDismiss, className }: Props) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800/50',
        className
      )}
    >
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-3 shrink-0 underline">
          Dismiss
        </button>
      )}
    </div>
  );
}
