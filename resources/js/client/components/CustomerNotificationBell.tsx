import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeNotificationsApi, type CustomerNotification } from '../services/api';
import { useFcm } from '../../shared/hooks/useFcm';

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function CustomerNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await storeNotificationsApi.list();
      setUnreadCount(res.unread_count);
      setNotifications(res.data.slice(0, 10));
    } catch {
      // Silently ignore
    }
  }

  useFcm({
    enabled: true,
    onForegroundMessage: load,
    onTokenObtained: async (token) => {
      try { await storeNotificationsApi.saveFcmToken(token); } catch {}
    },
  });

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await storeNotificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleClearRead() {
    setClearing(true);
    try {
      await storeNotificationsApi.clearRead();
      setNotifications(prev => prev.filter(n => !n.read_at));
    } finally {
      setClearing(false);
    }
  }

  async function handleClick(n: CustomerNotification) {
    if (!n.read_at) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      setUnreadCount(c => Math.max(0, c - 1));
      try { await storeNotificationsApi.markRead(n.id); } catch {}
    }
    setOpen(false);
    navigate(`/store/orders/${n.data.sale_id}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-green-700 hover:border-green-300 transition-colors"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="text-xs text-green-600 font-medium hover:underline disabled:opacity-50"
                >
                  {markingAll ? 'Marking…' : 'Mark all read'}
                </button>
              )}
              {notifications.some(n => n.read_at) && (
                <button
                  onClick={handleClearRead}
                  disabled={clearing}
                  className="text-xs text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-50"
                >
                  {clearing ? 'Clearing…' : 'Clear read'}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No notifications yet</p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-2.5 items-start"
                >
                  {!n.read_at && (
                    <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-green-500 flex-none" />
                  )}
                  <div className={!n.read_at ? '' : 'ml-[18px]'}>
                    <p className="text-xs font-medium text-gray-800 leading-snug">{n.data.message}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
