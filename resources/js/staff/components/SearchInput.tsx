import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }: Props) {
  return (
    <div className={`flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-600 dark:bg-slate-700 ${className}`}>
      <Search size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
      <input
        className="w-full bg-transparent text-xs font-semibold outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
