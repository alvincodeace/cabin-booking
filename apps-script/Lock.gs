/**
 * Booking Lock Management Functions
 * 
 * This is the critical component for preventing double-bookings.
 * Uses LockService for atomic operations.
 */

function createBookingLock(cabinId, date, startTime, endTime, userEmail) {
  // Acquire script lock for atomic operation
  const lock = LockService.getScriptLock();
  
  try {
    // Wait up to 30 seconds for the lock
    lock.waitLock(30000);
    
    // Validate inputs
    if (!cabinId || !date || !startTime || !endTime) {
      return {
        success: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'Missing required parameters'
      };
    }
    
    // Validate cabin exists and is active
    const cabin = getCabinById(cabinId);
    if (!cabin) {
      return {
        success: false,
        errorCode: 'CABIN_NOT_FOUND',
        errorMessage: 'Cabin not found'
      };
    }
    
    if (cabin.status !== 'ACTIVE') {
      return {
        success: false,
        errorCode: 'CABIN_DISABLED',
        errorMessage: 'This cabin is currently disabled'
      };
    }
    
    // Validate date/time
    const validationResult = validateBookingDateTime(date, startTime, endTime);
    if (!validationResult.valid) {
      return {
        success: false,
        errorCode: validationResult.errorCode,
        errorMessage: validationResult.errorMessage
      };
    }
    
    // Clean up expired locks
    cleanupExpiredLocks();
    
    // Check for overlapping bookings
    const existingBookings = getBookingsByCabin(cabinId, date);
    for (let booking of existingBookings) {
      if (booking.status === 'BOOKED' && 
          doTimesOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
        return {
          success: false,
          errorCode: 'SLOT_BOOKED',
          errorMessage: 'This time slot is already booked'
        };
      }
    }
    
    // Check for overlapping active locks
    const existingLocks = getActiveLocksByCabin(cabinId, date);
    for (let lock of existingLocks) {
      if (doTimesOverlap(startTime, endTime, lock.startTime, lock.endTime)) {
        return {
          success: false,
          errorCode: 'SLOT_LOCKED',
          errorMessage: 'This time slot is currently being booked by another user'
        };
      }
    }
    
    // Create the lock
    const settings = getSettings();
    const lockId = generateId('LOCK');
    const now = getCurrentTime();
    const expiresAt = new Date(now.getTime() + settings.lockDurationMinutes * 60000);
    
    const sheet = getSheet(SHEET_NAMES.LOCKS);
    sheet.appendRow([
      lockId,
      cabinId,
      date,
      startTime,
      endTime,
      userEmail,
      formatDateTime(now),
      formatDateTime(expiresAt)
    ]);
    
    return {
      success: true,
      data: {
        lockId: lockId,
        expiresAt: formatDateTime(expiresAt)
      }
    };
    
  } catch (error) {
    Logger.log('createBookingLock error: ' + error.toString());
    return {
      success: false,
      errorCode: 'LOCK_FAILED',
      errorMessage: 'Failed to acquire lock: ' + error.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

function refreshBookingLock(lockId, userEmail) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const sheet = getSheet(SHEET_NAMES.LOCKS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === lockId) {
        // Verify lock belongs to user
        if (data[i][5] !== userEmail) {
          return {
            success: false,
            errorCode: 'UNAUTHORIZED',
            errorMessage: 'This lock belongs to another user'
          };
        }
        
        // Check if expired
        const expiresAt = new Date(data[i][7]);
        if (expiresAt < getCurrentTime()) {
          return {
            success: false,
            errorCode: 'LOCK_EXPIRED',
            errorMessage: 'Lock has expired'
          };
        }
        
        // Extend expiration
        const settings = getSettings();
        const newExpiresAt = new Date(getCurrentTime().getTime() + settings.lockDurationMinutes * 60000);
        sheet.getRange(i + 1, 8).setValue(formatDateTime(newExpiresAt));
        
        return {
          success: true,
          data: {
            expiresAt: formatDateTime(newExpiresAt)
          }
        };
      }
    }
    
    return {
      success: false,
      errorCode: 'LOCK_NOT_FOUND',
      errorMessage: 'Lock not found'
    };
    
  } catch (error) {
    Logger.log('refreshBookingLock error: ' + error.toString());
    return {
      success: false,
      errorCode: 'REFRESH_FAILED',
      errorMessage: error.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

function releaseBookingLock(lockId, userEmail) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const sheet = getSheet(SHEET_NAMES.LOCKS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === lockId) {
        // Verify lock belongs to user
        if (data[i][5] !== userEmail) {
          return {
            success: false,
            errorCode: 'UNAUTHORIZED',
            errorMessage: 'This lock belongs to another user'
          };
        }
        
        // Delete the lock row
        sheet.deleteRow(i + 1);
        
        return {
          success: true
        };
      }
    }
    
    return {
      success: true // Already deleted or doesn't exist
    };
    
  } catch (error) {
    Logger.log('releaseBookingLock error: ' + error.toString());
    return {
      success: false,
      errorCode: 'RELEASE_FAILED',
      errorMessage: error.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

function cleanupExpiredLocks() {
  const sheet = getSheet(SHEET_NAMES.LOCKS);
  const data = sheet.getDataRange().getValues();
  const now = getCurrentTime();
  
  // Iterate in reverse to avoid index issues when deleting
  for (let i = data.length - 1; i >= 1; i--) {
    const expiresAt = new Date(data[i][7]);
    if (expiresAt < now) {
      sheet.deleteRow(i + 1);
    }
  }
}

function getActiveLocksByCabin(cabinId, date) {
  const sheet = getSheet(SHEET_NAMES.LOCKS);
  const data = sheet.getDataRange().getValues();
  const now = getCurrentTime();
  const locks = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === cabinId && data[i][2] === date) {
      const expiresAt = new Date(data[i][7]);
      if (expiresAt > now) {
        locks.push({
          lockId: data[i][0],
          cabinId: data[i][1],
          date: data[i][2],
          startTime: data[i][3],
          endTime: data[i][4],
          userEmail: data[i][5],
          createdAt: data[i][6],
          expiresAt: data[i][7]
        });
      }
    }
  }
  
  return locks;
}

function getLockById(lockId) {
  const sheet = getSheet(SHEET_NAMES.LOCKS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === lockId) {
      return {
        lockId: data[i][0],
        cabinId: data[i][1],
        date: data[i][2],
        startTime: data[i][3],
        endTime: data[i][4],
        userEmail: data[i][5],
        createdAt: data[i][6],
        expiresAt: data[i][7]
      };
    }
  }
  
  return null;
}

function getActiveLocksCount() {
  const sheet = getSheet(SHEET_NAMES.LOCKS);
  const data = sheet.getDataRange().getValues();
  const now = getCurrentTime();
  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const expiresAt = new Date(data[i][7]);
    if (expiresAt > now) {
      count++;
    }
  }
  
  return count;
}

function validateBookingDateTime(date, startTime, endTime) {
  const settings = getSettings();
  const now = getCurrentTime();
  
  // Parse date and time
  const bookingDateTime = new Date(date + 'T' + startTime);
  
  // Check if in the past
  if (bookingDateTime < now) {
    return {
      valid: false,
      errorCode: 'PAST_BOOKING',
      errorMessage: 'Cannot book in the past'
    };
  }
  
  // Check advance booking limit
  const maxAdvanceDate = new Date(now.getTime() + settings.advanceBookingDays * 24 * 60 * 60 * 1000);
  if (bookingDateTime > maxAdvanceDate) {
    return {
      valid: false,
      errorCode: 'ADVANCE_LIMIT_EXCEEDED',
      errorMessage: 'Cannot book more than ' + settings.advanceBookingDays + ' days in advance'
    };
  }
  
  // Check duration
  const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (durationMinutes <= 0) {
    return {
      valid: false,
      errorCode: 'INVALID_DURATION',
      errorMessage: 'End time must be after start time'
    };
  }
  
  if (durationMinutes > settings.maxBookingDurationMinutes) {
    return {
      valid: false,
      errorCode: 'DURATION_EXCEEDED',
      errorMessage: 'Maximum booking duration is ' + settings.maxBookingDurationMinutes + ' minutes'
    };
  }
  
  return { valid: true };
}
