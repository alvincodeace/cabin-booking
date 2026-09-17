import { useState, useEffect } from 'react';
import type { User, CabinAvailability, Cabin, TimeSlot } from '../types';
import { getCabinAvailability } from '../api/appsScript';
import { CabinCard } from '../components/CabinCard';
import { BookingModal } from '../components/BookingModal';

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availability, setAvailability] = useState<CabinAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    cabin: Cabin;
    slot: TimeSlot;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadAvailability();
    
    // Auto-refresh every 60 seconds
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
    } catch (err: any) {
      setError(err.message || 'Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSlotClick = (cabin: Cabin, slot: TimeSlot) => {
    setSelectedSlot({ cabin, slot });
  };

  const handleBookingSuccess = () => {
    setSelectedSlot(null);
    setRefreshKey((prev) => prev + 1);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => loadAvailability()}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Date Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            disabled={
              selectedDate <= new Date().toISOString().split('T')[0]
            }
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
              {formatDate(selectedDate)}
            </h2>
            {isToday(selectedDate) && (
              <p className="text-sm text-blue-600 font-medium">Today</p>
            )}
          </div>

          <button
            onClick={() => handleDateChange(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
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
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
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

      {/* Cabins */}
      {availability.length === 0 ? (
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

      {/* Booking Modal */}
      {selectedSlot && (
        <BookingModal
          cabin={selectedSlot.cabin}
          date={selectedDate}
          startTime={selectedSlot.slot.time}
          endTime={
            // Calculate end time (1 hour later)
            (() => {
              const [hours, minutes] = selectedSlot.slot.time.split(':');
              const endHour = (parseInt(hours) + 1).toString().padStart(2, '0');
              return `${endHour}:${minutes}`;
            })()
          }
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
