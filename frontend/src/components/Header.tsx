import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppNotification, User } from '../types';
import { getNotifications, markNotificationsRead } from '../api/appsScript';

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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

  if (!user) return null;

  const unreadCount = notifications.filter((notification) => !notification.read).length;

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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Cabin Booking
            </h1>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2"
              >
                Dashboard
              </Link>
              <Link
                to="/my-bookings"
                className="text-gray-600 hover:text-gray-900 px-3 py-2"
              >
                My Bookings
              </Link>
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Admin
                </Link>
              )}
            </nav>

            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="relative p-2 rounded-lg hover:bg-gray-100"
                aria-label="Notifications"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-900">
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">No notifications yet</div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <div className="text-sm font-medium text-gray-900">{notification.title}</div>
                        <div className="text-xs text-gray-600 mt-1">{notification.message}</div>
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name}
                  </div>
                  <div className="text-xs text-gray-500">{user.role}</div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-200 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 md:hidden">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500">{user.role}</div>
                  </div>
                  <Link
                    to="/"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 md:hidden"
                    onClick={() => setShowMenu(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/my-bookings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 md:hidden"
                    onClick={() => setShowMenu(false)}
                  >
                    My Bookings
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 md:hidden"
                      onClick={() => setShowMenu(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <div className="border-t border-gray-200 mt-1 pt-1">
                    <div className="px-4 py-2 text-xs text-gray-500">
                      {user.email}
                    </div>
                    <div className="px-4 py-2 text-xs text-gray-500">
                      {user.department}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
