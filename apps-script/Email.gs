/**
 * Email Notification Functions (Optional)
 * 
 * This module handles sending email notifications for bookings.
 * If email notifications fail, the system continues working.
 */

// Set to true to enable email notifications
const EMAIL_ENABLED = false;

function sendBookingConfirmationEmail(booking) {
  if (!EMAIL_ENABLED) {
    return;
  }
  
  try {
    const subject = 'Cabin Booking Confirmed - ' + booking.cabinName;
    
    const body = 
      'Dear ' + booking.bookedBy + ',\n\n' +
      'Your cabin booking has been confirmed.\n\n' +
      'Booking Details:\n' +
      '-------------------\n' +
      'Cabin: ' + booking.cabinName + '\n' +
      'Date: ' + formatDateForEmail(booking.date) + '\n' +
      'Time: ' + booking.startTime + ' - ' + booking.endTime + '\n' +
      'Purpose: ' + booking.purpose + '\n' +
      'Booking ID: ' + booking.bookingId + '\n\n' +
      'Please arrive on time and ensure the cabin is clean after use.\n\n' +
      'Thank you,\n' +
      'Cabin Booking System';
    
    MailApp.sendEmail({
      to: booking.bookedByEmail,
      subject: subject,
      body: body
    });
    
    Logger.log('Confirmation email sent to: ' + booking.bookedByEmail);
    
  } catch (error) {
    Logger.log('Email sending failed: ' + error.toString());
    // Don't throw error - email is optional
  }
}

function sendBookingCancellationEmail(booking) {
  if (!EMAIL_ENABLED) {
    return;
  }
  
  try {
    const subject = 'Cabin Booking Cancelled - ' + booking.cabinName;
    
    const body = 
      'Dear ' + booking.bookedBy + ',\n\n' +
      'Your cabin booking has been cancelled.\n\n' +
      'Booking Details:\n' +
      '-------------------\n' +
      'Cabin: ' + booking.cabinName + '\n' +
      'Date: ' + formatDateForEmail(booking.date) + '\n' +
      'Time: ' + booking.startTime + ' - ' + booking.endTime + '\n' +
      'Purpose: ' + booking.purpose + '\n' +
      'Booking ID: ' + booking.bookingId + '\n\n' +
      'If you did not cancel this booking, please contact your administrator.\n\n' +
      'Thank you,\n' +
      'Cabin Booking System';
    
    MailApp.sendEmail({
      to: booking.bookedByEmail,
      subject: subject,
      body: body
    });
    
    Logger.log('Cancellation email sent to: ' + booking.bookedByEmail);
    
  } catch (error) {
    Logger.log('Email sending failed: ' + error.toString());
  }
}

function formatDateForEmail(dateStr) {
  const date = new Date(dateStr);
  return Utilities.formatDate(date, TIMEZONE, 'EEEE, MMMM dd, yyyy');
}
