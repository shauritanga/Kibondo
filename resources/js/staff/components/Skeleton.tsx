import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700', className)} />;
}

export function PageLoading({ message = 'Loading…' }: { message?: string }) {
  return <div className="p-6 text-sm text-slate-500 dark:text-slate-400">{message}</div>;
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-sm text-red-500">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-bold text-brand-green hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}
