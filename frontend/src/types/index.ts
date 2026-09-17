export type UserRole = 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE';

export type CabinStatus = 'ACTIVE' | 'INACTIVE';

export type BookingStatus = 'BOOKED' | 'CANCELLED' | 'COMPLETED';

export interface User {
  email: string;
  name: string;
  employeeId: string;
  department: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface Cabin {
  cabinId: string;
  cabinName: string;
  location: string;
  capacity: number;
  description: string;
  status: CabinStatus;
  createdAt: string;
}

export interface Booking {
  bookingId: string;
  cabinId: string;
  cabinName: string;
  date: string;
  startTime: string;
  endTime: string;
  bookedBy: string;
  bookedByEmail: string;
  department: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  attendees?: BookingAttendee[];
}

export interface BookingAttendee {
  email: string;
  name: string;
}

export interface AppNotification {
  id: string;
  bookingId?: string;
  type: 'BOOKING_INVITE' | 'BOOKING_CANCELLED';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface BookingLock {
  lockId: string;
  cabinId: string;
  date: string;
  startTime: string;
  endTime: string;
  userEmail: string;
  createdAt: string;
  expiresAt: string;
}

export interface Settings {
  lockDurationMinutes: number;
  maxBookingDurationMinutes: number;
  advanceBookingDays: number;
}

export interface TimeSlot {
  time: string;
  endTime?: string;
  status: 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'DISABLED';
  booking?: Booking;
  lock?: BookingLock;
  isOwnLock?: boolean;
}

export interface CabinAvailability {
  cabin: Cabin;
  slots: TimeSlot[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateLockRequest {
  cabinId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface CreateLockResponse {
  lockId: string;
  expiresAt: string;
}

export interface ConfirmBookingRequest {
  lockId: string;
  purpose: string;
  attendeeEmails?: string[];
}

export interface BookingRequest {
  cabinId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}
