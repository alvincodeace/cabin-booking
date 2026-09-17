import { useState } from 'react';
import type { Cabin } from '../types';
import { createLock, confirmBooking, cancelLock } from '../api/appsScript';
import { LockCountdown } from './LockCountdown';

interface BookingModalProps {
  cabin: Cabin;
  date: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({
  cabin,
  date,
  startTime,
  endTime,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const [step, setStep] = useState<'details' | 'locked'>('details');
  const [purpose, setPurpose] = useState('');
  const [lockId, setLockId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!purpose.trim()) {
      setError('Please enter a purpose for the booking');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await createLock({
        cabinId: cabin.cabinId,
        date,
        startTime,
        endTime,
      });

      setLockId(response.lockId);
      setExpiresAt(response.expiresAt);
      setStep('locked');
    } catch (err: any) {
      setError(err.message || 'Failed to lock the cabin. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!lockId) return;

    setIsLoading(true);
    setError(null);

    try {
      await confirmBooking({
        lockId,
        purpose,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockExpire = () => {
    setError('Your reservation has expired. Please try again.');
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleCancel = async () => {
    if (lockId) {
      try {
        await cancelLock(lockId);
      } catch (err) {
        console.error('Failed to cancel lock:', err);
      }
    }
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'details' ? 'Book Cabin' : cabin.cabinName}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 'details' ? (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cabin
                </label>
                <div className="text-gray-900">{cabin.cabinName}</div>
                <div className="text-sm text-gray-500">{cabin.location}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <div className="text-gray-900">{formatDate(date)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start
                  </label>
                  <div className="text-gray-900">{startTime}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End
                  </label>
                  <div className="text-gray-900">{endTime}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Team meeting, Client discussion"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={isLoading || !purpose.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </>
        ) : (
          lockId &&
          expiresAt && (
            <LockCountdown
              lockId={lockId}
              expiresAt={expiresAt}
              onExpire={handleLockExpire}
              onCancel={handleCancel}
              onConfirm={handleConfirm}
              isConfirming={isLoading}
            />
          )
        )}
      </div>
    </div>
  );
}
