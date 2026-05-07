export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-heading text-2xl font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-xs font-semibold text-brand-text">{subtitle}</p>
    </div>
  );
}
