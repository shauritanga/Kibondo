import {
  BarChart3,
  Boxes,
  ChevronsUpDown,
  ClipboardList,
  Home,
  LogOut,
  Mail,
  Moon,
  Package,
  PanelLeft,
  Receipt,
  Settings,
  ShoppingCart,
  Sun,
  Truck,
  User,
  Users,
  Warehouse,
  X
} from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationBell } from './NotificationBell';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { SessionWarningModal } from './SessionWarningModal';

const NON_DELIVERY: string[] = ['admin', 'sales', 'stock_manager', 'accountant'];

const navItems = [
  { label: 'Dashboard',      path: '/',               icon: Home,          adminOnly: false, roles: NON_DELIVERY },
  { label: 'Sales',          path: '/pos',             icon: ShoppingCart,  adminOnly: false, roles: null },
  { label: 'Customers',      path: '/customers',       icon: Users,         adminOnly: false, roles: NON_DELIVERY },
  { label: 'Campaigns',      path: '/campaigns',       icon: Mail,          adminOnly: false, roles: NON_DELIVERY },
  { label: 'Packages',       path: '/products',        icon: Package,       adminOnly: false, roles: NON_DELIVERY },
  { label: 'Warehouse',      path: '/warehouse',       icon: Warehouse,     adminOnly: false, roles: NON_DELIVERY },
  { label: 'Delivery Zones', path: '/delivery-zones',  icon: Truck,         adminOnly: true,  roles: null },
  { label: 'Expenses',       path: '/expenses',        icon: Receipt,       adminOnly: false, roles: ['admin', 'accountant'] },
  { label: 'Reports',        path: '/reports',         icon: BarChart3,     adminOnly: false, roles: NON_DELIVERY },
  { label: 'Users & Roles',  path: '/users',           icon: Settings,      adminOnly: false, roles: NON_DELIVERY },
  { label: 'Audit Logs',     path: '/audit-logs',      icon: ClipboardList, adminOnly: true,  roles: null },
];

const TIMEOUT_MS = 15 * 60 * 1000;  // 15 minutes
const WARNING_MS =  2 * 60 * 1000;  // warn 2 minutes before

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const resetTimer = useIdleTimeout({
    timeoutMs: TIMEOUT_MS,
    warningMs: WARNING_MS,
    onWarning: () => setShowWarning(true),
    onIdle: async () => {
      setShowWarning(false);
      await logout();
      navigate('/login');
    },
  });

  async function handleStayLoggedIn() {
    setShowWarning(false);
    resetTimer();
    // Ping the server to refresh the session lifetime
    try { await import('../services/api').then(m => m.authApi.me()); } catch {}
  }

  async function handleLogOut() {
    setShowWarning(false);
    await logout();
    navigate('/login');
  }
  const userMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Close menu when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
          'fixed inset-y-0 left-0 z-40 overflow-hidden border-r border-slate-200 bg-white/95 py-6 shadow-sm',
          'dark:border-slate-700/60 dark:bg-slate-950/95',
          'transition-[width,transform] duration-300 ease-in-out',
          'lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-64',
          open ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
        )}
      >
        <div className="flex h-full flex-col px-3">
          {/* Header */}
          <div className="mb-7 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-green-900/20">
                <img src="/kibodo-logo.png" alt="Kibondo" className="h-full w-full object-contain" />
              </div>
              <div className={clsx(
                'min-w-0 overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out',
                collapsed ? 'lg:max-w-0 lg:opacity-0' : 'max-w-xs opacity-100'
              )}>
                <p className="whitespace-nowrap font-heading text-base font-bold leading-tight dark:text-white">Kibondo Green</p>
                <p className="whitespace-nowrap text-xs font-semibold text-brand-text dark:text-slate-400">Stock CRM & Sales</p>
              </div>
            </div>
            <button className="lg:hidden shrink-0 dark:text-slate-400" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1">
            {navItems.filter(item => {
              if (item.roles) return item.roles.includes(user?.role ?? '');
              if (item.adminOnly) return user?.role === 'admin';
              return true;
            }).map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
                    isActive
                      ? 'bg-green-50 text-brand-green dark:bg-green-900/30 dark:text-green-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  )
                }
              >
                <item.icon size={18} className="shrink-0" />
                <span className={clsx(
                  'overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-in-out',
                  collapsed ? 'lg:max-w-0 lg:opacity-0' : 'max-w-xs opacity-100'
                )}>
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          {/* User trigger */}
          <div ref={userMenuRef} className="relative mt-4">
            {/* Popup menu */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700/60">
                  <p className="truncate text-[10px] font-semibold text-slate-400 dark:text-slate-500">{user?.email ?? '—'}</p>
                </div>
                <div className="p-1">
                  <button onClick={() => { setUserMenuOpen(false); navigate('/profile'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <User size={13} className="text-slate-400" /> Profile
                  </button>
                  {user?.role !== 'delivery' && (
                    <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                      <Settings size={13} className="text-slate-400" /> Settings
                    </button>
                  )}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              </div>
            )}

            {/* Trigger button */}
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className={clsx(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors',
                'bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800',
                collapsed ? 'lg:justify-center' : '',
                userMenuOpen ? 'bg-slate-100 dark:bg-slate-800' : ''
              )}
            >
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-green text-[11px] font-bold text-white">
                {initials}
              </div>
              <div className={clsx(
                'flex min-w-0 flex-1 items-center justify-between overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out',
                collapsed ? 'lg:max-w-0 lg:opacity-0' : 'max-w-xs opacity-100'
              )}>
                <div className="min-w-0 text-left">
                  <p className="truncate text-[11px] font-bold dark:text-white">{user?.name ?? '—'}</p>
                  <p className="truncate text-[10px] capitalize text-slate-500 dark:text-slate-400">{user?.role ?? ''}</p>
                </div>
                <ChevronsUpDown size={12} className="shrink-0 text-slate-400" />
              </div>
            </button>
          </div>
        </div>
      </aside>

      <div className={clsx(
        'transition-[padding] duration-300 ease-in-out',
        collapsed ? 'lg:pl-[68px]' : 'lg:pl-64'
      )}>
        <header className="sticky top-0 z-30 flex min-h-12 items-center gap-3 border-b border-slate-200/70 bg-brand-light/85 px-4 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90 xl:px-6">
          <button
            onClick={() => { setOpen((o) => !o); setCollapsed((c) => !c); }}
            aria-label="Toggle navigation"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <PanelLeft size={18} />
          </button>
          <div className="hidden flex-1 md:block">
            <h1 className="font-heading text-sm font-bold text-slate-950 dark:text-white">Good morning, Kibondo team!</h1>
            <p className="text-[11px] font-semibold text-brand-text dark:text-slate-400">Sales, stock, and customers overview.</p>
          </div>
          <div className="flex-1" />

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <NotificationBell />

          {/* Header user menu */}
          <div ref={headerMenuRef} className="relative">
            {headerMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700/60">
                  <p className="truncate text-[10px] font-semibold text-slate-400 dark:text-slate-500">{user?.email ?? '—'}</p>
                </div>
                <div className="p-1">
                  <button onClick={() => { setHeaderMenuOpen(false); navigate('/profile'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <User size={13} className="text-slate-400" /> Profile
                  </button>
                  <button onClick={() => { setHeaderMenuOpen(false); navigate('/settings'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Settings size={13} className="text-slate-400" /> Settings
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setHeaderMenuOpen((o) => !o)}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-brand-green text-[10px] font-bold text-white hover:opacity-90 transition-opacity"
            >
              {initials}
            </button>
          </div>
        </header>
        <main className="px-4 py-5 xl:px-6">{children}</main>
      </div>

      {showWarning && (
        <SessionWarningModal
          secondsRemaining={WARNING_MS / 1000}
          onStayLoggedIn={handleStayLoggedIn}
          onLogOut={handleLogOut}
        />
      )}
    </div>
  );
}
