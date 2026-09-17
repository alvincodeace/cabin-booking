import { useEffect, useMemo, useState } from 'react';
import type { Cabin, User } from '../types';
import { confirmBooking, createLock, cancelLock, getCompanyUsers } from '../api/appsScript';
import { LockCountdown } from './LockCountdown';

interface BookingModalProps {
  cabin: Cabin;
  date: string;
  startTime: string;
  endTime: string;
  organizerEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({
  cabin,
  date,
  startTime,
  endTime,
  organizerEmail,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const [step, setStep] = useState<'details' | 'locked'>('details');
  const [purpose, setPurpose] = useState('');
  const [lockId, setLockId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Pick<User, 'email' | 'name' | 'department'>[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    getCompanyUsers()
      .then((users) => {
        setMembers(users.filter((member) => member.email !== organizerEmail));
      })
      .catch(() => {
        setMembers([]);
      });
  }, [organizerEmail]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (query.length < 1) {
      return [];
    }
    return members
      .filter(
        (member) =>
          member.name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          member.department.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [members, memberSearch]);

  const toggleMember = (email: string) => {
    setSelectedEmails((current) =>
      current.includes(email) ? current.filter((item) => item !== email) : [...current, email]
    );
  };

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to lock the cabin. Please try again.');
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
        attendeeEmails: selectedEmails,
      });

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking. Please try again.');
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
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const overCapacity = selectedEmails.length + 1 > cabin.capacity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-[2px]">
      <div className="card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">New booking</p>
            <h2 className="mt-1 text-lg font-semibold text-stone-900">
              {cabin.cabinName}
            </h2>
          </div>
          <button
            onClick={handleCancel}
            className="btn-ghost h-9 w-9 text-stone-400"
            disabled={isLoading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 'details' ? (
          <>
            <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700 mb-5">
              <div className="font-medium">{formatDate(date)}</div>
              <div className="mt-0.5 text-stone-500">
                {startTime}–{endTime} · {cabin.location} · {cabin.capacity} people
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Purpose
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Team standup, client call…"
                  className="input min-h-[88px]"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Add members
                </label>
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className="input mb-2"
                  disabled={isLoading}
                />
                {selectedEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedEmails.map((email) => {
                      const member = members.find((item) => item.email === email);
                      return (
                        <button
                          key={email}
                          type="button"
                          onClick={() => toggleMember(email)}
                          className="px-2.5 py-1 text-xs bg-teal-50 text-teal-900 rounded-full"
                        >
                          {member?.name || email} ×
                        </button>
                      );
                    })}
                  </div>
                )}
                {memberSearch.trim() ? (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-100">
                    {filteredMembers.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-stone-500">
                        No matching members
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <label
                          key={member.email}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmails.includes(member.email)}
                            onChange={() => toggleMember(member.email)}
                            disabled={isLoading}
                            className="rounded border-stone-300 text-teal-800 focus:ring-teal-800"
                          />
                          <span>
                            <span className="block text-sm text-stone-900">{member.name}</span>
                            <span className="block text-xs text-stone-500">
                              {member.email}
                              {member.department ? ` · ${member.department}` : ''}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">
                    Search by name or email to add people
                  </p>
                )}
                {overCapacity && (
                  <p className="mt-2 text-xs text-amber-700">
                    More people than this cabin holds ({cabin.capacity}).
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleCancel} disabled={isLoading} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={isLoading || !purpose.trim()}
                className="btn-primary flex-1"
              >
                {isLoading ? 'Holding slot…' : 'Continue'}
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
