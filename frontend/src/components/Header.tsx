import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { AppNotification, User } from '../types';
import { getNotifications, markNotificationsRead } from '../api/appsScript';

interface HeaderProps {
  user: User | null;
  onSignOut?: () => void;
}

function navClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
  }`;
}

export function Header({ user, onSignOut }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const load = async () => {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch {
        setNotifications([]);
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  if (!user) return null;

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const initial = user.name.trim().charAt(0).toUpperCase() || 'U';

  const handleOpenNotifications = async () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);
    setShowMenu(false);
    if (nextOpen && unreadCount > 0) {
      const unreadIds = notifications.filter((notification) => !notification.read).map((item) => item.id);
      try {
        await markNotificationsRead(unreadIds);
        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      } catch {
        // Keep the badge if marking read fails.
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f4f1ec]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-800 text-white text-sm font-semibold">
              C
            </span>
            <span className="text-base font-semibold tracking-tight text-stone-900">
              Cabin Booking
            </span>
          </Link>

          <div className="flex items-center gap-2" ref={menuRef}>
            <nav className="hidden md:flex items-center gap-1 mr-2">
              <NavLink to="/" end className={navClass}>
                Cabins
              </NavLink>
              <NavLink to="/my-bookings" className={navClass}>
                My bookings
              </NavLink>
              {user.role === 'ADMIN' && (
                <NavLink to="/admin" className={navClass}>
                  Admin
                </NavLink>
              )}
            </nav>

            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="relative p-2 rounded-xl hover:bg-stone-100 text-stone-600"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-teal-800 text-white text-[10px] leading-4 text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 card overflow-hidden z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-stone-100 text-sm font-semibold text-stone-900">
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-sm text-stone-500">No notifications yet</div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3 border-b border-stone-100 last:border-b-0">
                        <div className="text-sm font-medium text-stone-900">{notification.title}</div>
                        <div className="text-xs text-stone-500 mt-1 leading-relaxed">{notification.message}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowMenu(!showMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-stone-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-800 text-white text-sm font-semibold">
                  {initial}
                </span>
                <span className="hidden sm:block text-left pr-1">
                  <span className="block text-sm font-medium text-stone-900 leading-tight">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="block text-[11px] text-stone-500 uppercase tracking-wide">
                    {user.role.replace('_', ' ')}
                  </span>
                </span>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 card py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <div className="text-sm font-medium text-stone-900">{user.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5 break-all">{user.email}</div>
                  </div>
                  <div className="py-1 md:hidden">
                    <Link to="/" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50" onClick={() => setShowMenu(false)}>
                      Cabins
                    </Link>
                    <Link to="/my-bookings" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50" onClick={() => setShowMenu(false)}>
                      My bookings
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50" onClick={() => setShowMenu(false)}>
                        Admin
                      </Link>
                    )}
                  </div>
                  {onSignOut && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
