import type { Booking, User } from '../types';

interface BookingListProps {
  bookings: Booking[];
  user: User;
  onCancel?: (bookingId: string) => void;
  showActions?: boolean;
}

function formatDate(dateStr: string) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BookingList({
  bookings,
  user,
  onCancel,
  showActions = true,
}: BookingListProps) {
  const canCancelBooking = (booking: Booking) => {
    if (booking.status !== 'BOOKED') return false;
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}:00+05:30`);
    if (bookingDateTime < new Date()) return false;
    if (user.role === 'ADMIN') return true;
    if (booking.bookedByEmail === user.email) return true;
    return false;
  };

  const statusClass = (status: string) => {
    if (status === 'BOOKED') return 'bg-emerald-50 text-emerald-800';
    if (status === 'CANCELLED') return 'bg-red-50 text-red-700';
    return 'bg-stone-100 text-stone-600';
  };

  if (bookings.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-500">No bookings yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-100">
      {bookings.map((booking) => (
        <div key={booking.bookingId} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-stone-900">{booking.cabinName}</p>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClass(booking.status)}`}>
                {booking.status === 'BOOKED' ? 'Booked' : booking.status === 'CANCELLED' ? 'Cancelled' : booking.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {formatDate(booking.date)} · {booking.startTime}–{booking.endTime}
              {booking.bookedBy ? ` · ${booking.bookedBy}` : ''}
            </p>
            {booking.purpose && (
              <p className="mt-1 text-sm text-stone-600 truncate">{booking.purpose}</p>
            )}
            {booking.attendees && booking.attendees.length > 0 && (
              <p className="mt-1 text-xs text-stone-400">
                With {booking.attendees.map((attendee) => attendee.name).join(', ')}
              </p>
            )}
          </div>
          {showActions && canCancelBooking(booking) && onCancel && (
            <button
              onClick={() => onCancel(booking.bookingId)}
              className="text-sm text-red-700 hover:text-red-900 font-medium self-start sm:self-center"
            >
              Cancel
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
