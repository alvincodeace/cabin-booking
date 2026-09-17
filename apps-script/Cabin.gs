/**
 * Cabin Management Functions
 */

function getAllCabins() {
  const sheet = getSheet(SHEET_NAMES.CABINS);
  const data = sheet.getDataRange().getValues();
  const cabins = [];
  
  for (let i = 1; i < data.length; i++) {
    cabins.push({
      cabinId: data[i][0],
      cabinName: data[i][1],
      location: data[i][2],
      capacity: data[i][3],
      description: data[i][4],
      status: data[i][5],
      createdAt: data[i][6]
    });
  }
  
  return cabins;
}

function getCabinById(cabinId) {
  const sheet = getSheet(SHEET_NAMES.CABINS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === cabinId) {
      return {
        cabinId: data[i][0],
        cabinName: data[i][1],
        location: data[i][2],
        capacity: data[i][3],
        description: data[i][4],
        status: data[i][5],
        createdAt: data[i][6]
      };
    }
  }
  
  return null;
}

function createCabin(cabinName, location, capacity, description) {
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
  
  return {
    cabinId: cabinId,
    cabinName: cabinName,
    location: location,
    capacity: capacity,
    description: description,
    status: 'ACTIVE',
    createdAt: now
  };
}

function updateCabinStatus(cabinId, status) {
  const sheet = getSheet(SHEET_NAMES.CABINS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === cabinId) {
      sheet.getRange(i + 1, 6).setValue(status);
      return true;
    }
  }
  
  return false;
}

function getTodayStats() {
  const cabins = getAllCabins();
  const today = formatDate(getCurrentTime());
  const bookings = getBookingsByDate(today);
  const activeLocks = getActiveLocksCount();
  
  const totalCabins = cabins.length;
  const activeCabins = cabins.filter(c => c.status === 'ACTIVE').length;
  const todayBookings = bookings.filter(b => b.status === 'BOOKED').length;
  
  return {
    totalCabins: totalCabins,
    availableToday: activeCabins,
    todayBookings: todayBookings,
    activeLocks: activeLocks
  };
}
