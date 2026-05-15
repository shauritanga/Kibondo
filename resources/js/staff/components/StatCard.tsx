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
    <div className={clsx('card p-5', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <Icon size={18} className="text-slate-400 dark:text-slate-500" />}
      </div>
      <p className="mt-2 font-heading text-lg font-black tracking-tight text-slate-950 dark:text-white xl:text-xl 2xl:text-2xl">
        {value}
      </p>
      <div className="mt-2 h-4" />
    </div>
  );
}
