# API Documentation

Complete API reference for the Cabin Booking System backend (Google Apps Script).

## Base URL

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## Authentication

All API requests require authentication via Google OAuth. The system automatically detects the authenticated user's email address using `Session.getActiveUser().getEmail()`.

**Requirements**:
- User must be signed in with a company Google account
- User's email must exist in the Users sheet
- User must be marked as active

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | User not authenticated or not authorized |
| `USER_NOT_FOUND` | User email not in Users sheet |
| `USER_INACTIVE` | User account is deactivated |
| `INSUFFICIENT_PERMISSIONS` | User role doesn't have required permissions |
| `CABIN_NOT_FOUND` | Cabin ID doesn't exist |
| `CABIN_DISABLED` | Cabin is marked as INACTIVE |
| `BOOKING_NOT_FOUND` | Booking ID doesn't exist |
| `LOCK_NOT_FOUND` | Lock ID doesn't exist or expired |
| `LOCK_EXPIRED` | Temporary lock has expired |
| `SLOT_BOOKED` | Time slot already has a booking |
| `SLOT_LOCKED` | Time slot is temporarily locked |
| `PAST_BOOKING` | Cannot book in the past |
| `ADVANCE_LIMIT_EXCEEDED` | Booking too far in advance |
| `DURATION_EXCEEDED` | Booking duration exceeds limit |
| `INVALID_INPUT` | Missing or invalid parameters |
| `SERVER_ERROR` | Internal server error |

---

## Public Endpoints

### Get Current User

**GET** `?action=currentUser`

Returns the authenticated user's information.

**Response**:
```json
{
  "success": true,
  "data": {
    "email": "user@company.com",
    "name": "John Smith",
    "employeeId": "EMP001",
    "department": "Sales",
    "role": "TEAM_LEAD",
    "active": true,
    "createdAt": "2026-09-17 10:00:00"
  }
}
```

**Possible Errors**:
- `USER_NOT_FOUND` - Email not in Users sheet
- `USER_INACTIVE` - Account is deactivated

---

### Get Cabins

**GET** `?action=cabins`

Returns all cabins (both active and inactive).

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "cabinId": "CABIN_abc123",
      "cabinName": "Cabin 01",
      "location": "1st Floor",
      "capacity": 4,
      "description": "Small meeting room",
      "status": "ACTIVE",
      "createdAt": "2026-09-17 10:00:00"
    }
  ]
}
```

---

### Get Bookings by Date

**GET** `?action=bookings&date=YYYY-MM-DD`

Returns all bookings for a specific date.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | String | Yes | Date in YYYY-MM-DD format |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "bookingId": "BOOKING_xyz789",
      "cabinId": "CABIN_abc123",
      "cabinName": "Cabin 01",
      "date": "2026-09-18",
      "startTime": "10:00",
      "endTime": "11:00",
      "bookedBy": "John Smith",
      "bookedByEmail": "john@company.com",
      "department": "Sales",
      "purpose": "Team meeting",
      "status": "BOOKED",
      "createdAt": "2026-09-17 14:30:00",
      "updatedAt": "2026-09-17 14:30:00"
    }
  ]
}
```

**Possible Errors**:
- `DATE_REQUIRED` - Date parameter missing

---

### Get Cabin Availability

**GET** `?action=availability&date=YYYY-MM-DD`

Returns detailed availability for all cabins on a specific date, including time slots, bookings, and locks.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | String | Yes | Date in YYYY-MM-DD format |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "cabin": {
        "cabinId": "CABIN_abc123",
        "cabinName": "Cabin 01",
        "location": "1st Floor",
        "capacity": 4,
        "description": "Small meeting room",
        "status": "ACTIVE",
        "createdAt": "2026-09-17 10:00:00"
      },
      "slots": [
        {
          "time": "09:00",
          "status": "AVAILABLE"
        },
        {
          "time": "10:00",
          "status": "BOOKED",
          "booking": {
            "bookingId": "BOOKING_xyz789",
            "bookedBy": "John Smith",
            "purpose": "Team meeting"
          }
        },
        {
          "time": "11:00",
          "status": "LOCKED",
          "lock": {
            "lockId": "LOCK_def456",
            "userEmail": "jane@company.com",
            "expiresAt": "2026-09-17 11:35:00"
          },
          "isOwnLock": false
        }
      ]
    }
  ]
}
```

**Slot Status Values**:
- `AVAILABLE` - Slot can be booked
- `BOOKED` - Slot has a confirmed booking
- `LOCKED` - Slot is temporarily locked by a user
- `DISABLED` - Cabin is inactive

---

### Get My Bookings

**GET** `?action=myBookings`

Returns all bookings created by the authenticated user.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "bookingId": "BOOKING_xyz789",
      "cabinId": "CABIN_abc123",
      "cabinName": "Cabin 01",
      "date": "2026-09-18",
      "startTime": "10:00",
      "endTime": "11:00",
      "bookedBy": "John Smith",
      "bookedByEmail": "john@company.com",
      "department": "Sales",
      "purpose": "Team meeting",
      "status": "BOOKED",
      "createdAt": "2026-09-17 14:30:00",
      "updatedAt": "2026-09-17 14:30:00"
    }
  ]
}
```

---

### Get Settings

**GET** `?action=settings`

Returns system configuration settings.

**Response**:
```json
{
  "success": true,
  "data": {
    "lockDurationMinutes": 5,
    "maxBookingDurationMinutes": 60,
    "advanceBookingDays": 30
  }
}
```

---

## Booking Endpoints

### Create Lock

**POST** `action=createLock`

Creates a temporary lock on a cabin time slot. This is the first step in the booking process.

**Required Role**: TEAM_LEAD or ADMIN

**Request Body**:
```json
{
  "action": "createLock",
  "cabinId": "CABIN_abc123",
  "date": "2026-09-18",
  "startTime": "10:00",
  "endTime": "11:00"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "lockId": "LOCK_def456",
    "expiresAt": "2026-09-17 14:35:00"
  }
}
```

**Possible Errors**:
- `INSUFFICIENT_PERMISSIONS` - User is not TEAM_LEAD or ADMIN
- `CABIN_NOT_FOUND` - Invalid cabin ID
- `CABIN_DISABLED` - Cabin is inactive
- `SLOT_BOOKED` - Time slot already booked
- `SLOT_LOCKED` - Time slot is temporarily locked
- `PAST_BOOKING` - Cannot book in the past
- `ADVANCE_LIMIT_EXCEEDED` - Beyond advance booking limit
- `DURATION_EXCEEDED` - Duration exceeds maximum
- `INVALID_DURATION` - End time before start time

**Notes**:
- Lock expires after `lockDurationMinutes` (default: 5 minutes)
- Uses `LockService` for atomic operation
- Prevents overlapping bookings and locks

---

### Refresh Lock

**POST** `action=refreshLock`

Extends the expiration time of an existing lock (heartbeat).

**Request Body**:
```json
{
  "action": "refreshLock",
  "lockId": "LOCK_def456"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "expiresAt": "2026-09-17 14:40:00"
  }
}
```

**Possible Errors**:
- `LOCK_NOT_FOUND` - Lock doesn't exist or expired
- `UNAUTHORIZED` - Lock belongs to another user
- `LOCK_EXPIRED` - Lock has already expired

**Notes**:
- Should be called every 60 seconds while user is on booking confirmation screen
- Extends expiration by `lockDurationMinutes`

---

### Confirm Booking

**POST** `action=confirmBooking`

Converts a temporary lock into a confirmed booking.

**Required Role**: TEAM_LEAD or ADMIN

**Request Body**:
```json
{
  "action": "confirmBooking",
  "lockId": "LOCK_def456",
  "purpose": "Team meeting to discuss Q3 goals"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "bookingId": "BOOKING_xyz789",
    "cabinId": "CABIN_abc123",
    "cabinName": "Cabin 01",
    "date": "2026-09-18",
    "startTime": "10:00",
    "endTime": "11:00",
    "bookedBy": "John Smith",
    "bookedByEmail": "john@company.com",
    "department": "Sales",
    "purpose": "Team meeting to discuss Q3 goals",
    "status": "BOOKED",
    "createdAt": "2026-09-17 14:35:00",
    "updatedAt": "2026-09-17 14:35:00"
  }
}
```

**Possible Errors**:
- `LOCK_NOT_FOUND` - Lock doesn't exist or expired
- `UNAUTHORIZED` - Lock belongs to another user
- `LOCK_EXPIRED` - Lock has expired
- `CABIN_UNAVAILABLE` - Cabin no longer available
- `SLOT_NO_LONGER_AVAILABLE` - Another booking was created

**Notes**:
- Uses `LockService` for atomic operation
- Performs final availability check
- Deletes the temporary lock upon success
- Optionally sends email and creates calendar event

---

### Cancel Lock

**POST** `action=cancelLock`

Cancels a temporary lock and releases the time slot.

**Request Body**:
```json
{
  "action": "cancelLock",
  "lockId": "LOCK_def456"
}
```

**Response**:
```json
{
  "success": true
}
```

**Possible Errors**:
- `UNAUTHORIZED` - Lock belongs to another user

**Notes**:
- Automatically called when user closes booking modal
- Lock is also automatically cleaned up when it expires

---

### Cancel Booking

**POST** `action=cancelBooking`

Cancels a confirmed booking.

**Request Body**:
```json
{
  "action": "cancelBooking",
  "bookingId": "BOOKING_xyz789"
}
```

**Response**:
```json
{
  "success": true
}
```

**Possible Errors**:
- `BOOKING_NOT_FOUND` - Invalid booking ID
- `ALREADY_CANCELLED` - Booking already cancelled
- `UNAUTHORIZED` - Can only cancel own bookings (unless ADMIN)
- `PAST_BOOKING` - Cannot cancel past bookings

**Authorization**:
- Users can cancel their own future bookings
- ADMINs can cancel any booking

---

## Admin Endpoints

All admin endpoints require the user to have `role = ADMIN`.

### Get All Bookings

**GET** `?action=allBookings&date=YYYY-MM-DD&cabinId=CABIN_abc&userEmail=user@company.com&status=BOOKED`

Returns all bookings with optional filters.

**Required Role**: ADMIN

**Parameters** (all optional):
| Parameter | Type | Description |
|-----------|------|-------------|
| date | String | Filter by date (YYYY-MM-DD) |
| cabinId | String | Filter by cabin |
| userEmail | String | Filter by user |
| status | String | Filter by status (BOOKED, CANCELLED, COMPLETED) |

**Response**:
```json
{
  "success": true,
  "data": [
    /* array of booking objects */
  ]
}
```

**Possible Errors**:
- `UNAUTHORIZED` - User is not ADMIN

---

### Get All Users

**GET** `?action=allUsers`

Returns all users in the system.

**Required Role**: ADMIN

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "email": "user@company.com",
      "name": "John Smith",
      "employeeId": "EMP001",
      "department": "Sales",
      "role": "TEAM_LEAD",
      "active": true,
      "createdAt": "2026-09-17 10:00:00"
    }
  ]
}
```

---

### Get Today Stats

**GET** `?action=todayStats`

Returns statistics for the current day.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalCabins": 5,
    "availableToday": 5,
    "todayBookings": 12,
    "activeLocks": 2
  }
}
```

---

### Get Active Locks Count

**GET** `?action=activeLocks`

Returns the number of currently active locks.

**Response**:
```json
{
  "success": true,
  "data": 2
}
```

---

### Update Cabin Status

**POST** `action=updateCabinStatus`

Enables or disables a cabin.

**Required Role**: ADMIN

**Request Body**:
```json
{
  "action": "updateCabinStatus",
  "cabinId": "CABIN_abc123",
  "status": "INACTIVE"
}
```

**Status Values**: `ACTIVE` or `INACTIVE`

**Response**:
```json
{
  "success": true
}
```

**Possible Errors**:
- `UNAUTHORIZED` - User is not ADMIN

---

### Update User Status

**POST** `action=updateUserStatus`

Activates or deactivates a user account.

**Required Role**: ADMIN

**Request Body**:
```json
{
  "action": "updateUserStatus",
  "email": "user@company.com",
  "active": false
}
```

**Response**:
```json
{
  "success": true
}
```

**Possible Errors**:
- `UNAUTHORIZED` - User is not ADMIN

---

### Update Settings

**POST** `action=updateSettings`

Updates system configuration settings.

**Required Role**: ADMIN

**Request Body**:
```json
{
  "action": "updateSettings",
  "lockDurationMinutes": 5,
  "maxBookingDurationMinutes": 60,
  "advanceBookingDays": 30
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "lockDurationMinutes": 5,
    "maxBookingDurationMinutes": 60,
    "advanceBookingDays": 30
  }
}
```

**Possible Errors**:
- `UNAUTHORIZED` - User is not ADMIN

---

## Rate Limits

Google Apps Script has the following quotas (for Workspace accounts):

- **URL Fetch calls per day**: 20,000
- **Script runtime**: 6 minutes per execution
- **Triggers total runtime**: 90 minutes per day
- **Simultaneous executions**: 30

The system uses `LockService` to handle concurrent requests, so multiple users can book simultaneously without issues.

---

## Best Practices

### Frontend Implementation

1. **Always handle errors gracefully**
   ```typescript
   try {
     const result = await apiCall();
   } catch (error) {
     // Show user-friendly error message
   }
   ```

2. **Implement retry logic for transient errors**
   ```typescript
   const retryableErrors = ['SERVER_ERROR', 'LOCK_FAILED'];
   if (retryableErrors.includes(error.code)) {
     // Retry after delay
   }
   ```

3. **Show loading states**
   - Display spinners during API calls
   - Disable buttons to prevent double-submission

4. **Validate input before API call**
   - Check required fields
   - Validate date/time format
   - Provide immediate feedback

5. **Refresh data after mutations**
   - After booking/cancelling, refresh availability
   - Update UI optimistically for better UX

### Security

1. **Never trust client-side data**
   - All validation must happen server-side
   - User role and permissions checked on server

2. **Use HTTPS only**
   - Apps Script Web Apps use HTTPS by default
   - Never deploy over HTTP

3. **Log security events**
   - Failed authorization attempts
   - Unusual booking patterns

---

## Troubleshooting

### "CORS Error" in Browser Console

Apps Script Web Apps handle CORS automatically. If you see CORS errors:
1. Check that the Web App is deployed correctly
2. Verify "Who has access" is set to "Anyone within organization"
3. Ensure the frontend is accessing the correct deployment URL

### "Unauthorized" Error

1. User must be signed in with company Google account
2. Email must exist in Users sheet (exact match)
3. User must be marked as active

### "Lock Failed" Error

This usually means high concurrent load. The system will:
1. Retry automatically
2. Show error to user if all retries fail
3. User can try booking again

### Slow API Responses

Google Sheets queries can slow down with large datasets:
1. Keep old bookings archived
2. Clean up expired locks regularly
3. Consider indexing strategies (though limited in Sheets)

---

## Changelog

### Version 1.0 (September 2026)
- Initial release
- User authentication and authorization
- Booking creation with temporary locks
- Lock heartbeat mechanism
- Admin dashboard
- Optional Calendar and Email integration

---

## Support

For API questions or issues:
1. Check Apps Script execution logs
2. Verify user permissions
3. Test with sample data
4. Review error codes above

**Apps Script Execution Log**:
Apps Script Editor → View → Executions

---

**Last Updated**: September 2026
