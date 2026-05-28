import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

const inputCls =
  'mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

const labelCls = 'text-xs font-bold text-slate-500 dark:text-slate-400';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormInput({ label, className, type, ...props }: FormInputProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && visible ? 'text' : type;

  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <span className="relative block">
        <input
          type={inputType}
          className={`${inputCls} ${isPassword ? 'pr-10' : ''} ${className ?? ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </span>
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
