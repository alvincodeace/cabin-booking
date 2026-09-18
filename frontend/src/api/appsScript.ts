import type {
  ApiResponse,
  User,
  Cabin,
  Booking,
  CabinAvailability,
  CreateLockRequest,
  CreateLockResponse,
  ConfirmBookingRequest,
  Settings,
  AppNotification,
  AuditLog,
} from '../types';

const API_URL = '/api';
// MED-1 fix: in-memory primary + sessionStorage tab-scoped fallback (55m). Server now also sets
// HttpOnly SameSite=Lax __Host-session cookie (lib/bookingApi.js:setSessionCookie) on each auth'd response.
// Future: remove token from body entirely and rely solely on cookie (auth-code flow). Until then, send both
// with credentials: 'include' so COOP/CORS path works and XSS cannot read HttpOnly cookie.
const TOKEN_SESSION_KEY = 'google_access_token';
const TOKEN_EXPIRES_AT_KEY = 'google_access_token_expires_at';
const TOKEN_TTL_MS = 55 * 60 * 1000; // refresh a bit before Google 60m expiry

let accessToken: string | null = null;
let accessTokenExpiresAt: number | null = null;

function isTokenExpired(): boolean {
  if (!accessTokenExpiresAt) return false;
  return Date.now() > accessTokenExpiresAt;
}

function clearExpiredToken(): void {
  if (isTokenExpired()) {
    accessToken = null;
    accessTokenExpiresAt = null;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(TOKEN_SESSION_KEY);
        sessionStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
      } catch {
        // ignore storage errors
      }
    }
  }
}

// Hydrate only from sessionStorage (cleared on tab close), never localStorage
if (typeof window !== 'undefined') {
  try {
    const t = sessionStorage.getItem(TOKEN_SESSION_KEY);
    const exp = sessionStorage.getItem(TOKEN_EXPIRES_AT_KEY);
    if (t) {
      accessToken = t;
      accessTokenExpiresAt = exp ? Number(exp) : Date.now() + TOKEN_TTL_MS;
      clearExpiredToken();
    }
  } catch {
    // ignore
  }
}

export function setAccessToken(token: string | null): void {
  if (token) {
    accessToken = token;
    accessTokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  } else {
    accessToken = null;
    accessTokenExpiresAt = null;
  }
  if (typeof window === 'undefined') {
    return;
  }
  // Best-effort sessionStorage mirror for reloads within same tab; cleared on tab close
  try {
    if (token && accessTokenExpiresAt) {
      sessionStorage.setItem(TOKEN_SESSION_KEY, token);
      sessionStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(accessTokenExpiresAt));
    } else {
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
      // Defense-in-depth: purge legacy localStorage token if present from older version
      localStorage.removeItem('google_access_token');
    }
  } catch {
    // ignore storage errors (e.g. blocked third-party storage)
  }
}

export function getStoredAccessToken(): string | null {
  clearExpiredToken();
  if (accessToken) {
    return accessToken;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const t = sessionStorage.getItem(TOKEN_SESSION_KEY);
    const exp = sessionStorage.getItem(TOKEN_EXPIRES_AT_KEY);
    if (t) {
      const expNum = exp ? Number(exp) : 0;
      if (expNum && Date.now() > expNum) {
        sessionStorage.removeItem(TOKEN_SESSION_KEY);
        sessionStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
        return null;
      }
      accessToken = t;
      accessTokenExpiresAt = expNum || Date.now() + TOKEN_TTL_MS;
      return accessToken;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearStoredAccessToken(): void {
  setAccessToken(null);
}

function getFriendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // LOW-2 fix: generic user-facing messages — no infra details (Vercel/Supabase) leaked
  if (
    message === 'Failed to fetch' ||
    message.toLowerCase().includes('networkerror') ||
    message.toLowerCase().includes('load failed')
  ) {
    return 'Cannot reach the booking server. Please try again in a moment.';
  }
  if (message.toLowerCase().includes('supabase') || message.toLowerCase().includes('vercel')) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  return message;
}

async function apiCall<T>(action: string, params?: object): Promise<T> {
  const token = getStoredAccessToken();
  const payload: Record<string, unknown> = {
    action,
    ...(params || {}),
  };

  if (token) {
    payload.accessToken = token;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    // CSRF hardening: require JSON; server also validates Content-Type
    const text = await response.text();
    let result: ApiResponse<T>;
    try {
      result = JSON.parse(text) as ApiResponse<T>;
    } catch {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }

    if (!result.success) {
      throw new Error(result.error?.message || 'API request failed');
    }

    return result.data as T;
  } catch (error) {
    const friendlyError = new Error(getFriendlyErrorMessage(error));
    console.error('API call failed:', error);
    throw friendlyError;
  }
}

export async function getCurrentUser(): Promise<User> {
  return apiCall<User>('currentUser');
}

export async function getCabins(): Promise<Cabin[]> {
  return apiCall<Cabin[]>('cabins');
}

export async function getBookings(date: string): Promise<Booking[]> {
  return apiCall<Booking[]>('bookings', { date });
}

export async function getCabinAvailability(
  date: string
): Promise<CabinAvailability[]> {
  return apiCall<CabinAvailability[]>('availability', { date });
}

export async function getMyBookings(): Promise<Booking[]> {
  return apiCall<Booking[]>('myBookings');
}

export async function createLock(
  request: CreateLockRequest
): Promise<CreateLockResponse> {
  return apiCall<CreateLockResponse>('createLock', request);
}

export async function refreshLock(lockId: string): Promise<{ expiresAt: string }> {
  return apiCall<{ expiresAt: string }>('refreshLock', { lockId });
}

export async function confirmBooking(
  request: ConfirmBookingRequest
): Promise<Booking> {
  return apiCall<Booking>('confirmBooking', request);
}

export async function cancelLock(lockId: string): Promise<void> {
  return apiCall<void>('cancelLock', { lockId });
}

export async function cancelBooking(bookingId: string): Promise<void> {
  return apiCall<void>('cancelBooking', { bookingId });
}

export async function getSettings(): Promise<Settings> {
  return apiCall<Settings>('settings');
}

export async function getAllBookings(filters?: {
  date?: string;
  cabinId?: string;
  userEmail?: string;
  status?: string;
}): Promise<Booking[]> {
  return apiCall<Booking[]>('allBookings', filters);
}

export async function createCabin(cabin: Omit<Cabin, 'cabinId' | 'createdAt'>): Promise<Cabin> {
  return apiCall<Cabin>('createCabin', cabin);
}

export async function updateCabin(cabin: Cabin): Promise<Cabin> {
  return apiCall<Cabin>('updateCabin', cabin);
}

export async function deleteCabin(cabinId: string): Promise<void> {
  return apiCall<void>('deleteCabin', { cabinId });
}

export async function getAllUsers(): Promise<User[]> {
  return apiCall<User[]>('allUsers');
}

export async function createUser(user: Omit<User, 'createdAt'>): Promise<User> {
  return apiCall<User>('createUser', user);
}

export async function createUsers(
  users: Omit<User, 'createdAt'>[]
): Promise<{
  created: User[];
  skipped: { email: string; reason: string }[];
  errors: { email: string; message: string }[];
}> {
  return apiCall('createUsers', { users });
}

export async function importSlackUsers(): Promise<{
  created: User[];
  skipped: { email: string; reason: string }[];
  errors: { email: string; message: string }[];
}> {
  return apiCall('importSlackUsers');
}

export async function updateUser(user: User): Promise<User> {
  return apiCall<User>('updateUser', user);
}

export async function updateUserStatus(
  email: string,
  active: boolean
): Promise<void> {
  return apiCall<void>('updateUserStatus', { email, active });
}

export async function updateUserRole(
  email: string,
  role: User['role']
): Promise<User> {
  return apiCall<User>('updateUserRole', { email, role });
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  return apiCall<Settings>('updateSettings', settings);
}

export async function getActiveLocks(): Promise<number> {
  return apiCall<number>('activeLocks');
}

export async function getCompanyUsers(): Promise<
  Pick<User, 'email' | 'name' | 'department' | 'role'>[]
> {
  return apiCall('companyUsers');
}

export async function getNotifications(): Promise<AppNotification[]> {
  return apiCall<AppNotification[]>('notifications');
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  return apiCall<void>('markNotificationsRead', { ids });
}

export async function getTodayStats(): Promise<{
  totalCabins: number;
  availableToday: number;
  todayBookings: number;
  activeLocks: number;
}> {
  return apiCall('todayStats');
}

export async function getAuditLogs(search?: string): Promise<{
  logs: AuditLog[];
  setupRequired: boolean;
}> {
  return apiCall('auditLogs', { search });
}

export async function recordLogin(): Promise<void> {
  return apiCall<void>('recordLogin');
}

export async function recordLogout(): Promise<void> {
  return apiCall<void>('recordLogout');
}
