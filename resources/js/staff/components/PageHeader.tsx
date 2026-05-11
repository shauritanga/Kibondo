export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-heading text-2xl font-bold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-xs font-semibold text-brand-text dark:text-slate-400">{subtitle}</p>
    </div>
  );
}
