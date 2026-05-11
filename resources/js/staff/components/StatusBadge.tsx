import clsx from 'clsx';

export function StatusBadge({ children, tone = 'green' }: { children: string; tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-3 py-1 text-xs font-bold',
        tone === 'green' && 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        tone === 'amber' && 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        tone === 'red'   && 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        tone === 'blue'  && 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        tone === 'slate' && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
      )}
    >
      {children}
    </span>
  );
}
