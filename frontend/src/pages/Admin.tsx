import { useState, useEffect } from 'react';
import type { User, Booking, Cabin } from '../types';
import {
  getTodayStats,
  getAllBookings,
  getAllUsers,
  getCabins,
  cancelBooking,
  createCabin,
  updateCabin,
  deleteCabin,
  updateUserStatus,
  getSettings,
  updateSettings,
  createUser,
} from '../api/appsScript';
import { BookingList } from '../components/BookingList';

interface AdminProps {
  user: User;
}

type Tab = 'overview' | 'bookings' | 'cabins' | 'users' | 'settings';

export function Admin({ user }: AdminProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({
    totalCabins: 0,
    availableToday: 0,
    todayBookings: 0,
    activeLocks: 0,
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettingsState] = useState({
    lockDurationMinutes: 5,
    maxBookingDurationMinutes: 60,
    advanceBookingDays: 30,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    department: '',
    employeeId: '',
    role: 'EMPLOYEE' as User['role'],
  });
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [cabinForm, setCabinForm] = useState({
    cabinId: '',
    cabinName: '',
    location: '',
    capacity: 4,
    description: '',
    status: 'ACTIVE' as Cabin['status'],
  });
  const [cabinFormError, setCabinFormError] = useState<string | null>(null);
  const [isSavingCabin, setIsSavingCabin] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'overview') {
        const statsData = await getTodayStats();
        setStats(statsData);
      } else if (activeTab === 'bookings') {
        const bookingsData = await getAllBookings();
        setBookings(
          bookingsData.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.startTime.localeCompare(a.startTime);
          })
        );
      } else if (activeTab === 'cabins') {
        const cabinsData = await getCabins();
        setCabins(cabinsData);
      } else if (activeTab === 'users') {
        const usersData = await getAllUsers();
        setUsers(usersData);
      } else if (activeTab === 'settings') {
        const settingsData = await getSettings();
        setSettingsState(settingsData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await cancelBooking(bookingId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  const resetCabinForm = () => {
    setCabinForm({
      cabinId: '',
      cabinName: '',
      location: '',
      capacity: 4,
      description: '',
      status: 'ACTIVE',
    });
    setCabinFormError(null);
  };

  const handleSaveCabin = async () => {
    setCabinFormError(null);
    if (!cabinForm.cabinName.trim()) {
      setCabinFormError('Cabin name is required');
      return;
    }
    setIsSavingCabin(true);
    try {
      if (cabinForm.cabinId) {
        await updateCabin({
          cabinId: cabinForm.cabinId,
          cabinName: cabinForm.cabinName.trim(),
          location: cabinForm.location.trim(),
          capacity: Number(cabinForm.capacity) || 4,
          description: cabinForm.description.trim(),
          status: cabinForm.status,
          createdAt: '',
        });
      } else {
        await createCabin({
          cabinName: cabinForm.cabinName.trim(),
          location: cabinForm.location.trim(),
          capacity: Number(cabinForm.capacity) || 4,
          description: cabinForm.description.trim(),
          status: cabinForm.status,
        });
      }
      resetCabinForm();
      loadData();
    } catch (err: unknown) {
      setCabinFormError(err instanceof Error ? err.message : 'Failed to save cabin');
    } finally {
      setIsSavingCabin(false);
    }
  };

  const handleEditCabin = (cabin: Cabin) => {
    setCabinForm({
      cabinId: cabin.cabinId,
      cabinName: cabin.cabinName,
      location: cabin.location,
      capacity: cabin.capacity,
      description: cabin.description,
      status: cabin.status,
    });
    setCabinFormError(null);
  };

  const handleDeleteCabin = async (cabin: Cabin) => {
    if (
      !confirm(
        `Delete ${cabin.cabinName}? Upcoming bookings must be cancelled first. Past bookings for this cabin will be removed.`
      )
    ) {
      return;
    }
    try {
      await deleteCabin(cabin.cabinId);
      if (cabinForm.cabinId === cabin.cabinId) {
        resetCabinForm();
      }
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete cabin');
    }
  };

  const handleToggleUserStatus = async (email: string, currentStatus: boolean) => {
    try {
      await updateUserStatus(email, !currentStatus);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleCreateUser = async () => {
    setUserFormError(null);
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setUserFormError('Name and email are required');
      return;
    }
    setIsSavingUser(true);
    try {
      await createUser({
        email: newUser.email.trim().toLowerCase(),
        name: newUser.name.trim(),
        department: newUser.department.trim(),
        employeeId: newUser.employeeId.trim(),
        role: newUser.role,
        active: true,
      });
      setNewUser({
        name: '',
        email: '',
        department: '',
        employeeId: '',
        role: 'EMPLOYEE',
      });
      loadData();
    } catch (err: unknown) {
      setUserFormError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settings);
      alert('Settings updated successfully');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'cabins', label: 'Cabins' },
    { id: 'users', label: 'Users' },
    { id: 'settings', label: 'Settings' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage cabins, bookings, and users
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Cabins
                </h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalCabins}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500">
                  Available Today
                </h3>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {stats.availableToday}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500">
                  Today's Bookings
                </h3>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {stats.todayBookings}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500">
                  Active Locks
                </h3>
                <p className="mt-2 text-3xl font-bold text-yellow-600">
                  {stats.activeLocks}
                </p>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  All Bookings
                </h2>
              </div>
              <BookingList
                bookings={bookings}
                user={user}
                onCancel={handleCancelBooking}
                showActions={true}
              />
            </div>
          )}

          {/* Cabins Tab */}
          {activeTab === 'cabins' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {cabinForm.cabinId ? 'Edit cabin' : 'Add cabin'}
                </h2>
                <div className="mt-4 grid gap-3 md:grid-cols-6">
                  <input
                    value={cabinForm.cabinName}
                    onChange={(e) => setCabinForm({ ...cabinForm, cabinName: e.target.value })}
                    placeholder="Name"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    value={cabinForm.location}
                    onChange={(e) => setCabinForm({ ...cabinForm, location: e.target.value })}
                    placeholder="Location"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    min={1}
                    value={cabinForm.capacity}
                    onChange={(e) =>
                      setCabinForm({ ...cabinForm, capacity: Number(e.target.value) || 1 })
                    }
                    placeholder="Capacity"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    value={cabinForm.description}
                    onChange={(e) => setCabinForm({ ...cabinForm, description: e.target.value })}
                    placeholder="Description"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={cabinForm.status}
                    onChange={(e) =>
                      setCabinForm({ ...cabinForm, status: e.target.value as Cabin['status'] })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCabin}
                      disabled={isSavingCabin}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSavingCabin ? 'Saving...' : cabinForm.cabinId ? 'Update' : 'Add'}
                    </button>
                    {cabinForm.cabinId && (
                      <button
                        onClick={resetCabinForm}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                {cabinFormError && (
                  <p className="mt-2 text-sm text-red-600">{cabinFormError}</p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cabins.map((cabin) => (
                      <tr key={cabin.cabinId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {cabin.cabinName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cabin.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cabin.capacity}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {cabin.description || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              cabin.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {cabin.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEditCabin(cabin)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCabin(cabin)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Users</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Add employees here so they can be invited to meetings even if they never log in.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Name"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="nina.v@example.com"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    placeholder="Department"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value as User['role'] })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="TEAM_LEAD">TEAM_LEAD</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button
                    onClick={handleCreateUser}
                    disabled={isSavingUser}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingUser ? 'Adding...' : 'Add user'}
                  </button>
                </div>
                {userFormError && (
                  <p className="mt-2 text-sm text-red-600">{userFormError}</p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.email}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {u.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              u.active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {u.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {u.email !== user.email && (
                            <button
                              onClick={() =>
                                handleToggleUserStatus(u.email, u.active)
                              }
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {u.active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                System Settings
              </h2>
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lock Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.lockDurationMinutes}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        lockDurationMinutes: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How long a cabin is reserved during booking process
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Booking Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.maxBookingDurationMinutes}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        maxBookingDurationMinutes: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum duration for a single booking
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advance Booking Days
                  </label>
                  <input
                    type="number"
                    value={settings.advanceBookingDays}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        advanceBookingDays: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How many days in advance bookings can be made
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
