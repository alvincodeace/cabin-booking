/**
 * User Management Functions
 */

function getUserByEmail(email) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();
  
  // Find user by email
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      return {
        email: data[i][0],
        name: data[i][1],
        employeeId: data[i][2],
        department: data[i][3],
        role: data[i][4],
        active: data[i][5],
        createdAt: data[i][6]
      };
    }
  }
  
  return null;
}

function getAllUsers() {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();
  const users = [];
  
  for (let i = 1; i < data.length; i++) {
    users.push({
      email: data[i][0],
      name: data[i][1],
      employeeId: data[i][2],
      department: data[i][3],
      role: data[i][4],
      active: data[i][5],
      createdAt: data[i][6]
    });
  }
  
  return users;
}

function createUser(email, name, employeeId, department, role, active) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const now = formatDateTime(getCurrentTime());
  
  sheet.appendRow([
    email,
    name,
    employeeId,
    department,
    role,
    active,
    now
  ]);
  
  return {
    email: email,
    name: name,
    employeeId: employeeId,
    department: department,
    role: role,
    active: active,
    createdAt: now
  };
}

function updateUserStatus(email, active) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      sheet.getRange(i + 1, 6).setValue(active);
      return true;
    }
  }
  
  return false;
}
