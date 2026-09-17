import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../types';

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

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
                onClick={() => setShowMenu(!showMenu)}
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
