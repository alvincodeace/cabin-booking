import { useState, useEffect } from 'react';
import type { User, CabinAvailability, Cabin, TimeSlot } from '../types';
import { getCabinAvailability, getSettings } from '../api/appsScript';
import { CabinCard } from '../components/CabinCard';
import { BookingModal } from '../components/BookingModal';

interface DashboardProps {
  user: User;
}

function todayInKolkata() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return formatYmd(new Date(year, month - 1, day + days));
}

function formatDisplayDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function Dashboard({ user }: DashboardProps) {
  const today = todayInKolkata();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [maxDate, setMaxDate] = useState<string>(addDays(today, 30));
  const [availability, setAvailability] = useState<CabinAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    cabin: Cabin;
    slot: TimeSlot;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        setMaxDate(addDays(todayInKolkata(), settings.advanceBookingDays || 30));
      } catch {
        setMaxDate(addDays(todayInKolkata(), 30));
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    loadAvailability();

    const interval = setInterval(() => {
      loadAvailability(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [selectedDate, refreshKey]);

  const loadAvailability = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getCabinAvailability(selectedDate);
      setAvailability(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (days: number) => {
    const nextDate = addDays(selectedDate, days);
    if (nextDate < todayInKolkata() || nextDate > maxDate) {
      return;
    }
    setSelectedDate(nextDate);
  };

  const handleCalendarChange = (value: string) => {
    if (!value) {
      return;
    }
    if (value < todayInKolkata() || value > maxDate) {
      return;
    }
    setSelectedDate(value);
  };

  const handleSlotClick = (cabin: Cabin, slot: TimeSlot) => {
    setSelectedSlot({ cabin, slot });
  };

  const handleBookingSuccess = () => {
    setSelectedSlot(null);
    setRefreshKey((prev) => prev + 1);
  };

  const isToday = selectedDate === todayInKolkata();

  return (
    <div className="page-wrap">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-stone-500">Book a cabin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
            {isToday ? 'Today' : formatDisplayDate(selectedDate)}
          </h1>
        </div>
        <div className="card flex items-center gap-2 px-2 py-2">
          <button
            onClick={() => handleDateChange(-1)}
            className="btn-ghost h-10 w-10"
            disabled={selectedDate <= todayInKolkata()}
            aria-label="Previous day"
          >
            ‹
          </button>
          <input
            type="date"
            value={selectedDate}
            min={todayInKolkata()}
            max={maxDate}
            onChange={(event) => handleCalendarChange(event.target.value)}
            className="input w-auto min-w-[11rem] py-2"
          />
          <button
            onClick={() => handleDateChange(1)}
            className="btn-ghost h-10 w-10"
            disabled={selectedDate >= maxDate}
            aria-label="Next day"
          >
            ›
          </button>
          <button onClick={() => setSelectedDate(todayInKolkata())} className="btn-ghost">
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 mb-4">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" /> Booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Held
        </span>
        <button onClick={() => loadAvailability()} className="ml-auto btn-ghost text-xs">
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[320px]">
          <div className="text-center">
            <div className="spinner mx-auto" />
            <p className="mt-4 text-sm text-stone-500">Loading cabins…</p>
          </div>
        </div>
      ) : error ? (
        <div className="card p-5">
          <p className="text-red-700">{error}</p>
          <button onClick={() => loadAvailability()} className="mt-3 text-sm text-teal-800 font-medium">
            Try again
          </button>
        </div>
      ) : availability.length === 0 ? (
        <div className="card p-12 text-center text-stone-500">No cabins available</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availability.map((item) => (
            <CabinCard
              key={item.cabin.cabinId}
              cabin={item.cabin}
              slots={item.slots}
              user={user}
              onSlotClick={handleSlotClick}
            />
          ))}
        </div>
      )}

      {selectedSlot && (
        <BookingModal
          cabin={selectedSlot.cabin}
          date={selectedDate}
          startTime={selectedSlot.slot.time}
          endTime={
            selectedSlot.slot.endTime ||
            (() => {
              const [hours, minutes] = selectedSlot.slot.time.split(':').map(Number);
              const total = hours * 60 + minutes + 30;
              return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
            })()
          }
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
          organizerEmail={user.email}
        />
      )}
    </div>
  );
}
