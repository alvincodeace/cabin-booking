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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent"
            disabled={selectedDate <= todayInKolkata()}
            aria-label="Previous day"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              {formatDisplayDate(selectedDate)}
            </h2>
            {isToday && (
              <p className="text-sm text-blue-600 font-medium">Today</p>
            )}
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600">
              <span className="sr-only">Choose date</span>
              <input
                type="date"
                value={selectedDate}
                min={todayInKolkata()}
                max={maxDate}
                onChange={(event) => handleCalendarChange(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </label>
          </div>

          <button
            onClick={() => handleDateChange(1)}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent"
            disabled={selectedDate >= maxDate}
            aria-label="Next day"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setSelectedDate(todayInKolkata())}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Today
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => loadAvailability()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading availability...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => loadAvailability()}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      ) : availability.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No cabins available</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          endTime={(() => {
            const [hours, minutes] = selectedSlot.slot.time.split(':');
            const endHour = (parseInt(hours) + 1).toString().padStart(2, '0');
            return `${endHour}:${minutes}`;
          })()}
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
          organizerEmail={user.email}
        />
      )}
    </div>
  );
}
