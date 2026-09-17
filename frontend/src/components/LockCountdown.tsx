import { useBookingLock } from '../hooks/useBookingLock';

interface LockCountdownProps {
  lockId: string;
  expiresAt: string;
  onExpire: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function LockCountdown({
  lockId,
  expiresAt,
  onExpire,
  onCancel,
  onConfirm,
  isConfirming = false,
}: LockCountdownProps) {
  const { formattedTime, releaseLock } = useBookingLock({
    lockId,
    expiresAt,
    onExpire,
  });

  const handleCancel = async () => {
    await releaseLock();
    onCancel();
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Cabin Reserved for You
        </h3>
        <div className="text-3xl font-bold text-yellow-600 mb-1">
          {formattedTime}
        </div>
        <p className="text-sm text-gray-600">remaining</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          disabled={isConfirming}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isConfirming}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConfirming ? 'Confirming...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}
