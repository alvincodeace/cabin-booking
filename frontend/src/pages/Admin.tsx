import { useState, useEffect } from 'react';
import type { User, UserRole, Booking, Cabin, AuditLog } from '../types';
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
  updateUserRole,
  getSettings,
  updateSettings,
  createUser,
  createUsers,
  importSlackUsers,
  getAuditLogs,
} from '../api/appsScript';
import { BookingList, downloadBookingsCsv } from '../components/BookingList';

interface AdminProps {
  user: User;
}

type Tab = 'overview' | 'bookings' | 'cabins' | 'users' | 'activity' | 'settings';

type BulkUser = Omit<User, 'createdAt'>;

const USER_ROLES: UserRole[] = ['EMPLOYEE', 'TEAM_LEAD', 'ADMIN'];

const AUDIT_ACTION_LABEL: Record<string, string> = {
  BOOKING_CREATED: 'Booked cabin',
  BOOKING_CANCELLED: 'Cancelled booking',
  CABIN_CREATED: 'Added cabin',
  CABIN_UPDATED: 'Updated cabin',
  CABIN_DELETED: 'Deleted cabin',
  USER_CREATED: 'Added user',
  USERS_IMPORTED: 'Imported users',
  USER_ACTIVATED: 'Activated user',
  USER_DEACTIVATED: 'Deactivated user',
  USER_ROLE_CHANGED: 'Changed role',
  SETTINGS_UPDATED: 'Updated settings',
  USER_LOGIN: 'Signed in',
  USER_LOGOUT: 'Signed out',
};

function formatAuditTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function detectDelimiter(line: string): string {
  const comma = (line.match(/,/g) || []).length;
  const tab = (line.match(/\t/g) || []).length;
  const semicolon = (line.match(/;/g) || []).length;
  if (tab >= comma && tab >= semicolon && tab > 0) return '\t';
  if (semicolon > comma && semicolon > 0) return ';';
  return ',';
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function headerKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function mapHeaderIndex(headers: string[]): Record<string, number> {
  const mapped: Record<string, number> = {};
  headers.forEach((header, index) => {
    const key = headerKey(header);
    if (['email', 'workemail', 'useremail', 'mail'].includes(key)) mapped.email = index;
    else if (['name', 'fullname', 'employeename', 'displayname'].includes(key)) mapped.name = index;
    else if (['firstname', 'first'].includes(key)) mapped.firstName = index;
    else if (['lastname', 'last', 'surname'].includes(key)) mapped.lastName = index;
    else if (['department', 'dept', 'team'].includes(key)) mapped.department = index;
    else if (['role', 'userrole'].includes(key)) mapped.role = index;
    else if (['employeeid', 'empid', 'id'].includes(key)) mapped.employeeId = index;
  });
  return mapped;
}

function parseBulkUsers(text: string): { users: BulkUser[]; parseErrors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const users: BulkUser[] = [];
  const parseErrors: string[] = [];
  if (!lines.length) {
    return { users, parseErrors };
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = splitCsvLine(lines[0], delimiter);
  const firstHeaderMap = mapHeaderIndex(firstCells);
  const hasHeader = firstHeaderMap.email !== undefined || headerKey(firstCells[0]) === 'name';
  const headerMap = hasHeader
    ? firstHeaderMap
    : { name: 0, email: 1, department: 2, role: 3, employeeId: 4 };
  const dataLines = hasHeader ? lines.slice(1) : lines;

  dataLines.forEach((line, index) => {
    const cells = splitCsvLine(line, delimiter);
    const cell = (key: string) => {
      const cellIndex = headerMap[key];
      return cellIndex === undefined ? '' : String(cells[cellIndex] || '').trim();
    };
    let email = cell('email');
    if (!email && cells.length === 1 && cells[0].includes('@')) {
      email = cells[0].trim();
    }
    const firstName = cell('firstName');
    const lastName = cell('lastName');
    const combinedName = [firstName, lastName].filter(Boolean).join(' ');
    const name = cell('name') || combinedName;
    if (!email) {
      parseErrors.push(`Line ${index + 1}: email is required`);
      return;
    }
    users.push({
      email,
      name,
      department: cell('department'),
      employeeId: cell('employeeId'),
      role: (cell('role') || 'EMPLOYEE').toUpperCase() as User['role'],
      active: true,
    });
  });

  return { users, parseErrors };
}

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
  const [bulkUsersText, setBulkUsersText] = useState('');
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [isSavingBulkUsers, setIsSavingBulkUsers] = useState(false);
  const [isImportingSlack, setIsImportingSlack] = useState(false);
  const [updatingRoleEmail, setUpdatingRoleEmail] = useState<string | null>(null);
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSetupRequired, setAuditSetupRequired] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (activeTab === 'overview') {
        const statsData = await getTodayStats();
        setStats(statsData);
      } else if (activeTab === 'bookings') {
        const bookingsData = await getAllBookings();
        const list = Array.isArray(bookingsData) ? bookingsData : [];
        setBookings(
          [...list].sort((a, b) => {
            const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
            if (dateCompare !== 0) return dateCompare;
            return String(b.startTime || '').localeCompare(String(a.startTime || ''));
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
      } else if (activeTab === 'activity') {
        const result = await getAuditLogs(auditSearch);
        setAuditLogs(Array.isArray(result.logs) ? result.logs : []);
        setAuditSetupRequired(Boolean(result.setupRequired));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
      if (activeTab === 'bookings') {
        setBookings([]);
      }
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

  const handleChangeUserRole = async (target: User, role: UserRole) => {
    if (target.email === user.email || target.role === role) {
      return;
    }
    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const activeAdmins = users.filter((item) => item.role === 'ADMIN' && item.active).length;
      if (activeAdmins <= 1) {
        alert('Keep at least one admin');
        return;
      }
    }
    setUpdatingRoleEmail(target.email);
    try {
      const updated = await updateUserRole(target.email, role);
      setUsers((current) =>
        current.map((item) => (item.email === updated.email ? { ...item, role: updated.role } : item))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update user role');
      loadData();
    } finally {
      setUpdatingRoleEmail(null);
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

  const handleBulkFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      setBulkUsersText(text);
      setBulkResult(null);
      setUserFormError(null);
    } catch {
      setUserFormError('Could not read that file');
    }
  };

  const handleBulkCreateUsers = async () => {
    setUserFormError(null);
    setBulkResult(null);
    const parsed = parseBulkUsers(bulkUsersText);
    if (parsed.parseErrors.length && !parsed.users.length) {
      setUserFormError(parsed.parseErrors[0]);
      return;
    }
    if (!parsed.users.length) {
      setUserFormError('Paste a CSV or one user per line: name, email, department, role');
      return;
    }
    setIsSavingBulkUsers(true);
    try {
      const result = await createUsers(parsed.users);
      const parts = [`Added ${result.created.length}`];
      if (result.skipped.length) {
        parts.push(`skipped ${result.skipped.length} existing`);
      }
      const allErrors = [
        ...parsed.parseErrors,
        ...result.errors.map((item) => `${item.email || 'row'}: ${item.message}`),
      ];
      if (allErrors.length) {
        parts.push(`${allErrors.length} failed`);
      }
      setBulkResult(parts.join(', '));
      if (allErrors.length) {
        setUserFormError(allErrors.slice(0, 8).join(' · '));
      }
      if (result.created.length) {
        setBulkUsersText('');
        loadData();
      }
    } catch (err: unknown) {
      setUserFormError(err instanceof Error ? err.message : 'Failed to import users');
    } finally {
      setIsSavingBulkUsers(false);
    }
  };

  const handleImportFromSlack = async () => {
    setUserFormError(null);
    setBulkResult(null);
    setIsImportingSlack(true);
    try {
      const result = await importSlackUsers();
      const parts = [`Added ${result.created.length} from Slack`];
      if (result.skipped.length) {
        parts.push(`skipped ${result.skipped.length} already in the app`);
      }
      setBulkResult(parts.join(', '));
      loadData();
    } catch (err: unknown) {
      setUserFormError(err instanceof Error ? err.message : 'Failed to import from Slack');
    } finally {
      setIsImportingSlack(false);
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
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
  ] as const;

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Admin</h1>
        <p className="mt-1 text-sm text-stone-500">
          Cabins, bookings, and people
        </p>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 p-1 card w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 card p-4">
          <p className="text-red-700">{loadError}</p>
          <button onClick={loadData} className="mt-2 text-sm text-teal-800 font-medium">
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5">
                <h3 className="text-sm text-stone-500">Total cabins</h3>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                  {stats.totalCabins}
                </p>
              </div>
              <div className="card p-5">
                <h3 className="text-sm text-stone-500">Available today</h3>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-700">
                  {stats.availableToday}
                </p>
              </div>
              <div className="card p-5">
                <h3 className="text-sm text-stone-500">Today’s bookings</h3>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-teal-800">
                  {stats.todayBookings}
                </p>
              </div>
              <div className="card p-5">
                <h3 className="text-sm text-stone-500">Active holds</h3>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-700">
                  {stats.activeLocks}
                </p>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">All bookings</h2>
                  <p className="text-sm text-stone-500 mt-0.5">Includes booked and cancelled</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadBookingsCsv(bookings, 'all-bookings')}
                  disabled={bookings.length === 0}
                  className="btn-secondary text-sm"
                >
                  Export CSV
                </button>
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
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {cabinForm.cabinId ? 'Edit cabin' : 'Add cabin'}
                </h2>
                <div className="mt-4 grid gap-3 md:grid-cols-6">
                  <input
                    value={cabinForm.cabinName}
                    onChange={(e) => setCabinForm({ ...cabinForm, cabinName: e.target.value })}
                    placeholder="Name"
                    className="input"
                  />
                  <input
                    value={cabinForm.location}
                    onChange={(e) => setCabinForm({ ...cabinForm, location: e.target.value })}
                    placeholder="Location"
                    className="input"
                  />
                  <input
                    type="number"
                    min={1}
                    value={cabinForm.capacity}
                    onChange={(e) =>
                      setCabinForm({ ...cabinForm, capacity: Number(e.target.value) || 1 })
                    }
                    placeholder="Capacity"
                    className="input"
                  />
                  <input
                    value={cabinForm.description}
                    onChange={(e) => setCabinForm({ ...cabinForm, description: e.target.value })}
                    placeholder="Description"
                    className="input"
                  />
                  <select
                    value={cabinForm.status}
                    onChange={(e) =>
                      setCabinForm({ ...cabinForm, status: e.target.value as Cabin['status'] })
                    }
                    className="input"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCabin}
                      disabled={isSavingCabin}
                      className="btn-primary flex-1"
                    >
                      {isSavingCabin ? 'Saving...' : cabinForm.cabinId ? 'Update' : 'Add'}
                    </button>
                    {cabinForm.cabinId && (
                      <button
                        onClick={resetCabinForm}
                        className="btn-secondary"
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
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Users</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Add employees here so they can be invited to meetings even if they never log in.
                    </p>
                  </div>
                  <button
                    onClick={handleImportFromSlack}
                    disabled={isImportingSlack}
                    className="btn-secondary text-sm"
                  >
                    {isImportingSlack ? 'Importing from Slack...' : 'Import from Slack'}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Name"
                    className="input"
                  />
                  <input
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="nina.v@example.com"
                    className="input"
                  />
                  <input
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    placeholder="Department"
                    className="input"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value as User['role'] })
                    }
                    className="input"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="TEAM_LEAD">TEAM_LEAD</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button
                    onClick={handleCreateUser}
                    disabled={isSavingUser}
                    className="btn-primary"
                  >
                    {isSavingUser ? 'Adding...' : 'Add user'}
                  </button>
                </div>
                {userFormError && (
                  <p className="mt-2 text-sm text-red-600">{userFormError}</p>
                )}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900">Bulk add</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Paste CSV or upload a file. Columns: name, email, department, role.
                    One email per line also works.
                  </p>
                  <textarea
                    value={bulkUsersText}
                    onChange={(e) => {
                      setBulkUsersText(e.target.value);
                      setBulkResult(null);
                    }}
                    rows={6}
                    placeholder={'name,email,department,role\nJane Doe,jane@codeace.com,Engineering,EMPLOYEE'}
                    className="input mt-3 font-mono"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="btn-secondary text-sm cursor-pointer">
                      Upload CSV
                      <input
                        type="file"
                        accept=".csv,.txt,text/csv,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleBulkFile(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      onClick={handleBulkCreateUsers}
                      disabled={isSavingBulkUsers}
                      className="btn-primary"
                    >
                      {isSavingBulkUsers ? 'Importing...' : 'Import users'}
                    </button>
                    {bulkResult && (
                      <p className="text-sm text-gray-600">{bulkResult}</p>
                    )}
                  </div>
                </div>
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
                          <select
                            value={u.role}
                            disabled={u.email === user.email || updatingRoleEmail === u.email}
                            aria-label={`Role for ${u.name}`}
                            title={
                              u.email === user.email
                                ? 'You cannot change your own role'
                                : 'Change role'
                            }
                            onChange={(event) =>
                              handleChangeUserRole(u, event.target.value as UserRole)
                            }
                            className="input py-1 pr-8 text-xs w-auto min-w-[8.5rem]"
                          >
                            {USER_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
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

          {activeTab === 'activity' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
                  <p className="text-sm text-stone-500 mt-0.5">
                    Who did what, after it succeeded. Kept for 7 days, then deleted.
                  </p>
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    loadData();
                  }}
                >
                  <input
                    value={auditSearch}
                    onChange={(event) => setAuditSearch(event.target.value)}
                    placeholder="Search name, email, or action"
                    className="input w-64"
                  />
                  <button type="submit" className="btn-secondary">
                    Search
                  </button>
                </form>
              </div>
              {auditSetupRequired ? (
                <div className="p-6 text-sm text-stone-600">
                  <p>
                    Activity logging is not set up yet. In Supabase, open SQL Editor and run{' '}
                    <code className="text-xs">supabase/audit_logs.sql</code>.
                  </p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-16 text-center text-sm text-stone-500">
                  No activity yet. Book, cancel, or change a user to see a row here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          When
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Who
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatAuditTime(log.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{log.actorName || log.actorEmail}</div>
                            <div className="text-xs text-gray-500">{log.actorEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-stone-100 text-stone-700 rounded">
                              {AUDIT_ACTION_LABEL[log.action] || log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {log.summary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-6">
                Settings
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
                    className="input"
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
                    className="input"
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
                    className="input"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How many days in advance bookings can be made
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                    className="btn-primary"
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
