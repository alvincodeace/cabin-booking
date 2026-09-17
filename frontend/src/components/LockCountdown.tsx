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
    <div className="rounded-2xl bg-amber-50 px-5 py-6">
      <div className="text-center mb-5">
        <p className="text-sm font-medium text-stone-500">Slot held for you</p>
        <div className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-stone-900">
          {formattedTime}
        </div>
        <p className="mt-1 text-sm text-stone-500">Confirm before this runs out</p>
      </div>
      <div className="flex gap-3">
        <button onClick={handleCancel} disabled={isConfirming} className="btn-secondary flex-1">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={isConfirming} className="btn-primary flex-1">
          {isConfirming ? 'Confirming…' : 'Confirm booking'}
        </button>
      </div>
    </div>
  );
}
