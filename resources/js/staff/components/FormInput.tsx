import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

const inputCls =
  'mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

const labelCls = 'text-xs font-bold text-slate-500 dark:text-slate-400';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormInput({ label, className, ...props }: FormInputProps) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input className={`${inputCls} ${className ?? ''}`} {...props} />
    </label>
  );
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
}

export function FormSelect({ label, className, children, ...props }: FormSelectProps) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select className={`${inputCls} ${className ?? ''}`} {...props}>
        {children}
      </select>
    </label>
  );
}
