import { useEffect, useState } from 'react';
import type { AttendeeGroup, User } from '../types';
import { deleteGroup, getCompanyUsers, getMyGroups, saveGroup } from '../api/appsScript';

type Member = Pick<User, 'email' | 'name' | 'department'>;
export function MyGroups() {
  const [groups, setGroups] = useState<AttendeeGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AttendeeGroup | null>(null);
  const [name, setName] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [saved, directory] = await Promise.all([getMyGroups(), getCompanyUsers()]);
      setGroups(saved);
      setMembers(directory);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load groups.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyGroups(), getCompanyUsers()]).then(([saved, directory]) => {
      if (!cancelled) { setGroups(saved); setMembers(directory); }
    }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load groups.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  function edit(group: AttendeeGroup) {
    setEditing(group); setName(group.name); setEmails([...group.memberEmails]); setMemberSearch(''); setError('');
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const saved = await saveGroup(name, emails, editing?.id || undefined);
      setGroups(current => [...current.filter(group => group.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
      setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save group.'); }
    finally { setBusy(false); }
  }
  async function remove(group: AttendeeGroup) {
    if (!window.confirm(`Delete “${group.name}”? Existing bookings will stay unchanged.`)) return;
    setBusy(true); setError('');
    try {
      await deleteGroup(group.id);
      setGroups(current => current.filter(item => item.id !== group.id));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete group.'); }
    finally { setBusy(false); }
  }
  const unavailable = emails.filter(email => !members.some(member => member.email === email));
  const query = memberSearch.trim().toLowerCase();
  return <div className="page-wrap">
    <div className="mb-6 flex items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-stone-900">My groups</h1>
        <p className="mt-1 text-sm text-stone-500">Private lists of people you regularly invite to meetings.</p></div>
      <button className="btn-primary" disabled={loading || busy || !!editing} onClick={() => edit({ id: '', name: '', memberEmails: [] })}>Create group</button>
    </div>
    {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}
      <button className="ml-3 underline" disabled={loading || busy} onClick={load}>Refresh groups and directory</button></div>}
    {loading ? <p role="status">Loading groups…</p> : editing ? <section className="card p-5 space-y-4">
      <h2 className="text-lg font-semibold">{editing.id ? 'Edit group' : 'Create group'}</h2>
      <label className="block text-sm">Group name<input className="input mt-1" maxLength={80} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder="Development Team" /></label>
      <div><p className="text-sm mb-2">Selected members ({emails.length})</p>
        <div className="flex flex-wrap gap-2">{emails.map(email => <button key={email} disabled={busy} className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-900" onClick={() => setEmails(current => current.filter(item => item !== email))} aria-label={`Remove ${email}`}>
          {members.find(member => member.email === email)?.name || email}{unavailable.includes(email) ? ' (unavailable)' : ''} ×
        </button>)}</div>
        {unavailable.length > 0 && <p className="mt-2 text-sm text-amber-700">Remove unavailable members before saving. <button className="underline" disabled={busy} onClick={() => setEmails(current => current.filter(email => !unavailable.includes(email)))}>Remove unavailable members</button></p>}
      </div>
      <label className="block text-sm">Find members<input type="search" className="input mt-1" value={memberSearch} onChange={event => setMemberSearch(event.target.value)} placeholder="Search by name, email or department" /></label>
      <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl">
        {members.filter(member => `${member.name} ${member.email} ${member.department}`.toLowerCase().includes(query)).map(member => <label key={member.email} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50">
          <input type="checkbox" disabled={busy || (!emails.includes(member.email) && emails.length >= 500)} checked={emails.includes(member.email)} onChange={() => setEmails(current => current.includes(member.email) ? current.filter(email => email !== member.email) : [...current, member.email])} />
          <span className="text-sm">{member.name}<span className="block text-xs text-stone-500">{member.email}{member.department ? ` · ${member.department}` : ''}</span></span>
        </label>)}
        {!members.some(member => `${member.name} ${member.email} ${member.department}`.toLowerCase().includes(query)) && <p className="p-3 text-sm text-stone-500">No matching members</p>}
      </div>
      <div className="flex gap-3"><button className="btn-primary" disabled={busy || !name.trim() || !emails.length || emails.length > 500 || unavailable.length > 0} onClick={save}>{busy ? 'Saving…' : 'Save group'}</button><button className="btn-secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
    </section> : <>
      <input type="search" aria-label="Search groups" className="input mb-4" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your groups" />
      {!groups.length && <div className="card p-6 text-stone-500">Create your first group to add regular meeting attendees in one click.</div>}
      {!!groups.length && !groups.some(group => group.name.toLowerCase().includes(search.trim().toLowerCase())) && <p>No matching groups</p>}
      <div className="grid gap-3 sm:grid-cols-2">{groups.filter(group => group.name.toLowerCase().includes(search.trim().toLowerCase())).map(group => <div key={group.id} className="card p-5">
        <h2 className="font-semibold break-words">{group.name}</h2><p className="mt-1 text-sm text-stone-500">{group.memberEmails.length} members</p>
        <div className="mt-4 flex gap-3"><button className="btn-secondary" disabled={busy} onClick={() => edit(group)}>Edit</button><button className="btn-ghost text-red-700" disabled={busy} onClick={() => remove(group)}>Delete</button></div>
      </div>)}</div>
    </>}
  </div>;
}
