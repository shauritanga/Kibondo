import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Home,
  Menu,
  Search,
  Settings,
  ShoppingCart,
  Users,
  X
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Sales', path: '/pos', icon: ShoppingCart },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Stock', path: '/products', icon: Boxes },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Users & Roles', path: '/settings', icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen text-brand-dark">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white/95 px-5 py-6 shadow-sm transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-base font-black text-white shadow-lg shadow-green-900/20">
              KG
            </div>
            <div>
              <p className="font-heading text-base font-bold leading-tight">Kibondo Green</p>
              <p className="text-xs font-semibold text-brand-text">Stock CRM & Sales</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition',
                  isActive ? 'bg-green-50 text-brand-green' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-green text-sm font-bold text-white">OA</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">Owner Admin</p>
            <p className="text-xs text-slate-500">Administrator</p>
          </div>
          <ChevronDown size={16} />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-4 border-b border-slate-200/70 bg-brand-light/85 px-4 backdrop-blur xl:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="hidden flex-1 md:block">
            <h1 className="font-heading text-lg font-bold text-slate-950">Good morning, Kibondo team!</h1>
            <p className="text-xs font-semibold text-brand-text">Here is what is happening across sales, stock, and customers today.</p>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3 md:max-w-md">
            <div className="flex h-10 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
              <Search size={16} className="text-slate-500" />
              <input className="w-full bg-transparent text-xs outline-none" placeholder="Search anything..." />
            </div>
          </div>
          <button className="relative grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white">
            <Bell size={16} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
          </button>
          <button className="hidden h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold md:flex">
            <CalendarDays size={16} />
            7 May 2026
          </button>
        </header>
        <main className="px-4 py-5 xl:px-6">{children}</main>
      </div>
    </div>
  );
}
