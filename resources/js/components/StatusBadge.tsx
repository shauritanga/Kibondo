import clsx from 'clsx';

export function StatusBadge({ children, tone = 'green' }: { children: string; tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-3 py-1 text-xs font-bold',
        tone === 'green' && 'bg-green-50 text-green-700',
        tone === 'amber' && 'bg-amber-50 text-amber-700',
        tone === 'red' && 'bg-red-50 text-red-700',
        tone === 'blue' && 'bg-blue-50 text-blue-700',
        tone === 'slate' && 'bg-slate-100 text-slate-600'
      )}
    >
      {children}
    </span>
  );
}
