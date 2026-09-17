import type { Cabin, TimeSlot, User } from '../types';

interface CabinCardProps {
  cabin: Cabin;
  slots: TimeSlot[];
  user: User;
  onSlotClick: (cabin: Cabin, slot: TimeSlot) => void;
}

export function CabinCard({ cabin, slots, user: _user, onSlotClick }: CabinCardProps) {
  const getSlotClassName = (slot: TimeSlot) => {
    const base = 'h-10 rounded-xl text-sm font-medium transition-colors';
    if (cabin.status === 'INACTIVE') {
      return `${base} bg-stone-100 text-stone-400 cursor-not-allowed`;
    }
    switch (slot.status) {
      case 'AVAILABLE':
        return `${base} bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer`;
      case 'BOOKED':
        return `${base} bg-stone-100 text-stone-400 cursor-not-allowed`;
      case 'LOCKED':
        return slot.isOwnLock
          ? `${base} bg-amber-100 text-amber-800 ring-1 ring-amber-300`
          : `${base} bg-amber-50 text-amber-700 cursor-not-allowed`;
      default:
        return `${base} bg-stone-100 text-stone-400`;
    }
  };

  const slotTitle = (slot: TimeSlot) => {
    if (slot.status === 'BOOKED' && slot.booking) {
      return `${slot.time} · booked by ${slot.booking.bookedBy}`;
    }
    if (slot.status === 'LOCKED') {
      return slot.isOwnLock ? `${slot.time} · held by you` : `${slot.time} · held by someone else`;
    }
    return slot.status === 'AVAILABLE' ? `${slot.time} · available` : slot.time;
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (cabin.status === 'INACTIVE' || slot.status !== 'AVAILABLE') return;
    onSlotClick(cabin, slot);
  };

  const availableCount = slots.filter((slot) => slot.status === 'AVAILABLE' && cabin.status === 'ACTIVE').length;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-stone-900">{cabin.cabinName}</h3>
          <p className="mt-1 text-sm text-stone-500">
            {cabin.location}
            {cabin.capacity ? ` · ${cabin.capacity} people` : ''}
          </p>
        </div>
        {cabin.status === 'INACTIVE' ? (
          <span className="text-[11px] font-medium uppercase tracking-wide text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
            Offline
          </span>
        ) : (
          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded-full">
            {availableCount} open
          </span>
        )}
      </div>
      {cabin.description && (
        <p className="mb-4 text-sm text-stone-500 leading-relaxed">{cabin.description}</p>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((slot, index) => (
          <button
            key={`${slot.time}-${index}`}
            type="button"
            title={slotTitle(slot)}
            onClick={() => handleSlotClick(slot)}
            className={getSlotClassName(slot)}
            disabled={cabin.status === 'INACTIVE' || slot.status !== 'AVAILABLE'}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  );
}
