# Information this app collects

Cabin Booking stores only what it needs to sign people in, book cabins, notify attendees, and let admins manage rooms and users.

Sign-in is Google. Data is stored in Supabase. Slack is used only for alerts and optional user import.

---

## Sign-in (Google)

When someone clicks **Continue with Google**, the app receives:

| Field | Why |
| --- | --- |
| Work email | Identify the person. Must already exist in Users. |
| Display name | Keep the user record in sync if Google has a name |

The Google access token is kept in the browser (`localStorage`) so API calls stay signed in. It is sent to the booking API to verify the account. The app does not store Google passwords or a Google refresh token.

People who are not in the Users list cannot sign in, even with a valid Google account.

---

## Users (admin or Slack import)

A user record is created by an admin (form, CSV, or **Import from Slack**) or automatically when someone joins Slack.

| Field | Required | Notes |
| --- | --- | --- |
| Email | Yes | Work email |
| Name | Yes | From admin, CSV, Slack, or derived from the email |
| Department | No | Optional |
| Employee ID | No | Optional (CSV / API) |
| Role | Yes | `EMPLOYEE`, `TEAM_LEAD`, or `ADMIN` |
| Active | Yes | Inactive users cannot sign in |
| Created at | Yes | Set by the system |

Slack import copies **email** and **name** from the Slack profile. Bots and guests are skipped.

---

## Cabins (admin)

| Field | Notes |
| --- | --- |
| Name | e.g. Cabin 01 |
| Location | e.g. 1st Floor |
| Capacity | Number of people |
| Description | Optional |
| Status | Active or inactive |

---

## Bookings

When someone books a cabin, the app stores:

| Field | Notes |
| --- | --- |
| Cabin | Which room |
| Date | Calendar date (Asia/Kolkata) |
| Start and end time | 30-minute slots, 9:00–19:00 |
| Booked by | Name and email of the organizer |
| Department | Copied from the organizer’s user record |
| Purpose | Text the organizer types (meeting reason) |
| Members | People added by search (email + name) |
| Status | Booked or cancelled |
| Created / updated time | Set by the system |

Cancelled bookings are kept. They appear in Admin → Bookings and in CSV export.

CSV export includes: booking id, cabin, date, times, organizer name and email, department, purpose, member names, status, created at, updated at.

---

## While a booking is being confirmed

For a few minutes the slot is **held** so two people cannot take it at once:

| Field | Notes |
| --- | --- |
| Cabin, date, start, end | The held slot |
| User email | Who is holding it |
| Expires at | Hold ends after the lock duration (default 5 minutes) |

Holds are deleted when the booking is confirmed, cancelled, or expired.

---

## In-app notifications

If members are added to a booking (and the notifications table exists):

| Field | Notes |
| --- | --- |
| Recipient email | Who should see it |
| Type | Invite or cancellation |
| Title and message | Cabin, time, purpose / who cancelled |
| Read | Whether they opened the bell |

---

## Slack

If `SLACK_BOT_TOKEN` is set, the app may:

- Look up a Slack user **by work email**
- Send a **direct message** about a new or cancelled booking (cabin, date, time, organizer, purpose)

If Slack events are configured, joining Slack can create a user from Slack **email** and **name**.

The app does not post booking details to a Slack channel.

---

## Stored in the browser

| Item | Purpose |
| --- | --- |
| Google access token | Stay signed in |

No booking history is stored only in the browser; it lives in the database.

---

## What this app does not take

- Passwords
- Phone numbers
- Home address
- Payment or card details
- Calendar contents (other than cabin bookings created here)
- Files or photos
- Location / GPS
- Analytics or advertising cookies beyond normal hosting

---

## Who can see what

| Role | Access |
| --- | --- |
| Employee / Team lead | Own bookings, cabins, people they add to a meeting |
| Admin | All users, cabins, all bookings (including cancelled), export, settings, activity log |

---

## Activity log (admin)

Successful actions are stored so admins can see who did what:

| Field | Notes |
| --- | --- |
| When | Timestamp (Asia/Kolkata in the Admin screen) |
| Who | Name and email of the person (or Slack for auto-add) |
| Action | Book, cancel, cabin/user/settings change |
| Details | Cabin, time, target user, or what changed |

View it in **Admin → Activity**. Events from the last 7 days are listed. Older rows are deleted automatically. A week of cabin activity is typically well under 1 MB.

Only admins can read this list. Failed attempts are not stored.

---

Server access to the database uses a Supabase service key on Vercel. The browser never receives that key.
