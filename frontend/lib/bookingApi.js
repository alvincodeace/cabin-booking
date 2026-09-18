import { createClient } from '@supabase/supabase-js';

const ALLOWED_DOMAIN = 'codeace.com';
const TIMEZONE = 'Asia/Kolkata';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function ok(res, data) {
  return res.status(200).json({ success: true, data, error: null });
}

function fail(res, code, message) {
  return res.status(200).json({
    success: false,
    data: null,
    error: { code, message },
  });
}

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function todayInKolkata() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function nowInKolkata() {
  const stamp = new Date().toLocaleString('sv-SE', { timeZone: TIMEZONE });
  const [date, clock] = stamp.split(' ');
  return { date, time: (clock || '').slice(0, 5) };
}

function isPastSlot(date, startTime) {
  const now = nowInKolkata();
  return date < now.date || (date === now.date && startTime <= now.time);
}

function toIso(value) {
  if (!value) return value;
  return new Date(value).toISOString();
}

function formatDateValue(value) {
  if (!value) return value;
  if (typeof value === 'string') return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return hours * 60 + minutes;
}

function doTimesOverlap(start1, end1, start2, end2) {
  return timeToMinutes(start1) < timeToMinutes(end2) && timeToMinutes(end1) > timeToMinutes(start2);
}

function generateTimeSlots() {
  const slots = [];
  for (let minutes = 9 * 60; minutes <= 19 * 60; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
  }
  return slots;
}

function mapUser(row) {
  return {
    email: row.email,
    name: row.name,
    employeeId: row.employee_id || '',
    department: row.department || '',
    role: row.role,
    active: Boolean(row.active),
    createdAt: toIso(row.created_at),
  };
}

function mapCabin(row) {
  return {
    cabinId: row.cabin_id,
    cabinName: row.cabin_name,
    location: row.location || '',
    capacity: Number(row.capacity || 0),
    description: row.description || '',
    status: row.status,
    createdAt: toIso(row.created_at),
  };
}

async function getCabinLocation(supabase, cabinId) {
  if (!cabinId) {
    return '';
  }
  const { data } = await supabase
    .from('cabins')
    .select('location')
    .eq('cabin_id', cabinId)
    .maybeSingle();
  return data?.location || '';
}

function mapBooking(row) {
  return {
    bookingId: row.booking_id,
    cabinId: row.cabin_id,
    cabinName: row.cabin_name,
    date: formatDateValue(row.date),
    startTime: row.start_time,
    endTime: row.end_time,
    bookedBy: row.booked_by,
    bookedByEmail: row.booked_by_email,
    department: row.department || '',
    purpose: row.purpose || '',
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapLock(row) {
  return {
    lockId: row.lock_id,
    cabinId: row.cabin_id,
    date: formatDateValue(row.date),
    startTime: row.start_time,
    endTime: row.end_time,
    userEmail: row.user_email,
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    bookingId: row.booking_id || undefined,
    type: row.type,
    title: row.title,
    message: row.message,
    read: Boolean(row.read),
    createdAt: toIso(row.created_at),
  };
}

function mapAuditLog(row) {
  return {
    id: row.id,
    createdAt: toIso(row.created_at),
    actorEmail: row.actor_email || '',
    actorName: row.actor_name || '',
    action: row.action,
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    summary: row.summary || '',
  };
}

async function getAttendeesByBookingIds(supabase, bookingIds) {
  if (!bookingIds.length) {
    return {};
  }
  const { data, error } = await supabase
    .from('booking_attendees')
    .select('booking_id, user_email, name')
    .in('booking_id', bookingIds);
  if (error) {
    console.error('Failed to load attendees:', error.message || error);
    return {};
  }
  const grouped = {};
  for (const row of data || []) {
    if (!grouped[row.booking_id]) grouped[row.booking_id] = [];
    grouped[row.booking_id].push({ email: row.user_email, name: row.name });
  }
  return grouped;
}

function sortBookings(bookings) {
  return [...bookings].sort((a, b) => {
    const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
    if (dateCompare !== 0) return dateCompare;
    return String(b.startTime || '').localeCompare(String(a.startTime || ''));
  });
}

async function withAttendees(supabase, bookings) {
  const grouped = await getAttendeesByBookingIds(
    supabase,
    bookings.map((booking) => booking.bookingId)
  );
  return bookings.map((booking) => ({
    ...booking,
    attendees: grouped[booking.bookingId] || [],
  }));
}

function errorMessage(error) {
  if (!error) return 'Server error';
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string' && error.message) return error.message;
  return 'Server error';
}

function isMissingRelation(error) {
  const code = error?.code;
  const message = errorMessage(error).toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache')
  );
}

const AUDIT_RETENTION_DAYS = 7;

function auditRetentionCutoff() {
  return new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function pruneAuditLogs(supabase) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', auditRetentionCutoff());
    if (error && !isMissingRelation(error)) {
      console.error('Audit prune failed:', errorMessage(error));
    }
  } catch (error) {
    console.error('Audit prune failed:', error);
  }
}

async function writeAuditLog(supabase, entry) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      actor_email: entry.actorEmail || '',
      actor_name: entry.actorName || '',
      action: entry.action,
      entity_type: entry.entityType || '',
      entity_id: String(entry.entityId || ''),
      summary: entry.summary || '',
    });
    if (error && !isMissingRelation(error)) {
      console.error('Audit log failed:', errorMessage(error));
    }
    await pruneAuditLogs(supabase);
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

async function createNotifications(supabase, rows) {
  if (!rows.length) {
    return;
  }
  const { error } = await supabase.from('notifications').insert(rows);
  if (error && !isMissingRelation(error)) throw error;
  if (error) {
    console.error('Notifications table missing:', errorMessage(error));
  }
}

async function lookupSlackUserId(email, cache = new Map()) {
  const token = process.env.SLACK_BOT_TOKEN;
  const normalized = String(email || '').trim().toLowerCase();
  if (!token || !normalized) {
    return null;
  }
  if (cache.has(normalized)) {
    return cache.get(normalized);
  }
  const response = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(normalized)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (!data.ok) {
    console.error('Slack lookup failed:', data.error, normalized);
    cache.set(normalized, null);
    return null;
  }
  const slackUserId = data.user?.id || null;
  cache.set(normalized, slackUserId);
  return slackUserId;
}

async function sendSlackDm(email, text, blocks, cache) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !email) {
    return;
  }
  const slackUserId = await lookupSlackUserId(email, cache);
  if (!slackUserId) {
    return;
  }

  const openResponse = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: slackUserId }),
  });
  const openData = await openResponse.json();
  if (!openData.ok || !openData.channel?.id) {
    console.error('Slack DM open failed:', openData.error, email);
    return;
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: openData.channel.id,
      text,
      blocks,
    }),
  });
  const data = await response.json();
  if (!data.ok) {
    console.error('Slack DM failed:', data.error, email);
  }
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatSlotList(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return `${startTime} - ${endTime}`;
  }
  const parts = [];
  for (let minutes = start; minutes < end; minutes += 30) {
    parts.push(`${minutesToTime(minutes)} - ${minutesToTime(minutes + 30)}`);
  }
  return parts.join(', ');
}

function slackEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cabinLabel(booking) {
  const location = String(booking.location || '').trim();
  const name = booking.cabinName || 'Cabin';
  return location ? `${name} (${location})` : name;
}

function uniquePeople(people) {
  const seen = new Map();
  for (const person of people) {
    const email = String(person?.email || '').toLowerCase();
    if (!email || seen.has(email)) {
      continue;
    }
    seen.set(email, { email, name: person.name || email });
  }
  return [...seen.values()];
}

async function bookingSlackMessage(booking, attendees, action, cache) {
  const participants = uniquePeople([
    booking.bookedByEmail ? { email: booking.bookedByEmail, name: booking.bookedBy } : null,
    ...(attendees || []),
  ]);
  const mentions = [];
  for (const person of participants) {
    const slackUserId = await lookupSlackUserId(person.email, cache);
    mentions.push(slackUserId ? `<@${slackUserId}>` : person.name);
  }
  const timeLabel = slackEscape(formatSlotList(booking.startTime, booking.endTime));
  const cabin = slackEscape(cabinLabel(booking));
  const meeting = slackEscape(booking.purpose || 'Cabin booking');
  const leader = slackEscape(booking.bookedBy || '—');
  const date = slackEscape(booking.date);
  const participantLine = mentions.join('  ') || '—';

  if (action === 'cancelled') {
    const text = `Meeting cancelled: ${meeting} · ${cabin} · ${date} ${timeLabel}`;
    return {
      text,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: 'Meeting Cancelled', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Meeting:*\n${meeting}` },
            { type: 'mrkdwn', text: `*Leader:*\n${leader}` },
            { type: 'mrkdwn', text: `*Cabin:*\n${cabin}` },
            { type: 'mrkdwn', text: `*Date:*\n${date}` },
            { type: 'mrkdwn', text: `*Time:*\n${timeLabel}` },
            { type: 'mrkdwn', text: `*Participants:*\n${participantLine}` },
          ],
        },
      ],
    };
  }

  const text = `Meeting booked successfully: ${meeting} · ${cabin} · ${date} ${timeLabel}`;
  return {
    text,
    blocks: [
      {
          type: 'header',
          text: { type: 'plain_text', text: '✅ Meeting Booked Successfully', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Meeting:*\n${meeting}` },
          { type: 'mrkdwn', text: `*Leader:*\n${leader}` },
          { type: 'mrkdwn', text: `*Cabin:*\n${cabin}` },
          { type: 'mrkdwn', text: `*Date:*\n${date}` },
          { type: 'mrkdwn', text: `*Time:*\n${timeLabel}` },
          { type: 'mrkdwn', text: `*Participants:*\n${participantLine}` },
        ],
      },
    ],
  };
}

function uniqueRecipientEmails(people, skipEmails = []) {
  const skip = new Set(skipEmails.map((email) => String(email).toLowerCase()));
  const emails = new Set();
  for (const person of people) {
    const email = String(person?.email || '').toLowerCase();
    if (email && !skip.has(email)) {
      emails.add(email);
    }
  }
  return [...emails];
}

async function notifySlack(booking, attendees, action = 'booked', skipEmails = []) {
  try {
    const recipients = uniqueRecipientEmails(
      [
        booking.bookedByEmail ? { email: booking.bookedByEmail, name: booking.bookedBy } : null,
        ...(attendees || []),
      ],
      skipEmails
    );
    if (!recipients.length) {
      return;
    }
    const cache = new Map();
    const message = await bookingSlackMessage(booking, attendees, action, cache);
    await Promise.all(recipients.map((email) => sendSlackDm(email, message.text, message.blocks, cache)));
  } catch (error) {
    console.error('Slack notification failed:', error);
  }
}

function headerValue(headers, name) {
  if (!headers) return '';
  const direct = headers[name];
  if (direct) return Array.isArray(direct) ? direct[0] : direct;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === lower) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return '';
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function hmacSha256Hex(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifySlackSignature(headers, rawBody) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    console.error('SLACK_SIGNING_SECRET is not configured');
    return false;
  }
  const timestamp = String(headerValue(headers, 'x-slack-request-timestamp') || '');
  const signature = String(headerValue(headers, 'x-slack-signature') || '');
  if (!timestamp || !signature) {
    return false;
  }
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) {
    return false;
  }
  const digest = `v0=${await hmacSha256Hex(secret, `v0:${timestamp}:${rawBody}`)}`;
  return safeEqual(digest, signature);
}

function slackMemberToUser(member) {
  if (
    !member ||
    member.deleted ||
    member.is_bot ||
    member.is_app_user ||
    member.is_restricted ||
    member.is_ultra_restricted ||
    member.id === 'USLACKBOT'
  ) {
    return null;
  }
  const email = String(member.profile?.email || '').trim().toLowerCase();
  const name = String(member.profile?.real_name || member.real_name || member.profile?.display_name || '').trim();
  const normalized = normalizeUserInput({
    email,
    name,
    department: '',
    employeeId: '',
    role: 'EMPLOYEE',
  });
  return normalized.ok ? normalized.user : null;
}

async function slackApi(path, token) {
  const response = await fetch(`https://slack.com/api/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

function slackApiError(error) {
  if (error === 'missing_scope' || error === 'invalid_scope') {
    return 'Slack bot needs users:read and users:read.email';
  }
  if (error === 'not_authed' || error === 'invalid_auth') {
    return 'Slack bot token is missing or invalid';
  }
  return `Slack request failed: ${error || 'unknown error'}`;
}

async function fetchSlackUser(userId) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !userId) {
    return null;
  }
  const data = await slackApi(`users.info?user=${encodeURIComponent(userId)}`, token);
  if (!data.ok) {
    console.error('Slack users.info failed:', data.error, userId);
    return null;
  }
  return data.user || null;
}

async function fetchSlackMembers() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not configured');
  }
  const members = [];
  let cursor = '';
  do {
    const query = new URLSearchParams({ limit: '200' });
    if (cursor) {
      query.set('cursor', cursor);
    }
    const data = await slackApi(`users.list?${query.toString()}`, token);
    if (!data.ok) {
      throw new Error(slackApiError(data.error));
    }
    members.push(...(data.members || []));
    cursor = data.response_metadata?.next_cursor || '';
  } while (cursor);
  return members;
}

async function insertNewUsers(supabase, prepared) {
  const skipped = [];
  const created = [];
  if (!prepared.length) {
    return { created, skipped };
  }
  const existingEmails = new Set();
  for (let index = 0; index < prepared.length; index += 100) {
    const emails = prepared.slice(index, index + 100).map((row) => row.email);
    const { data, error } = await supabase.from('users').select('email').in('email', emails);
    if (error) throw error;
    for (const row of data || []) {
      existingEmails.add(row.email);
    }
  }
  const toInsert = [];
  for (const row of prepared) {
    if (existingEmails.has(row.email)) {
      skipped.push({ email: row.email, reason: 'User already exists' });
    } else {
      toInsert.push(row);
    }
  }
  for (let index = 0; index < toInsert.length; index += 100) {
    const chunk = toInsert.slice(index, index + 100);
    const { data, error } = await supabase.from('users').insert(chunk).select();
    if (error) throw error;
    created.push(...(data || []).map(mapUser));
  }
  return { created, skipped };
}

async function importSlackMembers(supabase, members) {
  const prepared = [];
  const seenEmails = new Set();
  for (const member of members) {
    const mapped = slackMemberToUser(member);
    if (!mapped || seenEmails.has(mapped.email)) {
      continue;
    }
    seenEmails.add(mapped.email);
    prepared.push(mapped);
  }
  const result = await insertNewUsers(supabase, prepared);
  return { ...result, errors: [] };
}

export async function processSlackEvent(headers, rawBody) {
  if (!(await verifySlackSignature(headers, rawBody))) {
    return { status: 401, body: { error: 'invalid signature' } };
  }
  let payload = {};
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return { status: 400, body: { error: 'invalid json' } };
  }
  if (payload.type === 'url_verification') {
    return { status: 200, body: { challenge: payload.challenge } };
  }
  if (payload.type === 'event_callback' && payload.event?.type === 'team_join') {
    try {
      let member = payload.event.user;
      if (member?.id && !member?.profile?.email) {
        member = (await fetchSlackUser(member.id)) || member;
      }
      const supabase = getSupabase();
      const imported = await importSlackMembers(supabase, [member]);
      if (imported.created?.length) {
        const createdUser = imported.created[0];
        await writeAuditLog(supabase, {
          actorEmail: 'slack',
          actorName: 'Slack',
          action: 'USER_CREATED',
          entityType: 'user',
          entityId: createdUser.email,
          summary: `Slack added ${createdUser.name} (${createdUser.email}) when they joined the workspace`,
        });
      }
    } catch (error) {
      console.error('Slack team_join import failed:', error);
    }
  }
  return { status: 200, body: { ok: true } };
}

async function verifyGoogleToken(accessToken) {
  // Fetch tokeninfo first so we can validate aud/azp (audience) before trusting email.
  // Prevents cross-app token replay: token minted for another OAuth client must be rejected.
  const envAud = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (!envAud) {
    console.error('GOOGLE_CLIENT_ID not configured — rejecting token (fail-closed)');
    return null;
  }
  const expectedAud = envAud;
  const allowedAuds = new Set(
    expectedAud
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  // Also allow explicit allowlist via env (comma-separated)
  const extra = String(process.env.GOOGLE_ALLOWED_CLIENT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const a of extra) allowedAuds.add(a);

  let profile = null;
  let tokenInfo = null;
  try {
    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (tokenInfoResponse.ok) {
      tokenInfo = await tokenInfoResponse.json();
      // Validate audience/azp and expiry/hosted domain before accepting email
      const aud = String(tokenInfo.aud || tokenInfo.aud || '').trim();
      const azp = String(tokenInfo.azp || '').trim();
      const hd = String(tokenInfo.hd || '').trim().toLowerCase();
      const emailFromInfo = String(tokenInfo.email || '').toLowerCase();
      const audOk = allowedAuds.has(aud) || allowedAuds.has(azp);
      const hdOk = !hd || hd === ALLOWED_DOMAIN;
      const emailVerified = String(tokenInfo.email_verified) === 'true' || tokenInfo.email_verified === true;
      if (audOk && (!tokenInfo.email || (emailFromInfo.endsWith(`@${ALLOWED_DOMAIN}`) && emailVerified && hdOk))) {
        profile = {
          email: emailFromInfo,
          name: tokenInfo.name || tokenInfo.given_name || '',
          _audOk: true,
        };
      } else if (!audOk) {
        console.warn('Google token aud mismatch', { aud, azp });
        return null;
      }
    }
  } catch {
    // fall through to userinfo
  }

  if (!profile || !profile._audOk) {
    // Fail-closed: if tokeninfo succeeded (tokenInfo non-null) but aud failed we already returned null above.
    // If tokeninfo was unreachable (network error, tokenInfo === null), fail closed — do not accept userinfo alone
    // without aud proof. This prevents aud bypass when Google tokeninfo transiently down (P0 #9).
    if (tokenInfo === null) {
      console.warn('tokeninfo unavailable — failing closed (no aud proof)');
      return null;
    }
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userInfoResponse.ok) return null;
    const ui = await userInfoResponse.json();
    // If we already fetched tokenInfo and aud failed, do not accept userinfo
    if (tokenInfo && profile === null) return null;
    // When tokeninfo was unavailable, at least verify hd/email_verified from userinfo
    const hdUi = String(ui.hd || '').trim().toLowerCase();
    const verifiedUi = ui.email_verified === true || String(ui.email_verified) === 'true';
    if (hdUi && hdUi !== ALLOWED_DOMAIN) return null;
    if (ui.email_verified !== undefined && !verifiedUi) return null;
    profile = ui;
  }

  const email = String(profile?.email || '').toLowerCase();
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return null;
  }
  // Strip internal flag
  if (profile._audOk !== undefined) delete profile._audOk;
  return {
    email,
    name: profile.name || email.split('@')[0],
  };
}

async function getRegisteredUser(supabase, profile) {
  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('*')
    .eq('email', profile.email)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    return {
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Your account is not in the system. Ask an admin to add your email first.',
      },
    };
  }

  if (!existing.active) {
    return { error: { code: 'USER_INACTIVE', message: 'User account is inactive' } };
  }

  if (profile.name && existing.name !== profile.name) {
    await supabase.from('users').update({ name: profile.name }).eq('email', profile.email);
    existing.name = profile.name;
  }

  return { user: mapUser(existing) };
}

async function getSettings(supabase) {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error) {
    throw error;
  }
  return {
    lockDurationMinutes: data.lock_duration_minutes,
    maxBookingDurationMinutes: data.max_booking_duration_minutes,
    advanceBookingDays: data.advance_booking_days,
  };
}

function validateBookingDateTime(date, startTime, endTime, settings) {
  const bookingDateTime = new Date(`${date}T${startTime}:00+05:30`);
  if (bookingDateTime < new Date()) {
    return { valid: false, code: 'PAST_BOOKING', message: 'Cannot book in the past' };
  }

  const maxAdvance = new Date(Date.now() + settings.advanceBookingDays * 24 * 60 * 60 * 1000);
  if (bookingDateTime > maxAdvance) {
    return {
      valid: false,
      code: 'ADVANCE_LIMIT_EXCEEDED',
      message: `Cannot book more than ${settings.advanceBookingDays} days in advance`,
    };
  }

  const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (durationMinutes <= 0) {
    return { valid: false, code: 'INVALID_DURATION', message: 'End time must be after start time' };
  }
  if (durationMinutes > settings.maxBookingDurationMinutes) {
    return {
      valid: false,
      code: 'DURATION_EXCEEDED',
      message: `Maximum booking duration is ${settings.maxBookingDurationMinutes} minutes`,
    };
  }
  return { valid: true };
}

function requireAdmin(user) {
  return user.role === 'ADMIN';
}

const VALID_ROLES = ['ADMIN', 'TEAM_LEAD', 'EMPLOYEE'];

function nameFromEmail(email) {
  const localPart = String(email || '').split('@')[0] || '';
  const words = localPart.split(/[._-]+/).filter(Boolean);
  if (!words.length) {
    return '';
  }
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeUserInput(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const name = String(payload.name || '').trim() || nameFromEmail(email);
  const role = String(payload.role || 'EMPLOYEE').trim().toUpperCase();
  const department = String(payload.department || '').trim();
  const employeeId = String(payload.employeeId || payload.employee_id || '').trim();

  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return { ok: false, message: `Email must be a @${ALLOWED_DOMAIN} address` };
  }
  if (!name) {
    return { ok: false, message: 'Name is required' };
  }
  if (!VALID_ROLES.includes(role)) {
    return { ok: false, message: 'Role must be ADMIN, TEAM_LEAD, or EMPLOYEE' };
  }

  return {
    ok: true,
    user: {
      email,
      name,
      employee_id: employeeId,
      department,
      role,
      active: true,
    },
  };
}

// LOW-1: simple in-memory rate limiter (per-IP + per-user). For distributed Vercel, pair with edge KV in prod.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_IP = 60; // per IP per minute
const RATE_MAX_USER = 30; // per authenticated user per minute
const rateBuckets = new Map(); // key -> { count, resetAt }
function rateLimitCheck(key, max) {
  const now = Date.now();
  let b = rateBuckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(key, b);
  }
  b.count += 1;
  if (b.count > max) {
    const retryAfter = Math.ceil((b.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false };
}
function clientIpFromReq(req) {
  const xf = String(req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'] || '').split(',')[0].trim();
  return xf || String(req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}
const SESSION_COOKIE = '__Host-session';
const SESSION_MAX_AGE = 55 * 60; // 55m seconds, matches Google 60m
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
  }
  return out;
}
function setSessionCookie(res, token) {
  try {
    const val = encodeURIComponent(token);
    // __Host- requires Secure, Path=/, no Domain
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${val}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`);
  } catch {}
}
function clearSessionCookie(res) {
  try {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  } catch {}
}
function getAccessTokenFromRequest(req, payload) {
  if (payload && typeof payload.accessToken === 'string' && payload.accessToken) return payload.accessToken;
  const cookies = parseCookies(req.headers?.cookie || req.headers?.Cookie || '');
  if (cookies[SESSION_COOKIE]) return cookies[SESSION_COOKIE];
  const auth = String(req.headers?.authorization || req.headers?.Authorization || '');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return '';
}
function setSecurityHeaders(res) {
  try {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  } catch {
    // ignore if headers already sent
  }
}
async function revokeGoogleToken(accessToken) {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, { method: 'POST' });
  } catch {
    // best-effort
  }
}

export async function handleBookingApi(req, res) {
  try {
    setSecurityHeaders(res);
    // CORS: strict allowlist — require https + exact or .subdomain. Prevents evilcodeace.org suffix bypass (V2).
    const origin = String(req.headers?.origin || '');
    function isAllowedOrigin(o) {
      if (!o) return false;
      try {
        const u = new URL(o);
        if (u.protocol !== 'https:') return false;
        const h = u.hostname.toLowerCase();
        return h === 'cabin.codeace.org' || h === 'cabin.codeace.com' || h.endsWith('.codeace.org') || h.endsWith('.codeace.com');
      } catch {
        return false;
      }
    }
    const allowedOrigin = isAllowedOrigin(origin) ? origin : '';
    if (req.method === 'OPTIONS') {
      if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '600');
      res.status(204).end();
      return;
    }
    if (allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
    }

    // INFO/CSRF hardening: require JSON content-type (prevents <form> CSRF)
    const ctype = String(req.headers?.['content-type'] || '').toLowerCase();
    if (!ctype.includes('application/json')) {
      return fail(res, 'INVALID_CONTENT_TYPE', 'Invalid request format');
    }

    // LOW-1: per-IP rate limit (before auth)
    const ip = clientIpFromReq(req);
    const ipCheck = rateLimitCheck(`ip:${ip}`, RATE_MAX_IP);
    if (ipCheck.limited) {
      res.setHeader('Retry-After', String(ipCheck.retryAfter));
      return fail(res, 'RATE_LIMITED', 'Too many requests. Please try again shortly.');
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const action = payload.action;
    if (!action) {
      return fail(res, 'ACTION_REQUIRED', 'Action parameter is required');
    }

    const accessToken = getAccessTokenFromRequest(req, payload);
    if (!accessToken) {
      return fail(res, 'UNAUTHORIZED', 'Sign in with Google to continue');
    }

    const profile = await verifyGoogleToken(accessToken);
    if (!profile) {
      clearSessionCookie(res);
      return fail(res, 'UNAUTHORIZED', 'Only @codeace.com accounts can sign in. Try Sign in with Google again.');
    }
    // V1 mitigation: set HttpOnly SameSite=Lax session cookie (55m) so future requests can omit token body
    setSessionCookie(res, accessToken);

    const supabase = getSupabase();
    const current = await getRegisteredUser(supabase, profile);
    if (current.error) {
      return fail(res, current.error.code, current.error.message);
    }
    const user = current.user;
    // LOW-1: per-user rate limit (after auth, so we have email)
    const userCheck = rateLimitCheck(`user:${user.email}`, RATE_MAX_USER);
    if (userCheck.limited) {
      res.setHeader('Retry-After', String(userCheck.retryAfter));
      return fail(res, 'RATE_LIMITED', 'Too many requests. Please try again shortly.');
    }

    switch (action) {
      case 'currentUser':
        return ok(res, user);

      case 'recordLogin': {
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'USER_LOGIN',
          entityType: 'session',
          entityId: user.email,
          summary: `${user.name} (${user.role}) signed in`,
        });
        return ok(res, null);
      }

      case 'recordLogout': {
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'USER_LOGOUT',
          entityType: 'session',
          entityId: user.email,
          summary: `${user.name} (${user.role}) signed out`,
        });
        // Best-effort server-side session invalidation: revoke Google token so replay fails + clear HttpOnly cookie
        await revokeGoogleToken(accessToken);
        clearSessionCookie(res);
        return ok(res, null);
      }

      case 'cabins': {
        const { data, error } = await supabase.from('cabins').select('*').order('cabin_name');
        if (error) throw error;
        return ok(res, (data || []).map(mapCabin));
      }

      case 'bookings': {
        const { data, error } = await supabase.from('bookings').select('*').eq('date', payload.date);
        if (error) throw error;
        return ok(res, (data || []).map(mapBooking));
      }

      case 'availability': {
        if (!payload.date) {
          return fail(res, 'DATE_REQUIRED', 'Date parameter is required');
        }
        await supabase.from('locks').delete().lte('expires_at', new Date().toISOString());
        const [{ data: cabins, error: cabinError }, { data: bookings, error: bookingError }, { data: locks, error: lockError }] =
          await Promise.all([
            supabase.from('cabins').select('*').order('cabin_name'),
            supabase.from('bookings').select('*').eq('date', payload.date).eq('status', 'BOOKED'),
            supabase.from('locks').select('*').eq('date', payload.date).gt('expires_at', new Date().toISOString()),
          ]);
        if (cabinError) throw cabinError;
        if (bookingError) throw bookingError;
        if (lockError) throw lockError;

        const timeSlots = generateTimeSlots();
        const availability = (cabins || []).map((cabin) => {
          const slots = [];
          for (let i = 0; i < timeSlots.length - 1; i++) {
            const startTime = timeSlots[i];
            const endTime = timeSlots[i + 1];
            const slot = { time: startTime, endTime, status: 'AVAILABLE' };
            if (cabin.status !== 'ACTIVE') {
              slot.status = 'DISABLED';
            } else {
              const overlappingBooking = (bookings || []).find(
                (booking) =>
                  booking.cabin_id === cabin.cabin_id &&
                  doTimesOverlap(startTime, endTime, booking.start_time, booking.end_time)
              );
              if (overlappingBooking) {
                slot.status = 'BOOKED';
                slot.booking = mapBooking(overlappingBooking);
              } else if (isPastSlot(payload.date, startTime)) {
                slot.status = 'DISABLED';
              } else {
                const overlappingLock = (locks || []).find(
                  (lock) =>
                    lock.cabin_id === cabin.cabin_id &&
                    doTimesOverlap(startTime, endTime, lock.start_time, lock.end_time)
                );
                if (overlappingLock) {
                  slot.status = 'LOCKED';
                  slot.lock = mapLock(overlappingLock);
                  slot.isOwnLock = overlappingLock.user_email === user.email;
                }
              }
            }
            slots.push(slot);
          }
          return { cabin: mapCabin(cabin), slots };
        });
        return ok(res, availability);
      }

      case 'myBookings': {
        const { data: ownRows, error: ownError } = await supabase
          .from('bookings')
          .select('*')
          .eq('booked_by_email', user.email);
        if (ownError) throw ownError;

        const { data: attendeeRows, error: attendeeError } = await supabase
          .from('booking_attendees')
          .select('booking_id')
          .eq('user_email', user.email);
        if (attendeeError && !isMissingRelation(attendeeError)) {
          throw attendeeError;
        }

        const invitedIds = (attendeeRows || [])
          .map((row) => row.booking_id)
          .filter((bookingId) => !(ownRows || []).some((row) => row.booking_id === bookingId));

        let invitedRows = [];
        if (invitedIds.length) {
          const { data, error } = await supabase.from('bookings').select('*').in('booking_id', invitedIds);
          if (error) throw error;
          invitedRows = data || [];
        }

        const merged = [...(ownRows || []), ...invitedRows].map(mapBooking);
        return ok(res, sortBookings(await withAttendees(supabase, merged)));
      }

      case 'allBookings': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        let query = supabase.from('bookings').select('*');
        if (payload.date) query = query.eq('date', payload.date);
        if (payload.cabinId) query = query.eq('cabin_id', payload.cabinId);
        if (payload.userEmail) query = query.eq('booked_by_email', payload.userEmail);
        if (payload.status) query = query.eq('status', payload.status);
        const { data, error } = await query;
        if (error) throw error;
        const bookings = await withAttendees(supabase, (data || []).map(mapBooking));
        return ok(res, sortBookings(bookings));
      }

      case 'companyUsers': {
        const { data, error } = await supabase
          .from('users')
          .select('email, name, department, role')
          .eq('active', true)
          .order('name');
        if (error) throw error;
        return ok(
          res,
          (data || []).map((row) => ({
            email: row.email,
            name: row.name,
            department: row.department || '',
            role: row.role,
          }))
        );
      }

      case 'notifications': {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_email', user.email)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error && !isMissingRelation(error)) throw error;
        return ok(res, (data || []).map(mapNotification));
      }

      case 'markNotificationsRead': {
        const ids = Array.isArray(payload.ids) ? payload.ids : [];
        let query = supabase.from('notifications').update({ read: true }).eq('user_email', user.email);
        if (ids.length) {
          query = query.in('id', ids);
        } else {
          query = query.eq('read', false);
        }
        const { error } = await query;
        if (error && !isMissingRelation(error)) throw error;
        return ok(res, null);
      }

      case 'allUsers': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const { data, error } = await supabase.from('users').select('*').order('name');
        if (error) throw error;
        return ok(res, (data || []).map(mapUser));
      }

      case 'settings':
        return ok(res, await getSettings(supabase));

      case 'todayStats': {
        const today = todayInKolkata();
        const [{ data: cabins }, { data: bookings }, { data: locks }, { count: activeLocks }] =
          await Promise.all([
            supabase.from('cabins').select('*'),
            supabase.from('bookings').select('*').eq('date', today).eq('status', 'BOOKED'),
            supabase
              .from('locks')
              .select('*')
              .eq('date', today)
              .gt('expires_at', new Date().toISOString()),
            supabase
              .from('locks')
              .select('lock_id', { count: 'exact', head: true })
              .gt('expires_at', new Date().toISOString()),
          ]);
        const timeSlots = generateTimeSlots();
        const todayBookings = (bookings || []).filter(
          (booking) => formatDateValue(booking.date) === today && booking.status === 'BOOKED'
        );
        const availableToday = (cabins || []).filter((cabin) => {
          if (cabin.status !== 'ACTIVE') {
            return false;
          }
          for (let index = 0; index < timeSlots.length - 1; index += 1) {
            const startTime = timeSlots[index];
            const endTime = timeSlots[index + 1];
            if (isPastSlot(today, startTime)) {
              continue;
            }
            const taken = todayBookings.some(
              (booking) =>
                booking.cabin_id === cabin.cabin_id &&
                doTimesOverlap(startTime, endTime, booking.start_time, booking.end_time)
            );
            if (taken) {
              continue;
            }
            const held = (locks || []).some(
              (lock) =>
                lock.cabin_id === cabin.cabin_id &&
                doTimesOverlap(startTime, endTime, lock.start_time, lock.end_time)
            );
            if (!held) {
              return true;
            }
          }
          return false;
        }).length;
        return ok(res, {
          totalCabins: (cabins || []).length,
          availableToday,
          todayBookings: todayBookings.length,
          activeLocks: activeLocks || 0,
        });
      }

      case 'activeLocks': {
        const { count } = await supabase
          .from('locks')
          .select('lock_id', { count: 'exact', head: true })
          .gt('expires_at', new Date().toISOString());
        return ok(res, count || 0);
      }

      case 'createLock': {
        const { cabinId, date, startTime, endTime } = payload;
        if (!cabinId || !date || !startTime || !endTime) {
          return fail(res, 'INVALID_INPUT', 'Missing required parameters');
        }
        const { data: cabin } = await supabase.from('cabins').select('*').eq('cabin_id', cabinId).maybeSingle();
        if (!cabin) {
          return fail(res, 'CABIN_NOT_FOUND', 'Cabin not found');
        }
        if (cabin.status !== 'ACTIVE') {
          return fail(res, 'CABIN_DISABLED', 'This cabin is currently disabled');
        }
        const settings = await getSettings(supabase);
        const validation = validateBookingDateTime(date, startTime, endTime, settings);
        if (!validation.valid) {
          return fail(res, validation.code, validation.message);
        }
        const { data, error } = await supabase.rpc('create_booking_lock', {
          p_cabin_id: cabinId,
          p_date: date,
          p_start_time: startTime,
          p_end_time: endTime,
          p_user_email: user.email,
          p_lock_duration_minutes: settings.lockDurationMinutes,
        });
        if (error) throw error;
        if (!data?.ok) {
          return fail(res, data?.code || 'LOCK_FAILED', data?.message || 'Failed to create lock');
        }
        return ok(res, { lockId: data.lockId, expiresAt: data.expiresAt });
      }

      case 'refreshLock': {
        const settings = await getSettings(supabase);
        const { data: lock } = await supabase.from('locks').select('*').eq('lock_id', payload.lockId).maybeSingle();
        if (!lock) {
          return fail(res, 'LOCK_NOT_FOUND', 'Lock not found');
        }
        if (lock.user_email !== user.email) {
          return fail(res, 'UNAUTHORIZED', 'This lock belongs to another user');
        }
        if (new Date(lock.expires_at) < new Date()) {
          return fail(res, 'LOCK_EXPIRED', 'Lock has expired');
        }
        const expiresAt = new Date(Date.now() + settings.lockDurationMinutes * 60000).toISOString();
        const { error } = await supabase.from('locks').update({ expires_at: expiresAt }).eq('lock_id', payload.lockId);
        if (error) throw error;
        return ok(res, { expiresAt });
      }

      case 'confirmBooking': {
        const { data, error } = await supabase.rpc('confirm_booking_from_lock', {
          p_lock_id: payload.lockId,
          p_user_email: user.email,
          p_user_name: user.name,
          p_department: user.department || '',
          p_purpose: payload.purpose || '',
        });
        if (error) throw error;
        if (!data?.ok) {
          return fail(res, data?.code || 'BOOKING_FAILED', data?.message || 'Failed to confirm booking');
        }
        const booking = {
          bookingId: data.booking.bookingId,
          cabinId: data.booking.cabinId,
          cabinName: data.booking.cabinName,
          date: formatDateValue(data.booking.date),
          startTime: data.booking.startTime,
          endTime: data.booking.endTime,
          bookedBy: data.booking.bookedBy,
          bookedByEmail: data.booking.bookedByEmail,
          department: data.booking.department,
          purpose: data.booking.purpose,
          status: data.booking.status,
          createdAt: toIso(data.booking.createdAt),
          updatedAt: toIso(data.booking.updatedAt),
          attendees: [],
        };

        const requestedEmails = Array.isArray(payload.attendeeEmails)
          ? payload.attendeeEmails
          : [];
        const uniqueEmails = [...new Set(requestedEmails.map((email) => String(email).toLowerCase()))]
          .filter((email) => email && email !== user.email && email.endsWith('@codeace.com'));

        if (uniqueEmails.length) {
          const { data: memberRows, error: memberError } = await supabase
            .from('users')
            .select('email, name')
            .in('email', uniqueEmails)
            .eq('active', true);
          if (memberError) throw memberError;
          const attendees = (memberRows || []).map((row) => ({
            email: row.email,
            name: row.name,
          }));
          if (attendees.length) {
            const { error: attendeeInsertError } = await supabase.from('booking_attendees').insert(
              attendees.map((attendee) => ({
                booking_id: booking.bookingId,
                user_email: attendee.email,
                name: attendee.name,
              }))
            );
            if (attendeeInsertError && !isMissingRelation(attendeeInsertError)) {
              throw attendeeInsertError;
            }

            await createNotifications(
              supabase,
              attendees.map((attendee) => ({
                user_email: attendee.email,
                booking_id: booking.bookingId,
                type: 'BOOKING_INVITE',
                title: `${user.name} booked ${booking.cabinName}`,
                message: `${booking.date} ${booking.startTime}–${booking.endTime}. ${booking.purpose}`,
              }))
            );
            booking.attendees = attendees;
          }
        }

        booking.location = await getCabinLocation(supabase, booking.cabinId);
        await notifySlack(booking, booking.attendees || [], 'booked');
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'BOOKING_CREATED',
          entityType: 'booking',
          entityId: booking.bookingId,
          summary: `${user.name} booked ${booking.cabinName} on ${booking.date} ${booking.startTime}–${booking.endTime}${booking.purpose ? ` (${booking.purpose})` : ''}`,
        });
        return ok(res, booking);
      }

      case 'cancelLock': {
        const { data: lock } = await supabase.from('locks').select('*').eq('lock_id', payload.lockId).maybeSingle();
        if (lock && lock.user_email !== user.email) {
          return fail(res, 'UNAUTHORIZED', 'This lock belongs to another user');
        }
        await supabase.from('locks').delete().eq('lock_id', payload.lockId);
        return ok(res, null);
      }

      case 'cancelBooking': {
        const { data: booking } = await supabase
          .from('bookings')
          .select('*')
          .eq('booking_id', payload.bookingId)
          .maybeSingle();
        if (!booking) {
          return fail(res, 'BOOKING_NOT_FOUND', 'Booking not found');
        }
        if (booking.status !== 'BOOKED') {
          return fail(res, 'ALREADY_CANCELLED', 'Booking is already cancelled');
        }
        if (user.role !== 'ADMIN' && booking.booked_by_email !== user.email) {
          return fail(res, 'UNAUTHORIZED', 'You can only cancel your own bookings');
        }
        if (user.role !== 'ADMIN') {
          const bookingDateTime = new Date(`${formatDateValue(booking.date)}T${booking.start_time}:00+05:30`);
          if (bookingDateTime < new Date()) {
            return fail(res, 'PAST_BOOKING', 'Cannot cancel past bookings');
          }
        }

        const { data: attendeeRows } = await supabase
          .from('booking_attendees')
          .select('user_email, name')
          .eq('booking_id', payload.bookingId);

        const { error } = await supabase
          .from('bookings')
          .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
          .eq('booking_id', payload.bookingId);
        if (error) throw error;

        const notifyEmails = new Set((attendeeRows || []).map((row) => row.user_email));
        if (booking.booked_by_email !== user.email) {
          notifyEmails.add(booking.booked_by_email);
        }
        notifyEmails.delete(user.email);

        await createNotifications(
          supabase,
          [...notifyEmails].map((email) => ({
            user_email: email,
            booking_id: booking.booking_id,
            type: 'BOOKING_CANCELLED',
            title: `${booking.cabin_name} booking cancelled`,
            message: `${formatDateValue(booking.date)} ${booking.start_time}–${booking.end_time} was cancelled by ${user.name}.`,
          }))
        );

        const cancelledBooking = {
          cabinName: booking.cabin_name,
          location: await getCabinLocation(supabase, booking.cabin_id),
          date: formatDateValue(booking.date),
          startTime: booking.start_time,
          endTime: booking.end_time,
          bookedBy: booking.booked_by,
          bookedByEmail: booking.booked_by_email,
          purpose: booking.purpose,
        };
        const slackAttendees = (attendeeRows || []).map((row) => ({
          email: row.user_email,
          name: row.name,
        }));
        await notifySlack(cancelledBooking, slackAttendees, 'cancelled', [user.email]);
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'BOOKING_CANCELLED',
          entityType: 'booking',
          entityId: booking.booking_id,
          summary: `${user.name} cancelled ${booking.cabin_name} on ${formatDateValue(booking.date)} ${booking.start_time}–${booking.end_time} (booked by ${booking.booked_by})`,
        });
        return ok(res, null);
      }

      case 'updateCabinStatus': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const { error } = await supabase
          .from('cabins')
          .update({ status: payload.status })
          .eq('cabin_id', payload.cabinId);
        if (error) throw error;
        return ok(res, null);
      }

      case 'createCabin': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const cabinName = String(payload.cabinName || '').trim();
        if (!cabinName) {
          return fail(res, 'INVALID_INPUT', 'Cabin name is required');
        }
        const cabinId = generateId('CABIN');
        const { data, error } = await supabase
          .from('cabins')
          .insert({
            cabin_id: cabinId,
            cabin_name: cabinName,
            location: payload.location || '',
            capacity: Number(payload.capacity || 4),
            description: payload.description || '',
            status: payload.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
          })
          .select()
          .single();
        if (error) throw error;
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'CABIN_CREATED',
          entityType: 'cabin',
          entityId: cabinId,
          summary: `${user.name} added cabin ${cabinName}`,
        });
        return ok(res, mapCabin(data));
      }

      case 'updateCabin': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const cabinId = payload.cabinId;
        const cabinName = String(payload.cabinName || '').trim();
        if (!cabinId || !cabinName) {
          return fail(res, 'INVALID_INPUT', 'Cabin id and name are required');
        }
        const { data, error } = await supabase
          .from('cabins')
          .update({
            cabin_name: cabinName,
            location: payload.location || '',
            capacity: Number(payload.capacity || 4),
            description: payload.description || '',
            status: payload.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
          })
          .eq('cabin_id', cabinId)
          .select()
          .single();
        if (error) throw error;
        if (!data) {
          return fail(res, 'CABIN_NOT_FOUND', 'Cabin not found');
        }
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'CABIN_UPDATED',
          entityType: 'cabin',
          entityId: cabinId,
          summary: `${user.name} updated cabin ${cabinName} (${payload.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'})`,
        });
        return ok(res, mapCabin(data));
      }

      case 'deleteCabin': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const cabinId = payload.cabinId;
        if (!cabinId) {
          return fail(res, 'INVALID_INPUT', 'Cabin id is required');
        }

        const today = todayInKolkata();
        const { data: futureBookings, error: futureError } = await supabase
          .from('bookings')
          .select('booking_id')
          .eq('cabin_id', cabinId)
          .eq('status', 'BOOKED')
          .gte('date', today);
        if (futureError) throw futureError;
        if (futureBookings && futureBookings.length > 0) {
          return fail(
            res,
            'CABIN_HAS_BOOKINGS',
            'Cancel upcoming bookings for this cabin before deleting it'
          );
        }

        const { data: cabinBookings } = await supabase
          .from('bookings')
          .select('booking_id')
          .eq('cabin_id', cabinId);
        const bookingIds = (cabinBookings || []).map((row) => row.booking_id);
        if (bookingIds.length) {
          await supabase.from('booking_attendees').delete().in('booking_id', bookingIds);
          await supabase.from('notifications').delete().in('booking_id', bookingIds);
          await supabase.from('bookings').delete().eq('cabin_id', cabinId);
        }
        await supabase.from('locks').delete().eq('cabin_id', cabinId);
        const { data: cabinRow } = await supabase
          .from('cabins')
          .select('cabin_name')
          .eq('cabin_id', cabinId)
          .maybeSingle();
        const { error } = await supabase.from('cabins').delete().eq('cabin_id', cabinId);
        if (error) throw error;
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'CABIN_DELETED',
          entityType: 'cabin',
          entityId: cabinId,
          summary: `${user.name} deleted cabin ${cabinRow?.cabin_name || cabinId}`,
        });
        return ok(res, null);
      }

      case 'createUser': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const normalized = normalizeUserInput(payload);
        if (!normalized.ok) {
          return fail(res, 'INVALID_INPUT', normalized.message);
        }
        const { data, error } = await supabase
          .from('users')
          .insert(normalized.user)
          .select()
          .single();
        if (error) {
          if (String(error.message).includes('duplicate') || error.code === '23505') {
            return fail(res, 'USER_EXISTS', 'A user with this email already exists');
          }
          throw error;
        }
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'USER_CREATED',
          entityType: 'user',
          entityId: data.email,
          summary: `${user.name} added ${data.name} (${data.email}) as ${data.role}`,
        });
        return ok(res, mapUser(data));
      }

      case 'createUsers': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const rows = Array.isArray(payload.users) ? payload.users : [];
        if (!rows.length) {
          return fail(res, 'INVALID_INPUT', 'Paste or upload at least one user');
        }
        if (rows.length > 500) {
          return fail(res, 'INVALID_INPUT', 'Import up to 500 users at a time');
        }

        const prepared = [];
        const errors = [];
        const seenEmails = new Set();
        for (let index = 0; index < rows.length; index += 1) {
          const normalized = normalizeUserInput(rows[index] || {});
          const email = String(rows[index]?.email || '').trim().toLowerCase();
          if (!normalized.ok) {
            errors.push({ email, message: normalized.message });
            continue;
          }
          if (seenEmails.has(normalized.user.email)) {
            errors.push({ email: normalized.user.email, message: 'Duplicate email in this import' });
            continue;
          }
          seenEmails.add(normalized.user.email);
          prepared.push(normalized.user);
        }

        const inserted = await insertNewUsers(supabase, prepared);
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'USERS_IMPORTED',
          entityType: 'user',
          entityId: '',
          summary: `${user.name} bulk-added ${inserted.created.length} users (${inserted.skipped.length} skipped)`,
        });
        return ok(res, { created: inserted.created, skipped: inserted.skipped, errors });
      }

      case 'importSlackUsers': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const members = await fetchSlackMembers();
        const result = await importSlackMembers(supabase, members);
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'USERS_IMPORTED',
          entityType: 'user',
          entityId: '',
          summary: `${user.name} imported ${result.created.length} users from Slack (${result.skipped.length} already in the app)`,
        });
        return ok(res, result);
      }

      case 'updateUserStatus': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const targetEmail = String(payload.email || '').trim().toLowerCase();
        const { data: statusUser } = await supabase
          .from('users')
          .select('email, name, active')
          .eq('email', targetEmail)
          .maybeSingle();
        const { error } = await supabase.from('users').update({ active: payload.active }).eq('email', payload.email);
        if (error) throw error;
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: payload.active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          entityType: 'user',
          entityId: targetEmail,
          summary: `${user.name} ${payload.active ? 'activated' : 'deactivated'} ${statusUser?.name || targetEmail}`,
        });
        return ok(res, null);
      }

      case 'updateUserRole': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const email = String(payload.email || '').trim().toLowerCase();
        const role = String(payload.role || '').trim().toUpperCase();
        if (!email) {
          return fail(res, 'INVALID_INPUT', 'Email is required');
        }
        if (!VALID_ROLES.includes(role)) {
          return fail(res, 'INVALID_INPUT', 'Role must be ADMIN, TEAM_LEAD, or EMPLOYEE');
        }
        if (email === user.email) {
          return fail(res, 'INVALID_INPUT', 'You cannot change your own role');
        }

        const { data: existing, error: existingError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) {
          return fail(res, 'USER_NOT_FOUND', 'User not found');
        }
        if (existing.role === role) {
          return ok(res, mapUser(existing));
        }
        if (existing.role === 'ADMIN' && role !== 'ADMIN') {
          const { count, error: countError } = await supabase
            .from('users')
            .select('email', { count: 'exact', head: true })
            .eq('role', 'ADMIN')
            .eq('active', true);
          if (countError) throw countError;
          if ((count || 0) <= 1) {
            return fail(res, 'LAST_ADMIN', 'Keep at least one admin');
          }
        }

        const { data, error } = await supabase
          .from('users')
          .update({ role })
          .eq('email', email)
          .select()
          .single();
        if (error) throw error;
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'USER_ROLE_CHANGED',
          entityType: 'user',
          entityId: email,
          summary: `${user.name} changed ${data.name} (${email}) from ${existing.role} to ${role}`,
        });
        return ok(res, mapUser(data));
      }

      case 'updateSettings': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const { error } = await supabase
          .from('settings')
          .update({
            lock_duration_minutes: payload.lockDurationMinutes,
            max_booking_duration_minutes: payload.maxBookingDurationMinutes,
            advance_booking_days: payload.advanceBookingDays,
          })
          .eq('id', 1);
        if (error) throw error;
        await writeAuditLog(supabase, {
          actorEmail: user.email,
          actorName: user.name,
          action: 'SETTINGS_UPDATED',
          entityType: 'settings',
          entityId: '1',
          summary: `${user.name} updated settings (lock ${payload.lockDurationMinutes} min, max ${payload.maxBookingDurationMinutes} min, advance ${payload.advanceBookingDays} days)`,
        });
        return ok(res, await getSettings(supabase));
      }

      case 'auditLogs': {
        if (!requireAdmin(user)) {
          return fail(res, 'UNAUTHORIZED', 'Admin access required');
        }
        const search = String(payload.search || '')
          .trim()
          .replace(/[%*,()]/g, ' ')
          .slice(0, 80);
        const cutoff = auditRetentionCutoff();
        await pruneAuditLogs(supabase);
        let query = supabase
          .from('audit_logs')
          .select('*')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(5000);
        if (search) {
          const term = `%${search}%`;
          query = query.or(
            `actor_email.ilike.${term},actor_name.ilike.${term},summary.ilike.${term},action.ilike.${term},entity_id.ilike.${term}`
          );
        }
        const { data, error } = await query;
        if (error && isMissingRelation(error)) {
          return ok(res, { logs: [], setupRequired: true });
        }
        if (error) throw error;
        return ok(res, { logs: (data || []).map(mapAuditLog), setupRequired: false });
      }

      default:
        return fail(res, 'INVALID_ACTION', 'Invalid action');
    }
  } catch (error) {
    console.error('Booking API error:', error);
    // LOW-2 fix: never leak infra/stack details to client
    return fail(res, 'SERVER_ERROR', 'Something went wrong. Please try again later.');
  }
}
