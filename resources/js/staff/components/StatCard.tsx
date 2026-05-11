import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, className }: Props) {
  return (
    <div className={clsx('card px-4 py-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
        {Icon && <Icon size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />}
      </div>
      <p className="mt-1 font-heading text-lg font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
