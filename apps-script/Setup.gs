/**
 * Setup and Initialization Functions
 * 
 * Run setupSpreadsheet() once to create all required sheets and sample data.
 */

function setupSpreadsheet() {
  const ss = getSpreadsheet();
  
  // Create Users sheet
  createUsersSheet(ss);
  
  // Create Cabins sheet
  createCabinsSheet(ss);
  
  // Create Bookings sheet
  createBookingsSheet(ss);
  
  // Create Locks sheet
  createLocksSheet(ss);
  
  // Create Settings sheet
  createSettingsSheet(ss);
  
  Logger.log('Spreadsheet setup complete!');
  SpreadsheetApp.getUi().alert('Setup complete! All sheets have been created with sample data.');
}

function createUsersSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.USERS);
  } else {
    sheet.clear();
  }
  
  // Headers
  sheet.appendRow([
    'email',
    'name',
    'employee_id',
    'department',
    'role',
    'active',
    'created_at'
  ]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, 7);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  
  // Sample data
  const now = formatDateTime(getCurrentTime());
  sheet.appendRow([
    'admin@company.com',
    'Admin User',
    'EMP001',
    'IT',
    'ADMIN',
    true,
    now
  ]);
  
  sheet.appendRow([
    'john.lead@company.com',
    'John Lead',
    'EMP002',
    'Sales',
    'TEAM_LEAD',
    true,
    now
  ]);
  
  sheet.appendRow([
    'sarah.employee@company.com',
    'Sarah Employee',
    'EMP003',
    'HR',
    'EMPLOYEE',
    true,
    now
  ]);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 7);
  
  Logger.log('Users sheet created');
}

function createCabinsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.CABINS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.CABINS);
  } else {
    sheet.clear();
  }
  
  // Headers
  sheet.appendRow([
    'cabin_id',
    'cabin_name',
    'location',
    'capacity',
    'description',
    'status',
    'created_at'
  ]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, 7);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  
  // Sample data
  const now = formatDateTime(getCurrentTime());
  
  sheet.appendRow([
    generateId('CABIN'),
    'Cabin 01',
    '1st Floor',
    4,
    'Small meeting room with whiteboard',
    'ACTIVE',
    now
  ]);
  
  sheet.appendRow([
    generateId('CABIN'),
    'Cabin 02',
    '2nd Floor',
    6,
    'Medium meeting room with projector',
    'ACTIVE',
    now
  ]);
  
  sheet.appendRow([
    generateId('CABIN'),
    'Cabin 03',
    '3rd Floor',
    8,
    'Large conference room with video conferencing',
    'ACTIVE',
    now
  ]);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 7);
  
  Logger.log('Cabins sheet created');
}

function createBookingsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.BOOKINGS);
  } else {
    sheet.clear();
  }
  
  // Headers
  sheet.appendRow([
    'booking_id',
    'cabin_id',
    'cabin_name',
    'date',
    'start_time',
    'end_time',
    'booked_by',
    'booked_by_email',
    'department',
    'purpose',
    'status',
    'created_at',
    'updated_at'
  ]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, 13);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 13);
  
  Logger.log('Bookings sheet created');
}

function createLocksSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.LOCKS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.LOCKS);
  } else {
    sheet.clear();
  }
  
  // Headers
  sheet.appendRow([
    'lock_id',
    'cabin_id',
    'date',
    'start_time',
    'end_time',
    'user_email',
    'created_at',
    'expires_at'
  ]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, 8);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 8);
  
  Logger.log('Locks sheet created');
}

function createSettingsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
  } else {
    sheet.clear();
  }
  
  // Headers
  sheet.appendRow([
    'setting',
    'value'
  ]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, 2);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  
  // Default settings
  sheet.appendRow(['lock_duration_minutes', 5]);
  sheet.appendRow(['max_booking_duration_minutes', 60]);
  sheet.appendRow(['advance_booking_days', 30]);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 2);
  
  Logger.log('Settings sheet created');
}

// Utility function to add a user
function addUser(email, name, employeeId, department, role) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const now = formatDateTime(getCurrentTime());
  
  sheet.appendRow([
    email,
    name,
    employeeId,
    department,
    role,
    true,
    now
  ]);
  
  Logger.log('User added: ' + email);
}

// Utility function to add a cabin
function addCabin(cabinName, location, capacity, description) {
  const sheet = getSheet(SHEET_NAMES.CABINS);
  const cabinId = generateId('CABIN');
  const now = formatDateTime(getCurrentTime());
  
  sheet.appendRow([
    cabinId,
    cabinName,
    location,
    capacity,
    description,
    'ACTIVE',
    now
  ]);
  
  Logger.log('Cabin added: ' + cabinName);
  return cabinId;
}
