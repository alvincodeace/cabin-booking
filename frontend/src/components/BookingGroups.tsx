import { useEffect, useState } from 'react';
import { availableGroupMembers } from '../utils/groupAttendees';
import { Link } from 'react-router-dom';
import type { AttendeeGroup } from '../types';
import { getCompanyUsers, getMyGroups, saveGroup } from '../api/appsScript';

interface Props {
  organizerEmail: string;
  selectedEmails: string[];
  onAdd: (emails: string[]) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}
export function BookingGroups({ organizerEmail, selectedEmails, onAdd, disabled, onBusyChange }: Props) {
  const [groups, setGroups] = useState<AttendeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { setGroups(await getMyGroups()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load groups.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let cancelled = false;
    getMyGroups().then(data => { if (!cancelled) setGroups(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load groups.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function add(id: string) {
    if (!id) return;
    setBusy(true); onBusyChange(true); setError(''); setNotice('');
    try {
      // Resolve current membership and availability only when added; the booking then owns its copy.
      const [latest, directory] = await Promise.all([getMyGroups(), getCompanyUsers()]);
      setGroups(latest);
      const group = latest.find(item => item.id === id);
      if (!group) throw new Error('This group was deleted. Select another group.');
      const { emails: available, skipped } = availableGroupMembers(group.memberEmails, directory.map(member => member.email), organizerEmail);
      const added = available.filter(email => !selectedEmails.includes(email)).length;
      onAdd(available);
      setNotice(`${added} members added from ${group.name}.${skipped ? ` ${skipped} unavailable members skipped.` : ''}${!group.memberEmails.length ? ' This group is empty.' : ''}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to add group.'); }
    finally { setBusy(false); onBusyChange(false); }
  }
  async function save() {
    setBusy(true); onBusyChange(true); setError(''); setNotice('');
    try {
      const saved = await saveGroup(name, selectedEmails);
      setGroups(current => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSaving(false); setName(''); setNotice(`Saved “${saved.name}” to My groups.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save group.'); }
    finally { setBusy(false); onBusyChange(false); }
  }
  const blocked = disabled || busy;
  return <div className="rounded-xl border border-stone-200 p-3 space-y-2">
    <label className="block text-sm font-medium text-stone-700" htmlFor="booking-group">Add from my groups</label>
    {loading ? <p className="text-xs text-stone-500" role="status">Loading groups…</p> : groups.length > 0 ? <>
      <input type="search" className="input" aria-label="Search saved groups" placeholder="Search groups" value={search} disabled={blocked} onChange={event => setSearch(event.target.value)} />
      <select id="booking-group" className="input" value="" disabled={blocked} onChange={event => void add(event.target.value)}>
        <option value="">Choose a group to add</option>
        {groups.filter(group => group.name.toLowerCase().includes(search.trim().toLowerCase())).map(group => <option key={group.id} value={group.id}>{group.name} ({group.memberEmails.length} members)</option>)}
      </select>
    </> : <p className="text-xs text-stone-500">No saved groups yet. Select people below and save your first group.</p>}
    {busy && <p role="status" className="text-xs text-stone-500">Updating group…</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error} <button type="button" className="underline" disabled={blocked || loading} onClick={load}>Retry loading groups</button></p>}
    {notice && <p role="status" className="text-xs text-teal-800">{notice}</p>}
    <p className="text-xs text-stone-500">Groups add people to this meeting. You can remove anyone afterward. <Link className="underline" to="/my-groups">Manage groups</Link></p>
    {selectedEmails.length > 0 && (saving ? <div className="space-y-2">
      <input className="input" aria-label="New group name" maxLength={80} value={name} disabled={blocked} placeholder="Group name" onChange={event => setName(event.target.value)} />
      <div className="flex gap-2"><button type="button" className="btn-secondary text-xs" disabled={blocked || !name.trim() || selectedEmails.length > 500} onClick={save}>Save group</button><button type="button" className="btn-ghost text-xs" disabled={blocked} onClick={() => setSaving(false)}>Cancel</button></div>
    </div> : <button type="button" className="text-xs font-medium text-teal-800 underline" disabled={blocked} onClick={() => setSaving(true)}>Save selected members as a group</button>)}
  </div>;
}
