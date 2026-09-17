# Testing Guide

Comprehensive test scenarios to verify the Cabin Booking System works correctly.

## Test Environment Setup

### Prerequisites
1. Apps Script deployed and running
2. Google Sheet populated with test data
3. Frontend deployed or running locally
4. At least 3 test users with different roles:
   - `admin@company.com` (ADMIN)
   - `lead@company.com` (TEAM_LEAD)
   - `employee@company.com` (EMPLOYEE)

---

## Test Suite 1: Authentication & Authorization

### Test 1.1: User Authentication
**Objective**: Verify users can log in

**Steps**:
1. Open the application
2. Sign in with `employee@company.com`

**Expected**:
- ✅ User logs in successfully
- ✅ Dashboard loads
- ✅ User name appears in header
- ✅ User role displayed correctly

**Status**: [ ] Pass [ ] Fail

---

### Test 1.2: Inactive User Blocked
**Objective**: Verify inactive users cannot access the system

**Steps**:
1. In Users sheet, set `employee@company.com` active = FALSE
2. Try to log in with that account

**Expected**:
- ✅ Login succeeds but access is denied
- ✅ Message: "Your account is currently inactive"

**Cleanup**: Set active = TRUE

**Status**: [ ] Pass [ ] Fail

---

### Test 1.3: Unregistered User Blocked
**Objective**: Verify users not in the Users sheet cannot access

**Steps**:
1. Try to log in with an email NOT in the Users sheet

**Expected**:
- ✅ Error message: "User not found in system"

**Status**: [ ] Pass [ ] Fail

---

### Test 1.4: Role-Based Access Control
**Objective**: Verify employees cannot access admin features

**Steps**:
1. Log in as `employee@company.com`
2. Try to navigate to `/admin` directly

**Expected**:
- ✅ Redirected to dashboard
- ✅ "Admin" link not visible in navigation

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 2: Viewing Availability

### Test 2.1: View Dashboard
**Objective**: Verify dashboard displays cabins and availability

**Steps**:
1. Log in as any user
2. View the dashboard

**Expected**:
- ✅ Current date displayed
- ✅ All active cabins visible
- ✅ Time slots displayed (9:00 AM - 5:00 PM)
- ✅ Availability status clear (AVAILABLE, BOOKED, etc.)

**Status**: [ ] Pass [ ] Fail

---

### Test 2.2: Navigate Dates
**Objective**: Verify date navigation works

**Steps**:
1. On dashboard, click next day arrow (→)
2. Click previous day arrow (←)
3. Click "Today"

**Expected**:
- ✅ Date updates correctly
- ✅ Availability refreshes
- ✅ Cannot go to past dates
- ✅ "Today" button returns to current date

**Status**: [ ] Pass [ ] Fail

---

### Test 2.3: Auto-Refresh
**Objective**: Verify availability refreshes automatically

**Steps**:
1. Open dashboard
2. Wait 60 seconds
3. Observe network tab (should see API call)

**Expected**:
- ✅ Availability refreshes every 60 seconds
- ✅ No noticeable UI disruption

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 3: Booking Flow (Happy Path)

### Test 3.1: Create Simple Booking
**Objective**: Verify basic booking flow works

**Steps**:
1. Log in as `lead@company.com` (TEAM_LEAD)
2. Select tomorrow's date
3. Click an available time slot (e.g., 10:00)
4. Enter purpose: "Team Meeting"
5. Click "Continue"
6. Wait for countdown to appear
7. Click "Confirm Booking"

**Expected**:
- ✅ Booking modal opens
- ✅ Lock countdown starts (5:00)
- ✅ Countdown decreases every second
- ✅ Booking confirms successfully
- ✅ Slot now shows as "BOOKED"
- ✅ Booking appears in "My Bookings"

**Status**: [ ] Pass [ ] Fail

---

### Test 3.2: Cancel Lock Before Confirming
**Objective**: Verify lock can be cancelled

**Steps**:
1. Start booking process
2. After lock is created, click "Cancel"

**Expected**:
- ✅ Modal closes
- ✅ Slot returns to "AVAILABLE"
- ✅ Lock is removed from Locks sheet

**Status**: [ ] Pass [ ] Fail

---

### Test 3.3: Cancel Confirmed Booking
**Objective**: Verify bookings can be cancelled

**Steps**:
1. Create a booking for tomorrow
2. Go to "My Bookings"
3. Click "Cancel" on the booking
4. Confirm cancellation

**Expected**:
- ✅ Confirmation dialog appears
- ✅ Booking status changes to "CANCELLED"
- ✅ Slot becomes available again

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 4: Concurrent Booking Prevention

### Test 4.1: Simultaneous Same Slot
**Objective**: Verify two users cannot book the same slot

**Setup**: Open two browser windows

**Steps**:
1. Window 1: Log in as `lead1@company.com`
2. Window 2: Log in as `lead2@company.com`
3. Both: Select same date and time slot
4. Window 1: Create lock first
5. Window 2: Try to create lock

**Expected**:
- ✅ Window 1: Lock created successfully
- ✅ Window 2: Error "This time slot is currently being booked by another user"

**Status**: [ ] Pass [ ] Fail

---

### Test 4.2: Overlapping Time Slots
**Objective**: Verify overlapping bookings are prevented

**Steps**:
1. User A: Book 10:00-11:00
2. User B: Try to book 10:30-11:30

**Expected**:
- ✅ User A: Booking successful
- ✅ User B: Error "This time slot is already booked"

**Status**: [ ] Pass [ ] Fail

---

### Test 4.3: Adjacent Bookings
**Objective**: Verify adjacent bookings are allowed

**Steps**:
1. User A: Book 10:00-11:00
2. User B: Book 11:00-12:00

**Expected**:
- ✅ Both bookings succeed
- ✅ No overlap error

**Status**: [ ] Pass [ ] Fail

---

### Test 4.4: Lock Expiration
**Objective**: Verify locks expire after 5 minutes

**Steps**:
1. User A: Create lock for a time slot
2. Do NOT confirm booking
3. Wait 6 minutes
4. User B: Try to book the same slot

**Expected**:
- ✅ After 5 minutes, countdown reaches 0:00
- ✅ Modal shows expiration message
- ✅ Slot becomes available
- ✅ User B can successfully book

**Status**: [ ] Pass [ ] Fail

---

### Test 4.5: Lock Heartbeat
**Objective**: Verify heartbeat extends lock expiration

**Steps**:
1. Create lock
2. Keep booking modal open
3. Wait 2 minutes
4. Observe countdown (should refresh)

**Expected**:
- ✅ After ~1 minute, expiration extends
- ✅ Countdown resets to ~5:00
- ✅ Lock remains active

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 5: Validation Rules

### Test 5.1: Past Booking Prevented
**Objective**: Verify cannot book in the past

**Steps**:
1. Try to navigate to yesterday's date
2. Or manually try booking a past time today

**Expected**:
- ✅ Cannot select yesterday
- ✅ Past time slots are disabled/hidden

**Status**: [ ] Pass [ ] Fail

---

### Test 5.2: Maximum Duration Enforced
**Objective**: Verify booking duration limit

**Steps**:
1. Check Settings: max_booking_duration_minutes = 60
2. Try to book 10:00-12:00 (2 hours)

**Expected**:
- ✅ Error: "Maximum booking duration is 60 minutes"

**Status**: [ ] Pass [ ] Fail

---

### Test 5.3: Advance Booking Limit
**Objective**: Verify cannot book too far in advance

**Steps**:
1. Check Settings: advance_booking_days = 30
2. Try to book 31 days from now

**Expected**:
- ✅ Error: "Cannot book more than 30 days in advance"

**Status**: [ ] Pass [ ] Fail

---

### Test 5.4: Disabled Cabin
**Objective**: Verify disabled cabins cannot be booked

**Steps**:
1. Admin: Disable a cabin
2. Team Lead: Try to book that cabin

**Expected**:
- ✅ Cabin shows as "DISABLED"
- ✅ All slots are unclickable
- ✅ Cannot create booking

**Status**: [ ] Pass [ ] Fail

---

### Test 5.5: Empty Purpose Validation
**Objective**: Verify purpose is required

**Steps**:
1. Start booking process
2. Leave purpose field empty
3. Try to click "Continue"

**Expected**:
- ✅ Error: "Please enter a purpose for the booking"
- ✅ Cannot proceed without purpose

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 6: Admin Features

### Test 6.1: View All Bookings
**Objective**: Verify admin can see all bookings

**Steps**:
1. Log in as `admin@company.com`
2. Navigate to Admin → Bookings

**Expected**:
- ✅ All bookings visible (all users)
- ✅ Can filter by date, cabin, user, status
- ✅ Can cancel any booking

**Status**: [ ] Pass [ ] Fail

---

### Test 6.2: Manage Cabins
**Objective**: Verify admin can enable/disable cabins

**Steps**:
1. Admin Dashboard → Cabins
2. Click "Disable" on a cabin
3. Refresh page
4. Click "Enable" on the cabin

**Expected**:
- ✅ Status changes to INACTIVE
- ✅ Cabin unavailable for booking
- ✅ Re-enabling makes it active again

**Status**: [ ] Pass [ ] Fail

---

### Test 6.3: Manage Users
**Objective**: Verify admin can activate/deactivate users

**Steps**:
1. Admin Dashboard → Users
2. Click "Deactivate" on a user
3. That user tries to log in
4. Admin clicks "Activate"

**Expected**:
- ✅ User status changes to Inactive
- ✅ User cannot access system
- ✅ Reactivating restores access

**Status**: [ ] Pass [ ] Fail

---

### Test 6.4: Update Settings
**Objective**: Verify admin can change settings

**Steps**:
1. Admin Dashboard → Settings
2. Change lock_duration_minutes to 3
3. Save settings
4. Test creating a lock

**Expected**:
- ✅ Settings update successfully
- ✅ New locks expire in 3 minutes instead of 5
- ✅ Countdown reflects new duration

**Cleanup**: Reset to 5 minutes

**Status**: [ ] Pass [ ] Fail

---

### Test 6.5: View Dashboard Stats
**Objective**: Verify admin stats are accurate

**Steps**:
1. Note current stats
2. Create a booking
3. Refresh admin dashboard

**Expected**:
- ✅ Total Cabins count correct
- ✅ Available Today updates
- ✅ Today's Bookings increments
- ✅ Active Locks shows current locks

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 7: Edge Cases

### Test 7.1: Multiple Locks by Same User
**Objective**: Verify user can have multiple locks

**Steps**:
1. User A: Create lock for Cabin 1, 10:00-11:00
2. User A: Create lock for Cabin 2, 10:00-11:00

**Expected**:
- ✅ Both locks created successfully
- ✅ Different cabins don't interfere

**Status**: [ ] Pass [ ] Fail

---

### Test 7.2: Lock Another User's Lock
**Objective**: Verify cannot steal someone else's lock

**Steps**:
1. User A: Create lock
2. User B: Try to confirm User A's lock (would need lock ID)

**Expected**:
- ✅ Server rejects (UNAUTHORIZED)
- ✅ Only lock owner can confirm

**Status**: [ ] Pass [ ] Fail

---

### Test 7.3: Very Short Time Slot
**Objective**: Verify minimum booking duration

**Steps**:
1. Try to book 10:00-10:00 (0 duration)

**Expected**:
- ✅ Error: "End time must be after start time"

**Status**: [ ] Pass [ ] Fail

---

### Test 7.4: Network Interruption During Lock
**Objective**: Verify system handles network issues

**Steps**:
1. Create lock
2. Disconnect internet
3. Wait for lock to expire
4. Reconnect

**Expected**:
- ✅ Heartbeat fails gracefully
- ✅ Lock expires normally
- ✅ Slot becomes available

**Status**: [ ] Pass [ ] Fail

---

### Test 7.5: Refresh Page During Lock
**Objective**: Verify lock persists across refresh

**Steps**:
1. Create lock
2. Refresh the page
3. Navigate back to the same date/cabin

**Expected**:
- ✅ Lock is still active
- ✅ Shows as "LOCKED" to others
- ✅ Original user can see "LOCKED BY YOU"

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 8: Performance & Scalability

### Test 8.1: Load Time
**Objective**: Verify acceptable load times

**Steps**:
1. Clear cache
2. Load dashboard
3. Measure time

**Expected**:
- ✅ Initial load < 3 seconds
- ✅ API responses < 1 second
- ✅ No noticeable lag

**Status**: [ ] Pass [ ] Fail

---

### Test 8.2: Multiple Simultaneous Users
**Objective**: Verify system handles concurrent users

**Steps**:
1. Open 5+ browser sessions
2. Different users viewing same date
3. Create bookings simultaneously

**Expected**:
- ✅ All users see consistent data
- ✅ No conflicts or errors
- ✅ Locks work correctly

**Status**: [ ] Pass [ ] Fail

---

### Test 8.3: Many Bookings
**Objective**: Verify performance with data

**Steps**:
1. Create 50+ bookings (spread across dates)
2. View "My Bookings"
3. View Admin → All Bookings

**Expected**:
- ✅ Lists load without issues
- ✅ Filtering works correctly
- ✅ No performance degradation

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 9: Mobile Responsiveness

### Test 9.1: Mobile Dashboard
**Objective**: Verify mobile layout works

**Steps**:
1. Open on mobile device or resize browser to mobile width
2. View dashboard

**Expected**:
- ✅ Layout adapts to screen size
- ✅ All features accessible
- ✅ Touch targets adequate size
- ✅ No horizontal scrolling

**Status**: [ ] Pass [ ] Fail

---

### Test 9.2: Mobile Booking Flow
**Objective**: Verify booking works on mobile

**Steps**:
1. On mobile, create a booking
2. Complete entire flow

**Expected**:
- ✅ Modal fits screen
- ✅ Buttons easily clickable
- ✅ Keyboard doesn't obscure inputs
- ✅ Booking completes successfully

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 10: Optional Features

### Test 10.1: Calendar Integration
**Objective**: Verify calendar events are created (if enabled)

**Prerequisites**: CALENDAR_ENABLED = true

**Steps**:
1. Create a booking
2. Check Google Calendar

**Expected**:
- ✅ Calendar event created
- ✅ Correct date and time
- ✅ Event includes booking details

**Status**: [ ] Pass [ ] Fail [ ] N/A

---

### Test 10.2: Email Notifications
**Objective**: Verify emails are sent (if enabled)

**Prerequisites**: EMAIL_ENABLED = true

**Steps**:
1. Create a booking
2. Check email inbox

**Expected**:
- ✅ Confirmation email received
- ✅ Email includes booking details
- ✅ Cancel booking sends cancellation email

**Status**: [ ] Pass [ ] Fail [ ] N/A

---

## Test Summary

| Test Suite | Total Tests | Passed | Failed | N/A |
|------------|-------------|--------|--------|-----|
| 1. Authentication & Authorization | 4 | | | |
| 2. Viewing Availability | 3 | | | |
| 3. Booking Flow | 3 | | | |
| 4. Concurrent Prevention | 5 | | | |
| 5. Validation Rules | 5 | | | |
| 6. Admin Features | 5 | | | |
| 7. Edge Cases | 5 | | | |
| 8. Performance | 3 | | | |
| 9. Mobile | 2 | | | |
| 10. Optional Features | 2 | | | |
| **TOTAL** | **37** | | | |

---

## Critical Path Tests

These tests MUST pass before production deployment:

- [ ] Test 1.1: User Authentication
- [ ] Test 3.1: Create Simple Booking
- [ ] Test 4.1: Simultaneous Same Slot
- [ ] Test 4.2: Overlapping Time Slots
- [ ] Test 4.4: Lock Expiration
- [ ] Test 5.1: Past Booking Prevented
- [ ] Test 5.4: Disabled Cabin
- [ ] Test 6.1: View All Bookings

---

## Test Environment Checklist

Before testing:
- [ ] Apps Script deployed
- [ ] Frontend deployed or running locally
- [ ] Test users created (ADMIN, TEAM_LEAD, EMPLOYEE)
- [ ] Test cabins added
- [ ] Settings configured
- [ ] Browser console open (for debugging)
- [ ] Apps Script execution logs accessible

---

## Bug Reporting Template

When a test fails, document:

```
**Test ID**: [e.g., Test 4.1]
**Date**: [YYYY-MM-DD]
**Tester**: [Your name]
**Environment**: [Production / Staging / Local]
**Browser**: [Chrome 120 / Safari 17 / etc.]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots**:
[Attach if applicable]

**Console Errors**:
[Any errors from browser console]

**Apps Script Logs**:
[Any errors from Apps Script execution log]
```

---

**Test Cycle Date**: _________________

**Tested By**: _________________

**Overall Status**: [ ] PASS [ ] FAIL

**Notes**:
_________________
_________________
