import type { Cabin, TimeSlot, User } from '../types';

interface CabinCardProps {
  cabin: Cabin;
  slots: TimeSlot[];
  user: User;
  onSlotClick: (cabin: Cabin, slot: TimeSlot) => void;
}

export function CabinCard({ cabin, slots, user: _user, onSlotClick }: CabinCardProps) {
  // All authenticated users can book (user parameter kept for interface compatibility)
  const canBook = true;

  const getSlotClassName = (slot: TimeSlot) => {
    const baseClasses = 'px-3 py-2 rounded-lg text-sm font-medium transition-colors';

    if (cabin.status === 'INACTIVE') {
      return `${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed`;
    }

    switch (slot.status) {
      case 'AVAILABLE':
        return canBook
          ? `${baseClasses} bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer`
          : `${baseClasses} bg-green-50 text-green-700`;
      case 'BOOKED':
        return `${baseClasses} bg-red-50 text-red-700`;
      case 'LOCKED':
        if (slot.isOwnLock) {
          return `${baseClasses} bg-yellow-50 text-yellow-700 border-2 border-yellow-400`;
        }
        return `${baseClasses} bg-orange-50 text-orange-700`;
      case 'DISABLED':
        return `${baseClasses} bg-gray-100 text-gray-400`;
      default:
        return baseClasses;
    }
  };

  const getSlotLabel = (slot: TimeSlot) => {
    if (cabin.status === 'INACTIVE') {
      return `${slot.time} - DISABLED`;
    }

    switch (slot.status) {
      case 'AVAILABLE':
        return `${slot.time} - AVAILABLE`;
      case 'BOOKED':
        if (slot.booking) {
          return `${slot.time} - BOOKED - ${slot.booking.bookedBy}`;
        }
        return `${slot.time} - BOOKED`;
      case 'LOCKED':
        if (slot.isOwnLock) {
          return `${slot.time} - LOCKED BY YOU`;
        }
        return `${slot.time} - TEMPORARILY LOCKED`;
      case 'DISABLED':
        return `${slot.time} - DISABLED`;
      default:
        return slot.time;
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (cabin.status === 'INACTIVE') return;
    if (!canBook) return;
    if (slot.status !== 'AVAILABLE') return;

    onSlotClick(cabin, slot);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {cabin.cabinName}
            </h3>
            <p className="text-sm text-gray-600">{cabin.location}</p>
            <p className="text-sm text-gray-500">Capacity: {cabin.capacity}</p>
          </div>
          {cabin.status === 'INACTIVE' && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
              DISABLED
            </span>
          )}
        </div>
        {cabin.description && (
          <p className="mt-2 text-sm text-gray-600">{cabin.description}</p>
        )}
      </div>

      <div className="space-y-2">
        {slots.map((slot, index) => (
          <button
            key={index}
            onClick={() => handleSlotClick(slot)}
            className={getSlotClassName(slot)}
            disabled={
              cabin.status === 'INACTIVE' ||
              !canBook ||
              slot.status !== 'AVAILABLE'
            }
          >
            <div className="flex items-center justify-between">
              <span>{getSlotLabel(slot)}</span>
              {slot.status === 'LOCKED' && !slot.isOwnLock && slot.lock && (
                <span className="text-xs">
                  {new Date(slot.lock.expiresAt) > new Date()
                    ? `Expires in ${Math.ceil(
                        (new Date(slot.lock.expiresAt).getTime() -
                          Date.now()) /
                          60000
                      )}m`
                    : 'Expired'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* All users can book - message removed */}
    </div>
  );
}
