import { useEffect, useState } from 'react';
import type { Cabin, TimeSlot, User } from '../types';

interface CabinCardProps {
  cabin: Cabin;
  slots: TimeSlot[];
  user: User;
  maxDurationMinutes: number;
  onBookRange: (cabin: Cabin, startTime: string, endTime: string) => void;
}

function timeToMinutes(timeStr: string) {
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return hours * 60 + minutes;
}

function slotEnd(slot: TimeSlot) {
  if (slot.endTime) return slot.endTime;
  return `${String(Math.floor((timeToMinutes(slot.time) + 30) / 60)).padStart(2, '0')}:${String((timeToMinutes(slot.time) + 30) % 60).padStart(2, '0')}`;
}

export function CabinCard({ cabin, slots, user: _user, maxDurationMinutes, onBookRange }: CabinCardProps) {
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  useEffect(() => {
    setRange(null);
    setLimitMessage(null);
  }, [cabin.cabinId]);

  const slotLabel = (slot: TimeSlot) => `${slot.time}–${slotEnd(slot)}`;

  const isSelected = (index: number) =>
    Boolean(range && index >= range.from && index <= range.to);

  const getSlotClassName = (slot: TimeSlot, index: number) => {
    const base = 'min-h-10 px-1 py-2 rounded-xl text-[11px] sm:text-xs font-medium leading-tight transition-colors';
    if (cabin.status === 'INACTIVE') {
      return `${base} bg-stone-100 text-stone-400 cursor-not-allowed`;
    }
    if (isSelected(index)) {
      return `${base} bg-teal-800 text-white cursor-pointer`;
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
    const label = slotLabel(slot);
    if (slot.status === 'BOOKED' && slot.booking) {
      return `${label} · booked by ${slot.booking.bookedBy}`;
    }
    if (slot.status === 'LOCKED') {
      return slot.isOwnLock ? `${label} · held by you` : `${label} · held by someone else`;
    }
    return slot.status === 'AVAILABLE' ? `${label} · click to select` : label;
  };

  const canSelectRange = (from: number, to: number) => {
    const slice = slots.slice(from, to + 1);
    if (!slice.length || slice.some((slot) => slot.status !== 'AVAILABLE')) {
      return false;
    }
    const duration = timeToMinutes(slotEnd(slots[to])) - timeToMinutes(slots[from].time);
    return duration > 0 && duration <= maxDurationMinutes;
  };

  const handleSlotClick = (index: number) => {
    const slot = slots[index];
    if (cabin.status === 'INACTIVE' || slot.status !== 'AVAILABLE') return;
    setLimitMessage(null);

    if (range && range.from === index && range.to === index) {
      setRange(null);
      return;
    }

    if (!range) {
      setRange({ from: index, to: index });
      return;
    }

    const from = Math.min(range.from, index);
    const to = Math.max(range.to, index);
    if (canSelectRange(from, to)) {
      setRange({ from, to });
      return;
    }

    const duration = timeToMinutes(slotEnd(slots[to])) - timeToMinutes(slots[from].time);
    if (duration > maxDurationMinutes) {
      setLimitMessage(`Longest booking is ${maxDurationMinutes} minutes`);
      setRange({ from: index, to: index });
      return;
    }

    setRange({ from: index, to: index });
  };

  const availableCount = slots.filter((slot) => slot.status === 'AVAILABLE' && cabin.status === 'ACTIVE').length;
  const selectedStart = range ? slots[range.from] : null;
  const selectedEnd = range ? slots[range.to] : null;

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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {slots.map((slot, index) => (
          <button
            key={`${slot.time}-${index}`}
            type="button"
            title={slotTitle(slot)}
            onClick={() => handleSlotClick(index)}
            className={getSlotClassName(slot, index)}
            disabled={cabin.status === 'INACTIVE' || slot.status !== 'AVAILABLE'}
          >
            {slotLabel(slot)}
          </button>
        ))}
      </div>
      {limitMessage && (
        <p className="mt-3 text-xs text-amber-700">{limitMessage}</p>
      )}
      {selectedStart && selectedEnd && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => onBookRange(cabin, selectedStart.time, slotEnd(selectedEnd))}
          >
            Book {selectedStart.time}–{slotEnd(selectedEnd)}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setRange(null)}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
