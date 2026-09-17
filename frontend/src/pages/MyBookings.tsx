import { useState, useEffect } from 'react';
import type { User, Booking } from '../types';
import { getMyBookings, cancelBooking } from '../api/appsScript';
import { BookingList, downloadBookingsCsv } from '../components/BookingList';

interface MyBookingsProps {
  user: User;
}

export function MyBookings({ user }: MyBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getMyBookings();
      const list = Array.isArray(data) ? data : [];
      const sorted = [...list].sort((a, b) => {
        const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
        if (dateCompare !== 0) return dateCompare;
        return String(b.startTime || '').localeCompare(String(a.startTime || ''));
      });
      setBookings(sorted);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await cancelBooking(bookingId);
      // Refresh bookings
      loadBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="spinner mx-auto" />
          <p className="mt-4 text-sm text-stone-500">Loading bookings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">My bookings</h1>
          <p className="mt-1 text-sm text-stone-500">
            Meetings you booked and ones you were added to
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadBookingsCsv(bookings, 'my-bookings')}
          disabled={bookings.length === 0}
          className="btn-secondary text-sm"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 card p-4">
          <p className="text-red-700">{error}</p>
          <button onClick={loadBookings} className="mt-2 text-sm text-teal-800 font-medium">
            Try again
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <BookingList
          bookings={bookings}
          user={user}
          onCancel={handleCancel}
          showActions={true}
        />
      </div>
    </div>
  );
}
