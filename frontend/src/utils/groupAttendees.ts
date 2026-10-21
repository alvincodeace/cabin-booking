export function mergeAttendees(current: string[], incoming: string[], organizer: string): string[] {
  return [...new Set([...current, ...incoming].map(email => email.trim().toLowerCase()))]
    .filter(email => email && email !== organizer.trim().toLowerCase());
}

export function availableGroupMembers(groupEmails: string[], activeEmails: string[], organizer: string) {
  const active = new Set(activeEmails.map(email => email.toLowerCase()));
  const normalized = [...new Set(groupEmails.map(email => email.trim().toLowerCase()))];
  return {
    emails: mergeAttendees([], normalized.filter(email => active.has(email)), organizer),
    skipped: normalized.filter(email => !active.has(email)).length,
  };
}
