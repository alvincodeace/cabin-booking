/**
 * Google Calendar Integration (Optional)
 * 
 * This module handles creating calendar events for bookings.
 * If calendar integration is disabled or fails, the system continues working.
 */

// Set to true to enable calendar integration
const CALENDAR_ENABLED = false;

// Calendar ID (use 'primary' for the user's primary calendar or a specific calendar ID)
const CALENDAR_ID = 'primary';

function createCalendarEventForBooking(booking) {
  if (!CALENDAR_ENABLED) {
    return;
  }
  
  try {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      Logger.log('Calendar not found: ' + CALENDAR_ID);
      return;
    }
    
    // Parse date and time
    const startDateTime = new Date(booking.date + 'T' + booking.startTime + ':00');
    const endDateTime = new Date(booking.date + 'T' + booking.endTime + ':00');
    
    // Create event
    const title = booking.cabinName + ' - ' + booking.purpose;
    const description = 
      'Cabin Booking Details:\n\n' +
      'Cabin: ' + booking.cabinName + '\n' +
      'Booked by: ' + booking.bookedBy + '\n' +
      'Department: ' + booking.department + '\n' +
      'Purpose: ' + booking.purpose + '\n' +
      'Time: ' + booking.startTime + ' - ' + booking.endTime;
    
    const event = calendar.createEvent(
      title,
      startDateTime,
      endDateTime,
      {
        description: description,
        location: 'Office Cabin'
      }
    );
    
    Logger.log('Calendar event created: ' + event.getId());
    
  } catch (error) {
    Logger.log('Calendar event creation failed: ' + error.toString());
    // Don't throw error - calendar is optional
  }
}

function deleteCalendarEventForBooking(booking) {
  if (!CALENDAR_ENABLED) {
    return;
  }
  
  try {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      return;
    }
    
    // Find and delete events matching the booking
    const startDateTime = new Date(booking.date + 'T' + booking.startTime + ':00');
    const endDateTime = new Date(booking.date + 'T' + booking.endTime + ':00');
    
    const events = calendar.getEvents(startDateTime, endDateTime);
    
    for (let event of events) {
      const title = event.getTitle();
      if (title.includes(booking.cabinName)) {
        event.deleteEvent();
        Logger.log('Calendar event deleted');
      }
    }
    
  } catch (error) {
    Logger.log('Calendar event deletion failed: ' + error.toString());
  }
}
