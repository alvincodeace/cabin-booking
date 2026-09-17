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
    if (!query) {
      return members;
    }
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.department.toLowerCase().includes(query)
    );
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
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const overCapacity = selectedEmails.length + 1 > cabin.capacity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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
                <div className="text-sm text-gray-500">
                  {cabin.location} · Capacity {cabin.capacity}
                </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add members
                </label>
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                        >
                          {member?.name || email} ×
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredMembers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No matching members. Ask an admin to add people in Admin → Users.
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <label
                        key={member.email}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(member.email)}
                          onChange={() => toggleMember(member.email)}
                          disabled={isLoading}
                        />
                        <span>
                          <span className="block text-sm text-gray-900">{member.name}</span>
                          <span className="block text-xs text-gray-500">
                            {member.email}
                            {member.department ? ` · ${member.department}` : ''}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {overCapacity && (
                  <p className="mt-2 text-xs text-amber-700">
                    You selected more people than this cabin’s capacity ({cabin.capacity}).
                  </p>
                )}
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
