import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

const users = [
  ['Owner Admin', 'Admin / Owner', 'Full access'],
  ['Sales Clerk', 'Sales staff', 'POS, customers'],
  ['Stock Manager', 'Stock manager', 'Products, stock'],
  ['Accountant Viewer', 'Accountant / Viewer', 'Reports, payments']
];

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Users & Settings" subtitle="Role-aware access model prepared for secure backend authentication." />
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h3 className="section-title">Users and Roles</h3>
          <button className="rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-white">Invite User</button>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map(([name, role, access]) => (
            <div className="grid gap-3 p-5 text-sm font-semibold md:grid-cols-[1fr_220px_1fr_100px] md:items-center" key={name}>
              <p className="font-heading font-bold text-slate-950">{name}</p>
              <p>{role}</p>
              <p className="text-slate-500">{access}</p>
              <StatusBadge tone="green">Active</StatusBadge>
            </div>
          ))}
        </div>
      </section>
      <section className="card mt-5 p-5">
        <h3 className="section-title mb-4">System Defaults</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Currency</p>
            <p className="mt-1 font-heading text-xl font-bold">TZS</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Offline Sales</p>
            <p className="mt-1 font-heading text-xl font-bold">Enabled</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Business</p>
            <p className="mt-1 font-heading text-xl font-bold">Kibondo Green Farm</p>
          </div>
        </div>
      </section>
    </div>
  );
}
