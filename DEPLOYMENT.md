# Deployment Guide

Step-by-step instructions to deploy the Cabin Booking System.

## Prerequisites

- Google Workspace account (company Google account)
- GitHub account (for hosting code)
- Cloudflare or Vercel account (for frontend hosting)
- Node.js 18+ and npm installed locally

## Phase 1: Google Sheets & Apps Script Setup

### Step 1.1: Create Google Spreadsheet

1. Open [Google Sheets](https://sheets.google.com)
2. Click "Blank" to create a new spreadsheet
3. Rename it to: **Cabin Booking System**
4. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
   Example: `1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4`

### Step 1.2: Open Apps Script Editor

1. In your spreadsheet, click: **Extensions → Apps Script**
2. A new tab will open with the Apps Script editor
3. You'll see a default `Code.gs` file

### Step 1.3: Create All Script Files

1. Delete all content in the default `Code.gs`
2. Create additional files by clicking the **+** button next to **Files**
3. Create these files (one by one):
   - Code.gs (already exists)
   - Config.gs
   - User.gs
   - Cabin.gs
   - Lock.gs
   - Booking.gs
   - Calendar.gs
   - Email.gs
   - Setup.gs

### Step 1.4: Copy Script Code

For each file, copy the contents from the `apps-script/` folder:

1. Open `apps-script/Code.gs` from the project
2. Copy all contents
3. Paste into `Code.gs` in Apps Script editor
4. Click **Save** (💾 icon or Ctrl+S)
5. Repeat for all other files

### Step 1.5: Configure Spreadsheet ID

1. Open `Config.gs` in the Apps Script editor
2. Find this line:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
3. Replace with your actual Spreadsheet ID from Step 1.1
4. Save the file

### Step 1.6: Run Setup Function

1. At the top of the editor, select **Setup.gs** from the file dropdown
2. Select the function: **setupSpreadsheet** from the function dropdown
3. Click **Run** (▶️ button)
4. First time: A dialog will appear asking for permissions
   - Click **Review Permissions**
   - Choose your Google account
   - Click **Advanced**
   - Click **Go to Cabin Booking System (unsafe)** 
     *(It's safe - you wrote this code)*
   - Click **Allow**
5. Wait for execution to complete (check the Execution log)
6. You should see: "Execution completed"
7. Return to your spreadsheet - you'll see 5 new sheets created:
   - Users
   - Cabins
   - Bookings
   - Locks
   - Settings

### Step 1.7: Deploy Apps Script as Web App

1. In Apps Script editor, click **Deploy → New deployment**
2. Click the gear icon (⚙️) next to "Select type"
3. Select **Web app**
4. Configure settings:
   - **Description**: `Cabin Booking API v1`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone within Company Name`
     *(Replace "Company Name" with your organization)*
5. Click **Deploy**
6. Copy the **Web App URL** - it looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
7. **SAVE THIS URL** - you'll need it for the frontend
8. Click **Done**

### Step 1.8: Configure Users

1. Go back to your spreadsheet
2. Open the **Users** sheet
3. Delete the sample users (rows 2-4)
4. Add your company's actual users:

Example:
| email | name | employee_id | department | role | active | created_at |
|-------|------|-------------|------------|------|--------|------------|
| admin@yourcompany.com | Admin Name | EMP001 | IT | ADMIN | TRUE | 2026-09-17 10:00:00 |
| lead@yourcompany.com | Lead Name | EMP002 | Sales | TEAM_LEAD | TRUE | 2026-09-17 10:00:00 |
| emp@yourcompany.com | Employee Name | EMP003 | HR | EMPLOYEE | TRUE | 2026-09-17 10:00:00 |

**Important**: 
- Email must match users' Google Workspace email
- Use current timestamp for created_at
- Ensure at least one ADMIN user

### Step 1.9: Configure Cabins

1. Open the **Cabins** sheet
2. Update the sample cabins or add your own:

Example:
| cabin_id | cabin_name | location | capacity | description | status | created_at |
|----------|------------|----------|----------|-------------|--------|------------|
| CABIN_abc123 | Meeting Room A | 1st Floor East | 4 | Small room with TV | ACTIVE | 2026-09-17 10:00:00 |
| CABIN_def456 | Meeting Room B | 2nd Floor West | 8 | Large room with projector | ACTIVE | 2026-09-17 10:00:00 |

---

## Phase 2: Frontend Setup & Local Testing

### Step 2.1: Clone or Download Project

```bash
# If using Git
git clone <your-repo-url>
cd cabin-booking

# Or download ZIP and extract
```

### Step 2.2: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2.3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:
   ```bash
   nano .env
   # or use any text editor
   ```

3. Update with your Apps Script URL from Step 1.7:
   ```
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ACTUAL_ID/exec
   ```

4. Save the file

### Step 2.4: Test Locally

1. Start development server:
   ```bash
   npm run dev
   ```

2. Open browser: http://localhost:5173

3. Sign in with a Google account that's in your Users sheet

4. Test the following:
   - ✅ Dashboard loads
   - ✅ Can see cabins
   - ✅ Can view availability
   - ✅ (If TEAM_LEAD or ADMIN) Can create booking
   - ✅ Can view My Bookings
   - ✅ (If ADMIN) Can access Admin Dashboard

5. If everything works, proceed to deployment

---

## Phase 3: Frontend Deployment

Choose either Cloudflare Pages (Option A) or Vercel (Option B).

### Option A: Deploy to Cloudflare Pages

#### A.1: Push Code to GitHub

```bash
# Initialize git (if not already done)
cd /path/to/cabin-booking
git init
git add .
git commit -m "Initial commit: Cabin Booking System"

# Create GitHub repository and push
git remote add origin https://github.com/your-username/cabin-booking.git
git branch -M main
git push -u origin main
```

#### A.2: Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: **Workers & Pages → Create application**
3. Click **Pages → Connect to Git**
4. Choose **GitHub** and authorize
5. Select your repository: `cabin-booking`
6. Configure build settings:
   - **Project name**: `cabin-booking`
   - **Production branch**: `main`
   - **Framework preset**: None (we'll configure manually)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`

#### A.3: Add Environment Variable

1. Click **Environment variables (advanced)**
2. Add variable:
   - **Variable name**: `VITE_APPS_SCRIPT_URL`
   - **Value**: Your Apps Script URL from Step 1.7
3. Select **Production** environment

#### A.4: Deploy

1. Click **Save and Deploy**
2. Wait for build to complete (2-3 minutes)
3. You'll get a URL like: `https://cabin-booking.pages.dev`
4. Click the URL to test
5. Sign in and verify everything works

#### A.5: Custom Domain (Optional)

1. In Cloudflare Pages, click **Custom domains**
2. Add your domain: `booking.yourcompany.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation (5-10 minutes)

---

### Option B: Deploy to Vercel

#### B.1: Push Code to GitHub

```bash
# Initialize git (if not already done)
cd /path/to/cabin-booking
git init
git add .
git commit -m "Initial commit: Cabin Booking System"

# Create GitHub repository and push
git remote add origin https://github.com/your-username/cabin-booking.git
git branch -M main
git push -u origin main
```

#### B.2: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **Add New → Project**
3. Import your GitHub repository
4. Configure project:
   - **Project Name**: `cabin-booking`
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### B.3: Add Environment Variable

1. Expand **Environment Variables**
2. Add:
   - **Name**: `VITE_APPS_SCRIPT_URL`
   - **Value**: Your Apps Script URL from Step 1.7
3. Select all environments (Production, Preview, Development)

#### B.4: Deploy

1. Click **Deploy**
2. Wait for build (2-3 minutes)
3. You'll get a URL like: `https://cabin-booking.vercel.app`
4. Click **Visit** to test
5. Sign in and verify everything works

#### B.5: Custom Domain (Optional)

1. In Vercel project, go to **Settings → Domains**
2. Add domain: `booking.yourcompany.com`
3. Configure DNS as instructed
4. Wait for DNS propagation

---

## Phase 4: Post-Deployment

### Step 4.1: Test Production

1. Open your deployed URL
2. Test with multiple user roles:
   - EMPLOYEE: Can view only
   - TEAM_LEAD: Can book
   - ADMIN: Full access
3. Test booking flow:
   - Create lock
   - See countdown
   - Confirm booking
   - View in "My Bookings"
   - Cancel booking

### Step 4.2: Test Concurrent Booking

1. Open two browser windows (or use incognito)
2. Sign in as two different TEAM_LEAD users
3. Try to book the same time slot simultaneously
4. **Expected**: Only one succeeds

### Step 4.3: Enable Optional Features (If Needed)

#### Enable Google Calendar Integration

1. Open Apps Script editor
2. Open `Calendar.gs`
3. Change: `const CALENDAR_ENABLED = true;`
4. (Optional) Update `CALENDAR_ID` if using specific calendar
5. Save
6. Deploy new version:
   - **Deploy → Manage deployments**
   - Click **Edit** (pencil icon) on your deployment
   - **Version**: New version
   - **Description**: `Enable Calendar integration`
   - Click **Deploy**

#### Enable Email Notifications

1. Open Apps Script editor
2. Open `Email.gs`
3. Change: `const EMAIL_ENABLED = true;`
4. Save
5. Deploy new version (same as above)

### Step 4.4: Monitor & Maintain

**Check Apps Script Logs:**
1. Apps Script editor → **Executions**
2. View recent executions
3. Check for errors

**Monitor Locks Sheet:**
1. Occasionally check if locks are expiring properly
2. If you see many stuck locks, investigate

**Backup Spreadsheet:**
1. Regularly: **File → Make a copy**
2. Store backup safely

---

## Rollback Procedure

If something goes wrong:

### Rollback Apps Script

1. Apps Script editor → **Deploy → Manage deployments**
2. Click **Edit** on your deployment
3. Change **Version** to a previous version
4. Click **Deploy**

### Rollback Frontend

**Cloudflare:**
1. Pages → Your project → Deployments
2. Find previous deployment
3. Click **...** → **Rollback to this deployment**

**Vercel:**
1. Project → Deployments
2. Find previous deployment
3. Click **...** → **Promote to Production**

---

## Troubleshooting

### "User not found in system"
- ✅ Check Users sheet - email must match exactly
- ✅ Ensure user is marked as active (TRUE)

### API calls return errors
- ✅ Check Apps Script deployment status
- ✅ Verify VITE_APPS_SCRIPT_URL is correct
- ✅ Check Apps Script logs for errors
- ✅ Ensure "Who has access" is set correctly

### Calendar events not creating
- ✅ Verify CALENDAR_ENABLED = true
- ✅ Check Apps Script has Calendar permissions
- ✅ Redeploy Apps Script

### Frontend not loading
- ✅ Check browser console for errors
- ✅ Verify build completed successfully
- ✅ Check environment variables are set

---

## Security Checklist

- [ ] Google Sheet is private (not public)
- [ ] Apps Script deployed with "Execute as: Me"
- [ ] Apps Script access: "Anyone within organization" (not "Anyone")
- [ ] All users in Users sheet have company email addresses
- [ ] Environment variables not committed to Git
- [ ] Frontend deployed with HTTPS
- [ ] Test unauthorized access (employee trying to book)

---

## Next Steps

1. ✅ Share the production URL with your team
2. ✅ Create documentation for end users
3. ✅ Set up monitoring/alerting if needed
4. ✅ Schedule regular backups
5. ✅ Plan for scaling (if user base grows significantly)

---

## Support Contacts

- **Technical Issues**: [Your IT contact]
- **Access Issues**: [Your admin contact]
- **Feature Requests**: [Your product owner]

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Production URL**: _________________

**Notes**:
_________________
_________________
_________________
