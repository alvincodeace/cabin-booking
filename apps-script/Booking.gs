/**
 * Booking Management Functions
 */

function confirmBookingFromLock(lockId, purpose, userEmail, userName, userDepartment) {
  // Acquire script lock for atomic operation
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    // Get the lock
    const bookingLock = getLockById(lockId);
    if (!bookingLock) {
      return {
        success: false,
        errorCode: 'LOCK_NOT_FOUND',
        errorMessage: 'Lock not found or has expired'
      };
    }
    
    // Verify lock belongs to user
    if (bookingLock.userEmail !== userEmail) {
      return {
        success: false,
        errorCode: 'UNAUTHORIZED',
        errorMessage: 'This lock belongs to another user'
      };
    }
    
    // Verify lock hasn't expired
    const expiresAt = new Date(bookingLock.expiresAt);
    if (expiresAt < getCurrentTime()) {
      return {
        success: false,
        errorCode: 'LOCK_EXPIRED',
        errorMessage: 'Lock has expired'
      };
    }
    
    // Validate cabin still exists and is active
    const cabin = getCabinById(bookingLock.cabinId);
    if (!cabin || cabin.status !== 'ACTIVE') {
      return {
        success: false,
        errorCode: 'CABIN_UNAVAILABLE',
        errorMessage: 'Cabin is no longer available'
      };
    }
    
    // Final check for overlapping bookings
    const existingBookings = getBookingsByCabin(
      bookingLock.cabinId,
      bookingLock.date
    );
    
    for (let booking of existingBookings) {
      if (booking.status === 'BOOKED' && 
          doTimesOverlap(
            bookingLock.startTime,
            bookingLock.endTime,
            booking.startTime,
            booking.endTime
          )) {
        return {
          success: false,
          errorCode: 'SLOT_NO_LONGER_AVAILABLE',
          errorMessage: 'This time slot was just booked by another user'
        };
      }
    }
    
    // Create the booking
    const bookingId = generateId('BOOKING');
    const now = getCurrentTime();
    const sheet = getSheet(SHEET_NAMES.BOOKINGS);
    
    sheet.appendRow([
      bookingId,
      bookingLock.cabinId,
      cabin.cabinName,
      bookingLock.date,
      bookingLock.startTime,
      bookingLock.endTime,
      userName,
      userEmail,
      userDepartment,
      purpose,
      'BOOKED',
      formatDateTime(now),
      formatDateTime(now)
    ]);
    
    // Delete the lock
    const lockSheet = getSheet(SHEET_NAMES.LOCKS);
    const lockData = lockSheet.getDataRange().getValues();
    for (let i = 1; i < lockData.length; i++) {
      if (lockData[i][0] === lockId) {
        lockSheet.deleteRow(i + 1);
        break;
      }
    }
    
    const booking = {
      bookingId: bookingId,
      cabinId: bookingLock.cabinId,
      cabinName: cabin.cabinName,
      date: bookingLock.date,
      startTime: bookingLock.startTime,
      endTime: bookingLock.endTime,
      bookedBy: userName,
      bookedByEmail: userEmail,
      department: userDepartment,
      purpose: purpose,
      status: 'BOOKED',
      createdAt: formatDateTime(now),
      updatedAt: formatDateTime(now)
    };
    
    // Send notification (optional)
    try {
      sendBookingConfirmationEmail(booking);
    } catch (e) {
      Logger.log('Email notification failed: ' + e.toString());
    }
    
    // Create calendar event (optional)
    try {
      createCalendarEventForBooking(booking);
    } catch (e) {
      Logger.log('Calendar event creation failed: ' + e.toString());
    }
    
    return {
      success: true,
      data: booking
    };
    
  } catch (error) {
    Logger.log('confirmBookingFromLock error: ' + error.toString());
    return {
      success: false,
      errorCode: 'BOOKING_FAILED',
      errorMessage: error.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

function getBookingsByDate(date) {
  const sheet = getSheet(SHEET_NAMES.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  const bookings = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === date) {
      bookings.push({
        bookingId: data[i][0],
        cabinId: data[i][1],
        cabinName: data[i][2],
        date: data[i][3],
        startTime: data[i][4],
        endTime: data[i][5],
        bookedBy: data[i][6],
        bookedByEmail: data[i][7],
        department: data[i][8],
        purpose: data[i][9],
        status: data[i][10],
        createdAt: data[i][11],
        updatedAt: data[i][12]
      });
    }
  }
  
  return bookings;
}

function getBookingsByCabin(cabinId, date) {
  const sheet = getSheet(SHEET_NAMES.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  const bookings = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === cabinId && data[i][3] === date) {
      bookings.push({
        bookingId: data[i][0],
        cabinId: data[i][1],
        cabinName: data[i][2],
        date: data[i][3],
        startTime: data[i][4],
        endTime: data[i][5],
        bookedBy: data[i][6],
        bookedByEmail: data[i][7],
        department: data[i][8],
        purpose: data[i][9],
        status: data[i][10],
        createdAt: data[i][11],
        updatedAt: data[i][12]
      });
    }
  }
  
  return bookings;
}

function getBookingsByUser(userEmail) {
  const sheet = getSheet(SHEET_NAMES.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  const bookings = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === userEmail) {
      bookings.push({
        bookingId: data[i][0],
        cabinId: data[i][1],
        cabinName: data[i][2],
        date: data[i][3],
        startTime: data[i][4],
        endTime: data[i][5],
        bookedBy: data[i][6],
        bookedByEmail: data[i][7],
        department: data[i][8],
        purpose: data[i][9],
        status: data[i][10],
        createdAt: data[i][11],
        updatedAt: data[i][12]
      });
    }
  }
  
  return bookings;
}

function getAllBookings(filters) {
  const sheet = getSheet(SHEET_NAMES.BOOKINGS);
  const data = sheet.getDataRange().getValues();
  const bookings = [];
  
  for (let i = 1; i < data.length; i++) {
    const booking = {
      bookingId: data[i][0],
      cabinId: data[i][1],
      cabinName: data[i][2],
      date: data[i][3],
      startTime: data[i][4],
      endTime: data[i][5],
      bookedBy: data[i][6],
      bookedByEmail: data[i][7],
      department: data[i][8],
      purpose: data[i][9],
      status: data[i][10],
      createdAt: data[i][11],
      updatedAt: data[i][12]
    };
    
    // Apply filters if provided
    if (filters) {
      if (filters.date && booking.date !== filters.date) continue;
      if (filters.cabinId && booking.cabinId !== filters.cabinId) continue;
      if (filters.userEmail && booking.bookedByEmail !== filters.userEmail) continue;
      if (filters.status && booking.status !== filters.status) continue;
    }
    
    bookings.push(booking);
  }
  
  return bookings;
}

function cancelBookingById(bookingId, userEmail, userRole) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const sheet = getSheet(SHEET_NAMES.BOOKINGS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === bookingId) {
        const booking = {
          bookingId: data[i][0],
          bookedByEmail: data[i][7],
          status: data[i][10],
          date: data[i][3],
          startTime: data[i][4]
        };
        
        // Check if booking can be cancelled
        if (booking.status !== 'BOOKED') {
          return {
            success: false,
            errorCode: 'ALREADY_CANCELLED',
            errorMessage: 'Booking is already cancelled'
          };
        }
        
        // Check authorization
        if (userRole !== 'ADMIN' && booking.bookedByEmail !== userEmail) {
          return {
            success: false,
            errorCode: 'UNAUTHORIZED',
            errorMessage: 'You can only cancel your own bookings'
          };
        }
        
        // Check if booking is in the future
        const bookingDateTime = new Date(booking.date + 'T' + booking.startTime);
        if (bookingDateTime < getCurrentTime()) {
          return {
            success: false,
            errorCode: 'PAST_BOOKING',
            errorMessage: 'Cannot cancel past bookings'
          };
        }
        
        // Update status to CANCELLED
        sheet.getRange(i + 1, 11).setValue('CANCELLED');
        sheet.getRange(i + 1, 13).setValue(formatDateTime(getCurrentTime()));
        
        return {
          success: true
        };
      }
    }
    
    return {
      success: false,
      errorCode: 'BOOKING_NOT_FOUND',
      errorMessage: 'Booking not found'
    };
    
  } catch (error) {
    Logger.log('cancelBookingById error: ' + error.toString());
    return {
      success: false,
      errorCode: 'CANCEL_FAILED',
      errorMessage: error.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

function getCabinAvailability(date, userEmail) {
  const cabins = getAllCabins();
  const bookings = getBookingsByDate(date);
  const availability = [];
  
  // Clean up expired locks
  cleanupExpiredLocks();
  
  for (let cabin of cabins) {
    const slots = [];
    const timeSlots = generateTimeSlots();
    
    for (let i = 0; i < timeSlots.length - 1; i++) {
      const startTime = timeSlots[i];
      const endTime = timeSlots[i + 1];
      
      const slot = {
        time: startTime,
        status: 'AVAILABLE'
      };
      
      // Check if cabin is disabled
      if (cabin.status !== 'ACTIVE') {
        slot.status = 'DISABLED';
      } else {
        // Check bookings
        const overlappingBooking = bookings.find(
          b => b.cabinId === cabin.cabinId &&
               b.status === 'BOOKED' &&
               doTimesOverlap(startTime, endTime, b.startTime, b.endTime)
        );
        
        if (overlappingBooking) {
          slot.status = 'BOOKED';
          slot.booking = overlappingBooking;
        } else {
          // Check locks
          const activeLocks = getActiveLocksByCabin(cabin.cabinId, date);
          const overlappingLock = activeLocks.find(
            l => doTimesOverlap(startTime, endTime, l.startTime, l.endTime)
          );
          
          if (overlappingLock) {
            slot.status = 'LOCKED';
            slot.lock = overlappingLock;
            slot.isOwnLock = overlappingLock.userEmail === userEmail;
          }
        }
      }
      
      slots.push(slot);
    }
    
    availability.push({
      cabin: cabin,
      slots: slots
    });
  }
  
  return availability;
}
