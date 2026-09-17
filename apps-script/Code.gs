/**
 * Main entry points for Google Apps Script Web App
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (!action) {
      return createResponse(false, null, 'ACTION_REQUIRED', 'Action parameter is required');
    }

    // Get current user
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return createResponse(false, null, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Route to appropriate handler
    switch (action) {
      case 'currentUser':
        return handleGetCurrentUser(userEmail);
      case 'cabins':
        return handleGetCabins();
      case 'bookings':
        return handleGetBookings(e.parameter.date, userEmail);
      case 'availability':
        return handleGetAvailability(e.parameter.date, userEmail);
      case 'myBookings':
        return handleGetMyBookings(userEmail);
      case 'allBookings':
        return handleGetAllBookings(userEmail, e.parameter);
      case 'allUsers':
        return handleGetAllUsers(userEmail);
      case 'settings':
        return handleGetSettings();
      case 'todayStats':
        return handleGetTodayStats();
      case 'activeLocks':
        return handleGetActiveLocks();
      default:
        return createResponse(false, null, 'INVALID_ACTION', 'Invalid action');
    }
  } catch (error) {
    Logger.log('doGet error: ' + error.toString());
    return createResponse(false, null, 'SERVER_ERROR', error.toString());
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (!action) {
      return createResponse(false, null, 'ACTION_REQUIRED', 'Action parameter is required');
    }

    // Get current user
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      return createResponse(false, null, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Route to appropriate handler
    switch (action) {
      case 'createLock':
        return handleCreateLock(data, userEmail);
      case 'refreshLock':
        return handleRefreshLock(data, userEmail);
      case 'confirmBooking':
        return handleConfirmBooking(data, userEmail);
      case 'cancelLock':
        return handleCancelLock(data, userEmail);
      case 'cancelBooking':
        return handleCancelBooking(data, userEmail);
      case 'updateCabinStatus':
        return handleUpdateCabinStatus(data, userEmail);
      case 'updateUserStatus':
        return handleUpdateUserStatus(data, userEmail);
      case 'updateSettings':
        return handleUpdateSettings(data, userEmail);
      default:
        return createResponse(false, null, 'INVALID_ACTION', 'Invalid action');
    }
  } catch (error) {
    Logger.log('doPost error: ' + error.toString());
    return createResponse(false, null, 'SERVER_ERROR', error.toString());
  }
}

function createResponse(success, data, errorCode, errorMessage) {
  const response = {
    success: success,
    data: data,
    error: success ? null : {
      code: errorCode,
      message: errorMessage
    }
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handler functions
function handleGetCurrentUser(userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user) {
    return createResponse(false, null, 'USER_NOT_FOUND', 'User not found in system');
  }
  if (!user.active) {
    return createResponse(false, null, 'USER_INACTIVE', 'User account is inactive');
  }
  return createResponse(true, user, null, null);
}

function handleGetCabins() {
  const cabins = getAllCabins();
  return createResponse(true, cabins, null, null);
}

function handleGetBookings(date, userEmail) {
  if (!date) {
    return createResponse(false, null, 'DATE_REQUIRED', 'Date parameter is required');
  }
  const bookings = getBookingsByDate(date);
  return createResponse(true, bookings, null, null);
}

function handleGetAvailability(date, userEmail) {
  if (!date) {
    return createResponse(false, null, 'DATE_REQUIRED', 'Date parameter is required');
  }
  
  const user = getUserByEmail(userEmail);
  if (!user || !user.active) {
    return createResponse(false, null, 'UNAUTHORIZED', 'User not authorized');
  }

  const availability = getCabinAvailability(date, userEmail);
  return createResponse(true, availability, null, null);
}

function handleGetMyBookings(userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user) {
    return createResponse(false, null, 'USER_NOT_FOUND', 'User not found');
  }
  
  const bookings = getBookingsByUser(userEmail);
  return createResponse(true, bookings, null, null);
}

function handleGetAllBookings(userEmail, filters) {
  const user = getUserByEmail(userEmail);
  if (!user || user.role !== 'ADMIN') {
    return createResponse(false, null, 'UNAUTHORIZED', 'Admin access required');
  }
  
  const bookings = getAllBookings(filters);
  return createResponse(true, bookings, null, null);
}

function handleGetAllUsers(userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user || user.role !== 'ADMIN') {
    return createResponse(false, null, 'UNAUTHORIZED', 'Admin access required');
  }
  
  const users = getAllUsers();
  return createResponse(true, users, null, null);
}

function handleGetSettings() {
  const settings = getSettings();
  return createResponse(true, settings, null, null);
}

function handleGetTodayStats() {
  const stats = getTodayStats();
  return createResponse(true, stats, null, null);
}

function handleGetActiveLocks() {
  const count = getActiveLocksCount();
  return createResponse(true, count, null, null);
}

function handleCreateLock(data, userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user || !user.active) {
    return createResponse(false, null, 'UNAUTHORIZED', 'User not authorized');
  }
  
  if (user.role !== 'ADMIN' && user.role !== 'TEAM_LEAD') {
    return createResponse(false, null, 'INSUFFICIENT_PERMISSIONS', 'Only Team Leads and Admins can create bookings');
  }

  const result = createBookingLock(data.cabinId, data.date, data.startTime, data.endTime, userEmail);
  
  if (result.success) {
    return createResponse(true, result.data, null, null);
  } else {
    return createResponse(false, null, result.errorCode, result.errorMessage);
  }
}

function handleRefreshLock(data, userEmail) {
  const result = refreshBookingLock(data.lockId, userEmail);
  
  if (result.success) {
    return createResponse(true, result.data, null, null);
  } else {
    return createResponse(false, null, result.errorCode, result.errorMessage);
  }
}

function handleConfirmBooking(data, userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user || !user.active) {
    return createResponse(false, null, 'UNAUTHORIZED', 'User not authorized');
  }
  
  if (user.role !== 'ADMIN' && user.role !== 'TEAM_LEAD') {
    return createResponse(false, null, 'INSUFFICIENT_PERMISSIONS', 'Only Team Leads and Admins can create bookings');
  }

  const result = confirmBookingFromLock(data.lockId, data.purpose, userEmail, user.name, user.department);
  
  if (result.success) {
    return createResponse(true, result.data, null, null);
  } else {
    return createResponse(false, null, result.errorCode, result.errorMessage);
  }
}

function handleCancelLock(data, userEmail) {
  const result = releaseBookingLock(data.lockId, userEmail);
  
  if (result.success) {
    return createResponse(true, null, null, null);
  } else {
    return createResponse(false, null, result.errorCode, result.errorMessage);
  }
}

function handleCancelBooking(data, userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user || !user.active) {
    return createResponse(false, null, 'UNAUTHORIZED', 'User not authorized');
  }

  const result = cancelBookingById(data.bookingId, userEmail, user.role);
  
  if (result.success) {
    return createResponse(true, null, null, null);
  } else {
    return createResponse(false, null, result.errorCode, result.errorMessage);
  }
}

function handleUpdateCabinStatus(data, userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user || user.role !== 'ADMIN') {
    return createResponse(false, null, 'UNAUTHORIZED', 'Admin access required');
  }

  updateCabinStatus(data.cabinId, data.status);
  return createResponse(true, null, null, null);
}

function handleUpdateUserStatus(data, userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user || user.role !== 'ADMIN') {
    return createResponse(false, null, 'UNAUTHORIZED', 'Admin access required');
  }

  updateUserStatus(data.email, data.active);
  return createResponse(true, null, null, null);
}

function handleUpdateSettings(data, userEmail) {
  const user = getUserByEmail(userEmail);
  if (!user || user.role !== 'ADMIN') {
    return createResponse(false, null, 'UNAUTHORIZED', 'Admin access required');
  }

  updateSystemSettings(data.lockDurationMinutes, data.maxBookingDurationMinutes, data.advanceBookingDays);
  return createResponse(true, getSettings(), null, null);
}
