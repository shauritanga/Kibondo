import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  message: string;
  subMessage?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, message, subMessage, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      {Icon && (
        <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Icon size={20} className="text-slate-400 dark:text-slate-500" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{message}</p>
        {subMessage && (
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subMessage}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 rounded-lg bg-brand-green px-4 py-2 text-xs font-bold text-white"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
