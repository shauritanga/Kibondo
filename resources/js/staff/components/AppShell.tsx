import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  Home,
  LogOut,
  Mail,
  Menu,
  Moon,
  Settings,
  ShoppingCart,
  Sun,
  Users,
  X
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Sales', path: '/pos', icon: ShoppingCart },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Campaigns', path: '/campaigns', icon: Mail },
  { label: 'Stock', path: '/products', icon: Boxes },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Users & Roles', path: '/settings', icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '??';

  return (
    <div className="min-h-screen text-brand-dark dark:text-slate-200">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white/95 px-5 py-6 shadow-sm transition-transform lg:translate-x-0',
          'dark:border-slate-700/60 dark:bg-slate-950/95',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-base font-black text-white shadow-lg shadow-green-900/20">
              KG
            </div>
            <div>
              <p className="font-heading text-base font-bold leading-tight dark:text-white">Kibondo Green</p>
              <p className="text-xs font-semibold text-brand-text dark:text-slate-400">Stock CRM & Sales</p>
            </div>
          </div>
          <button className="lg:hidden dark:text-slate-400" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition',
                  isActive
                    ? 'bg-green-50 text-brand-green dark:bg-green-900/30 dark:text-green-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-green text-sm font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold dark:text-white">{user?.name ?? '—'}</p>
            <p className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role ?? ''}</p>
          </div>
          <button onClick={handleLogout} aria-label="Sign out" className="text-slate-400 hover:text-red-500 transition">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-12 items-center gap-3 border-b border-slate-200/70 bg-brand-light/85 px-4 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90 xl:px-6">
          <button className="lg:hidden dark:text-slate-300" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={18} />
          </button>
          <div className="hidden flex-1 md:block">
            <h1 className="font-heading text-sm font-bold text-slate-950 dark:text-white">Good morning, Kibondo team!</h1>
            <p className="text-[11px] font-semibold text-brand-text dark:text-slate-400">Sales, stock, and customers overview.</p>
          </div>
          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button className="relative grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <Bell size={14} className="dark:text-slate-300" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <button className="hidden h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 md:flex">
            <CalendarDays size={13} />
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </button>
        </header>
        <main className="px-4 py-5 xl:px-6">{children}</main>
      </div>
    </div>
  );
}
