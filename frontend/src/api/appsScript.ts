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
const TOKEN_STORAGE_KEY = 'google_access_token';

let accessToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getStoredAccessToken(): string | null {
  if (accessToken) {
    return accessToken;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  return accessToken;
}

function getFriendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message === 'Failed to fetch' ||
    message.toLowerCase().includes('networkerror') ||
    message.toLowerCase().includes('load failed')
  ) {
    return 'Cannot reach the booking server. Check the Vercel deployment and that SUPABASE_URL is configured.';
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
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result: ApiResponse<T>;
    try {
      result = JSON.parse(text) as ApiResponse<T>;
    } catch {
      throw new Error('Backend returned an invalid response. Check that the Vercel API and Supabase keys are configured.');
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
