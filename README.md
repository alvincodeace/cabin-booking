# Cabin Booking System

A production-ready internal company cabin booking system for approximately 200 employees.

## Features

### Core Functionality
- **Role-based Access Control**: Three roles (ADMIN, TEAM_LEAD, EMPLOYEE)
- **Temporary Booking Locks**: 5-minute reservation system to prevent double-booking
- **Lock Heartbeat**: Automatic lock extension while booking is in progress
- **Atomic Operations**: Using Google Apps Script LockService for race-condition-free booking
- **Real-time Availability**: Automatic refresh and availability checking
- **Responsive Design**: Works on desktop and mobile devices

### User Capabilities

**EMPLOYEE**
- View cabin availability
- View booking details
- Read-only access

**TEAM_LEAD**
- All EMPLOYEE permissions
- Create bookings
- View their own bookings
- Cancel their own bookings

**ADMIN**
- All TEAM_LEAD permissions
- Cancel any booking
- Manage cabins (add, edit, enable/disable)
- Manage users (add, deactivate, change roles)
- Configure system settings
- View all bookings and statistics

### Key Technical Features
- **Overlap Detection**: Prevents conflicting bookings
- **Time Validation**: Cannot book in the past or beyond advance booking limit
- **Duration Limits**: Configurable maximum booking duration
- **Lock Expiration**: Automatic cleanup of expired locks
- **Optional Integrations**: Google Calendar and Email notifications

## Architecture

```
Employee / Team Lead
        ↓
React + TypeScript Frontend (Cloudflare Pages / Vercel)
        ↓
    HTTPS API
        ↓
Google Apps Script Web App
        ↓
   +----------------+
   |                |
   ↓                ↓
Google Sheets    Google Calendar
(Database)         (Optional)
```

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Responsive design

### Backend
- Google Apps Script
- Google Sheets (Database)
- LockService (Concurrency control)
- Optional: Google Calendar API
- Optional: Gmail API

## Project Structure

```
cabin-booking/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── appsScript.ts       # API layer
│   │   ├── components/
│   │   │   ├── BookingModal.tsx
│   │   │   ├── CabinCard.tsx
│   │   │   ├── BookingList.tsx
│   │   │   ├── LockCountdown.tsx
│   │   │   ├── Header.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MyBookings.tsx
│   │   │   └── Admin.tsx
│   │   ├── hooks/
│   │   │   └── useBookingLock.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── apps-script/
│   ├── Code.gs          # Main entry points (doGet, doPost)
│   ├── Config.gs        # Configuration and utilities
│   ├── User.gs          # User management
│   ├── Cabin.gs         # Cabin management
│   ├── Lock.gs          # Temporary lock mechanism
│   ├── Booking.gs       # Booking operations
│   ├── Calendar.gs      # Google Calendar integration
│   ├── Email.gs         # Email notifications
│   └── Setup.gs         # Database initialization
│
└── README.md
```

## Setup Instructions

### 1. Google Sheets Setup

1. **Create a new Google Spreadsheet**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet
   - Name it "Cabin Booking System"
   - Copy the Spreadsheet ID from the URL:
     ```
     https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
     ```

### 2. Google Apps Script Setup

1. **Open Apps Script Editor**
   - In your spreadsheet, go to: Extensions → Apps Script
   - This will open the Apps Script editor

2. **Create Script Files**
   - Delete the default `Code.gs` content
   - Create the following files (click + next to Files):
     - Code.gs
     - Config.gs
     - User.gs
     - Cabin.gs
     - Lock.gs
     - Booking.gs
     - Calendar.gs
     - Email.gs
     - Setup.gs

3. **Copy Code**
   - Copy the contents from each file in the `apps-script/` folder
   - Paste into the corresponding Apps Script files

4. **Configure Spreadsheet ID**
   - Open `Config.gs`
   - Replace `YOUR_SPREADSHEET_ID_HERE` with your actual Spreadsheet ID

5. **Run Setup Function**
   - Select `Setup.gs` in the editor
   - Select the `setupSpreadsheet` function from the dropdown
   - Click Run (▶️)
   - Grant permissions when prompted
   - This will create all required sheets with headers and sample data

6. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Click the gear icon ⚙️ next to "Select type"
   - Select "Web app"
   - Fill in the details:
     - **Description**: Cabin Booking API
     - **Execute as**: Me
     - **Who has access**: Anyone within your organization
   - Click "Deploy"
   - Copy the Web App URL (this is your API endpoint)
   - Click "Done"

### 3. Configure Users

1. Open the "Users" sheet in your spreadsheet
2. Replace the sample users with your actual company users:
   - Add your company email addresses
   - Set appropriate roles (ADMIN, TEAM_LEAD, EMPLOYEE)
   - Mark users as active (TRUE) or inactive (FALSE)

Example:
```
email                   | name          | employee_id | department | role       | active | created_at
admin@company.com       | Admin User    | EMP001      | IT         | ADMIN      | TRUE   | 2026-09-17 10:00:00
john@company.com        | John Smith    | EMP002      | Sales      | TEAM_LEAD  | TRUE   | 2026-09-17 10:00:00
sarah@company.com       | Sarah Johnson | EMP003      | HR         | EMPLOYEE   | TRUE   | 2026-09-17 10:00:00
```

### 4. Configure Cabins

1. Open the "Cabins" sheet
2. Update or add your company's actual cabins:
   - cabin_name: Display name (e.g., "Cabin 01")
   - location: Physical location (e.g., "1st Floor")
   - capacity: Number of people
   - description: Brief description
   - status: ACTIVE or INACTIVE

### 5. Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your Apps Script Web App URL:
     ```
     VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
     ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   - Open http://localhost:5173 in your browser
   - Sign in with a Google account that's in your Users sheet

4. **Build for Production**
   ```bash
   npm run build
   ```
   - This creates a `dist` folder with optimized production files

### 6. Deploy Frontend

#### Option A: Cloudflare Pages

1. Push your code to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
3. Navigate to Pages → Create a project
4. Connect your GitHub repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
6. Add environment variable:
   - **Variable name**: `VITE_APPS_SCRIPT_URL`
   - **Value**: Your Apps Script Web App URL
7. Click "Save and Deploy"

#### Option B: Vercel

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add environment variable:
   - **Name**: `VITE_APPS_SCRIPT_URL`
   - **Value**: Your Apps Script Web App URL
7. Click "Deploy"

### 7. Optional: Enable Google Calendar Integration

1. Open `Calendar.gs` in Apps Script
2. Change `CALENDAR_ENABLED` from `false` to `true`
3. Update `CALENDAR_ID` if you want to use a specific calendar
4. Save and deploy a new version

### 8. Optional: Enable Email Notifications

1. Open `Email.gs` in Apps Script
2. Change `EMAIL_ENABLED` from `false` to `true`
3. Save and deploy a new version

## How It Works

### Booking Flow

1. **User selects an available time slot**
   - Frontend shows real-time availability
   - Only TEAM_LEAD and ADMIN can book

2. **User enters booking details**
   - Cabin, date, time, and purpose
   - Clicks "Continue"

3. **Temporary lock is created**
   - Apps Script acquires LockService lock
   - Checks for conflicts
   - Creates 5-minute temporary lock
   - Returns lock ID and expiration time

4. **Lock countdown begins**
   - Frontend shows countdown timer
   - Heartbeat sends refresh requests every 60 seconds
   - Lock expiration extends by 5 minutes on each heartbeat

5. **User confirms booking**
   - Frontend sends confirmation request with lock ID
   - Apps Script:
     - Acquires LockService lock again
     - Verifies lock ownership and validity
     - Checks conflicts one final time
     - Creates booking atomically
     - Deletes temporary lock
     - Optionally creates calendar event and sends email

### Preventing Double-Booking

The system uses multiple layers to prevent double-booking:

1. **Temporary Locks**: 5-minute reservation while user is booking
2. **LockService**: Google Apps Script atomic locks
3. **Final Validation**: Re-check availability before confirming
4. **Overlap Detection**: Mathematical time overlap validation

Example scenario:
```
User A: Selects 10:00-11:00 → Lock created
User B: Tries to select 10:00-11:00 → Rejected (locked)
User B: Tries to select 10:30-11:30 → Rejected (overlaps lock)
User A: Confirms booking → Booking created, lock deleted
User B: Can now see 10:00-11:00 as "BOOKED"
```

## System Settings

Configurable via Admin Dashboard → Settings:

- **Lock Duration**: How long a cabin is reserved during booking (default: 5 minutes)
- **Maximum Booking Duration**: Maximum time for a single booking (default: 60 minutes)
- **Advance Booking Days**: How far in advance bookings can be made (default: 30 days)

## Database Schema

### Users Sheet
| Column | Type | Description |
|--------|------|-------------|
| email | String | User's email (Primary Key) |
| name | String | Display name |
| employee_id | String | Employee ID |
| department | String | Department name |
| role | Enum | ADMIN, TEAM_LEAD, or EMPLOYEE |
| active | Boolean | Account status |
| created_at | DateTime | Creation timestamp |

### Cabins Sheet
| Column | Type | Description |
|--------|------|-------------|
| cabin_id | String | Unique cabin ID (Primary Key) |
| cabin_name | String | Display name |
| location | String | Physical location |
| capacity | Number | Number of people |
| description | String | Brief description |
| status | Enum | ACTIVE or INACTIVE |
| created_at | DateTime | Creation timestamp |

### Bookings Sheet
| Column | Type | Description |
|--------|------|-------------|
| booking_id | String | Unique booking ID (Primary Key) |
| cabin_id | String | Foreign key to Cabins |
| cabin_name | String | Cached cabin name |
| date | Date | Booking date |
| start_time | Time | Start time |
| end_time | Time | End time |
| booked_by | String | User's name |
| booked_by_email | String | User's email |
| department | String | User's department |
| purpose | String | Booking purpose |
| status | Enum | BOOKED, CANCELLED, or COMPLETED |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Locks Sheet
| Column | Type | Description |
|--------|------|-------------|
| lock_id | String | Unique lock ID (Primary Key) |
| cabin_id | String | Foreign key to Cabins |
| date | Date | Booking date |
| start_time | Time | Start time |
| end_time | Time | End time |
| user_email | String | User who created lock |
| created_at | DateTime | Creation timestamp |
| expires_at | DateTime | Expiration timestamp |

### Settings Sheet
| Column | Type | Description |
|--------|------|-------------|
| setting | String | Setting name (Primary Key) |
| value | Number | Setting value |

## Security

### Authentication
- Uses Google OAuth via `Session.getActiveUser().getEmail()`
- All API requests require authenticated Google account
- Email must exist in Users sheet
- Account must be active

### Authorization
- Role-based access control enforced server-side
- Frontend role checks are for UX only
- All operations validated in Apps Script
- Lock ownership verified before operations

### Data Protection
- Google Sheet is private (not public)
- No credentials in frontend code
- Environment variables for configuration
- Apps Script runs with user's permissions

## Testing Scenarios

### Test 1: Simultaneous Booking
- **Setup**: Two users try to book the same slot at the same time
- **Expected**: Only one succeeds, the other gets an error
- **How to test**: Open two browser windows, log in as different users, try to book simultaneously

### Test 2: Overlapping Time
- **Setup**: User A locks 10:00-11:00, User B tries 10:30-11:30
- **Expected**: User B is rejected
- **How to test**: Create a lock, try to book overlapping time

### Test 3: Adjacent Bookings
- **Setup**: User A books 10:00-11:00, User B books 11:00-12:00
- **Expected**: Both succeed
- **How to test**: Book consecutive time slots

### Test 4: Lock Expiration
- **Setup**: User creates lock but doesn't confirm for 6 minutes
- **Expected**: Lock expires, slot becomes available
- **How to test**: Create lock, wait 6 minutes, try to book the same slot

### Test 5: Unauthorized Access
- **Setup**: Regular employee tries to create booking
- **Expected**: Rejected server-side
- **How to test**: Log in as EMPLOYEE, try to book (should not have option)

### Test 6: Past Booking
- **Setup**: Try to book a time that has already passed
- **Expected**: Rejected
- **How to test**: Try to book yesterday's date

### Test 7: Disabled Cabin
- **Setup**: Admin disables a cabin, team lead tries to book it
- **Expected**: Rejected
- **How to test**: Disable cabin in admin panel, try to book

## Troubleshooting

### "User not found in system"
- Ensure the user's email exists in the Users sheet
- Check that email matches exactly (including domain)
- Verify user is marked as active (TRUE)

### "Failed to authenticate"
- Check that Apps Script is deployed with "Execute as: Me"
- Verify "Who has access" is set to "Anyone within your organization"
- Try redeploying the Apps Script

### API calls failing
- Verify VITE_APPS_SCRIPT_URL is correct in .env
- Check Apps Script execution logs (View → Logs)
- Ensure user has permissions to access the spreadsheet

### Bookings not preventing conflicts
- Verify LockService is working (check Apps Script logs)
- Ensure all validation logic is in place
- Check that time overlap function is correct

### Calendar events not creating
- Set CALENDAR_ENABLED = true in Calendar.gs
- Deploy new version of Apps Script
- Check Apps Script permissions for Calendar access

## Maintenance

### Adding Users
- Manually add to Users sheet, or
- Create an admin UI to add users via API

### Adding Cabins
- Use Admin Dashboard, or
- Manually add to Cabins sheet

### Monitoring
- Check Apps Script execution logs regularly
- Monitor Locks sheet for stuck locks
- Review Bookings sheet for patterns

### Cleanup
- Expired locks are automatically cleaned up
- Old bookings can be archived or marked as COMPLETED
- Keep Settings sheet values reasonable

## Support

For issues or questions:
1. Check the Apps Script logs (View → Logs in Apps Script editor)
2. Verify spreadsheet data integrity
3. Test with sample users and cabins
4. Review error messages in browser console

## License

Internal company use only. Not for public distribution.
