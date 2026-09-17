/**
 * Configuration and Spreadsheet Access
 */

// Replace this with your actual Spreadsheet ID after setup
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// Timezone configuration
const TIMEZONE = 'Asia/Kolkata';

// Sheet names
const SHEET_NAMES = {
  USERS: 'Users',
  CABINS: 'Cabins',
  BOOKINGS: 'Bookings',
  LOCKS: 'Locks',
  SETTINGS: 'Settings'
};

// Get spreadsheet
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Get specific sheet
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  return ss.getSheetByName(sheetName);
}

// Get current time in configured timezone
function getCurrentTime() {
  return new Date();
}

// Format date for storage
function formatDate(date) {
  return Utilities.formatDate(date, TIMEZONE, 'yyyy-MM-dd');
}

// Format time for storage
function formatTime(date) {
  return Utilities.formatDate(date, TIMEZONE, 'HH:mm');
}

// Format datetime for storage
function formatDateTime(date) {
  return Utilities.formatDate(date, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

// Generate unique ID
function generateId(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);
}

// Get settings
function getSettings() {
  const sheet = getSheet(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  const settings = {
    lockDurationMinutes: 5,
    maxBookingDurationMinutes: 60,
    advanceBookingDays: 30
  };
  
  for (let i = 1; i < data.length; i++) {
    const setting = data[i][0];
    const value = data[i][1];
    
    if (setting === 'lock_duration_minutes') {
      settings.lockDurationMinutes = parseInt(value);
    } else if (setting === 'max_booking_duration_minutes') {
      settings.maxBookingDurationMinutes = parseInt(value);
    } else if (setting === 'advance_booking_days') {
      settings.advanceBookingDays = parseInt(value);
    }
  }
  
  return settings;
}

// Update settings
function updateSystemSettings(lockDuration, maxBookingDuration, advanceBookingDays) {
  const sheet = getSheet(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const setting = data[i][0];
    
    if (setting === 'lock_duration_minutes') {
      sheet.getRange(i + 1, 2).setValue(lockDuration);
    } else if (setting === 'max_booking_duration_minutes') {
      sheet.getRange(i + 1, 2).setValue(maxBookingDuration);
    } else if (setting === 'advance_booking_days') {
      sheet.getRange(i + 1, 2).setValue(advanceBookingDays);
    }
  }
}

// Time slot utilities
function generateTimeSlots() {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    slots.push(String(hour).padStart(2, '0') + ':00');
  }
  return slots;
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function timeToMinutes(timeStr) {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function doTimesOverlap(start1, end1, start2, end2) {
  const start1Mins = timeToMinutes(start1);
  const end1Mins = timeToMinutes(end1);
  const start2Mins = timeToMinutes(start2);
  const end2Mins = timeToMinutes(end2);
  
  return start1Mins < end2Mins && end1Mins > start2Mins;
}

function addMinutesToTime(timeStr, minutes) {
  const { hours, minutes: mins } = parseTime(timeStr);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return String(newHours).padStart(2, '0') + ':' + String(newMins).padStart(2, '0');
}
