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
} from '../types';

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

if (!API_URL) {
  console.error('VITE_APPS_SCRIPT_URL is not configured');
}

async function apiCall<T>(
  action: string,
  params?: Record<string, any>,
  method: 'GET' | 'POST' = 'GET'
): Promise<T> {
  try {
    let url = API_URL;
    let options: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'GET') {
      const queryParams = new URLSearchParams({ action, ...params });
      url = `${API_URL}?${queryParams}`;
    } else {
      options.method = 'POST';
      options.body = JSON.stringify({ action, ...params });
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'API request failed');
    }

    return result.data as T;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<User> {
  return apiCall<User>('currentUser', {}, 'GET');
}

export async function getCabins(): Promise<Cabin[]> {
  return apiCall<Cabin[]>('cabins', {}, 'GET');
}

export async function getBookings(date: string): Promise<Booking[]> {
  return apiCall<Booking[]>('bookings', { date }, 'GET');
}

export async function getCabinAvailability(
  date: string
): Promise<CabinAvailability[]> {
  return apiCall<CabinAvailability[]>('availability', { date }, 'GET');
}

export async function getMyBookings(): Promise<Booking[]> {
  return apiCall<Booking[]>('myBookings', {}, 'GET');
}

export async function createLock(
  request: CreateLockRequest
): Promise<CreateLockResponse> {
  return apiCall<CreateLockResponse>('createLock', request, 'POST');
}

export async function refreshLock(lockId: string): Promise<{ expiresAt: string }> {
  return apiCall<{ expiresAt: string }>('refreshLock', { lockId }, 'POST');
}

export async function confirmBooking(
  request: ConfirmBookingRequest
): Promise<Booking> {
  return apiCall<Booking>('confirmBooking', request, 'POST');
}

export async function cancelLock(lockId: string): Promise<void> {
  return apiCall<void>('cancelLock', { lockId }, 'POST');
}

export async function cancelBooking(bookingId: string): Promise<void> {
  return apiCall<void>('cancelBooking', { bookingId }, 'POST');
}

export async function getSettings(): Promise<Settings> {
  return apiCall<Settings>('settings', {}, 'GET');
}

// Admin APIs
export async function getAllBookings(filters?: {
  date?: string;
  cabinId?: string;
  userEmail?: string;
  status?: string;
}): Promise<Booking[]> {
  return apiCall<Booking[]>('allBookings', filters, 'GET');
}

export async function createCabin(cabin: Omit<Cabin, 'cabinId' | 'createdAt'>): Promise<Cabin> {
  return apiCall<Cabin>('createCabin', cabin, 'POST');
}

export async function updateCabin(cabin: Cabin): Promise<Cabin> {
  return apiCall<Cabin>('updateCabin', cabin, 'POST');
}

export async function updateCabinStatus(
  cabinId: string,
  status: 'ACTIVE' | 'INACTIVE'
): Promise<void> {
  return apiCall<void>('updateCabinStatus', { cabinId, status }, 'POST');
}

export async function getAllUsers(): Promise<User[]> {
  return apiCall<User[]>('allUsers', {}, 'GET');
}

export async function createUser(user: Omit<User, 'createdAt'>): Promise<User> {
  return apiCall<User>('createUser', user, 'POST');
}

export async function updateUser(user: User): Promise<User> {
  return apiCall<User>('updateUser', user, 'POST');
}

export async function updateUserStatus(
  email: string,
  active: boolean
): Promise<void> {
  return apiCall<void>('updateUserStatus', { email, active }, 'POST');
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  return apiCall<Settings>('updateSettings', settings, 'POST');
}

export async function getActiveLocks(): Promise<number> {
  return apiCall<number>('activeLocks', {}, 'GET');
}

export async function getTodayStats(): Promise<{
  totalCabins: number;
  availableToday: number;
  todayBookings: number;
  activeLocks: number;
}> {
  return apiCall('todayStats', {}, 'GET');
}
