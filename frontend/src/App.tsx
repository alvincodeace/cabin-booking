import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider, useGoogleLogin, googleLogout } from '@react-oauth/google';
import type { User } from './types';
import { getCurrentUser, getStoredAccessToken, setAccessToken } from './api/appsScript';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { MyBookings } from './pages/MyBookings';
import { Admin } from './pages/Admin';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setIsLoading(true);
      setError(null);
      setAccessToken(tokenResponse.access_token);
      loadUser(false);
    },
    onError: () => {
      setError('Google Sign-In failed. Please try again.');
      setIsLoading(false);
    },
    scope: 'openid email profile',
    hosted_domain: 'codeace.com',
  });

  useEffect(() => {
    if (getStoredAccessToken()) {
      loadUser(true);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async (silent: boolean) => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setIsGoogleAuth(true);
      setError(null);
    } catch (err: unknown) {
      setAccessToken(null);
      setUser(null);
      setIsGoogleAuth(false);
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to authenticate');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    googleLogout();
    setAccessToken(null);
    setUser(null);
    setIsGoogleAuth(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto" />
          <p className="mt-4 text-sm text-stone-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isGoogleAuth || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-800 text-white text-lg font-semibold">
            C
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-stone-900">
            Cabin Booking
          </h1>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            Sign in with Google to book a meeting cabin.
          </p>

          {error && (
            <div className="mt-5 p-3 rounded-xl bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={() => googleLogin()}
            className="mt-6 w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <svg className="w-5 h-5" width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium text-stone-800">Continue with Google</span>
          </button>

          <p className="mt-4 text-xs text-stone-400">
            Use your work Google account
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Header user={user} onSignOut={handleSignOut} />
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute user={user}>
                <MyBookings user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} requiredRoles={['ADMIN']}>
                <Admin user={user} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function App() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-stone-900">Configuration needed</h2>
          <p className="mt-2 text-sm text-stone-500">
            Set VITE_GOOGLE_CLIENT_ID in the environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}

export default App;
