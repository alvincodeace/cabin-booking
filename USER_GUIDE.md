# Cabin Booking System - User Guide

Welcome to the Cabin Booking System! This guide will help you book and manage cabin reservations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Viewing Availability](#viewing-availability)
3. [Creating a Booking](#creating-a-booking)
4. [Managing Your Bookings](#managing-your-bookings)
5. [User Roles](#user-roles)
6. [FAQs](#faqs)

---

## Getting Started

### Accessing the System

1. Open your web browser
2. Navigate to: [Your Company Booking URL]
3. Sign in with your company Google account
4. The system will automatically recognize your account and permissions

### First Time Login

When you log in for the first time:
- You'll see the main dashboard
- Your name and role will appear in the top-right corner
- All available cabins will be displayed

---

## Viewing Availability

### Dashboard Overview

The dashboard shows:
- **Current date** at the top
- **All cabins** with their availability
- **Time slots** from 9:00 AM to 5:00 PM
- **Color-coded status** for each slot

### Status Colors

- 🟢 **Green (AVAILABLE)** - Slot is available for booking
- 🔴 **Red (BOOKED)** - Slot is already booked
- 🟡 **Yellow (LOCKED)** - Someone is currently booking this slot
- ⚪ **Gray (DISABLED)** - Cabin is temporarily unavailable

### Navigating Dates

- Click **◀** to view previous day
- Click **▶** to view next day
- Click **Today** to return to current date
- You cannot view past dates

### Auto-Refresh

The availability automatically refreshes every minute to show the latest bookings.

---

## Creating a Booking

> **Note**: Only Team Leads and Admins can create bookings. Regular employees have view-only access.

### Step 1: Select a Time Slot

1. Choose the date you want to book
2. Find an **AVAILABLE** (green) slot
3. Click on the time slot

### Step 2: Enter Booking Details

A booking form will appear:
- **Cabin**: Confirms the cabin you selected
- **Date**: Confirms the date
- **Time**: Shows start and end time
- **Purpose**: Enter the reason for your booking (required)
  - Example: "Team meeting", "Client discussion", "Training session"

### Step 3: Reserve the Slot

1. Click **Continue**
2. The system will create a **temporary reservation** for 5 minutes
3. A countdown timer will appear

### Step 4: Confirm Your Booking

You have 5 minutes to confirm:
- Review the details
- Click **Confirm Booking** to finalize
- OR click **Cancel** if you change your mind

**Important**: 
- The slot is temporarily locked for you during these 5 minutes
- Other users cannot book it during this time
- If you don't confirm within 5 minutes, the reservation expires

### Booking Confirmed!

After confirmation:
- ✅ You'll see a success message
- ✅ The slot will show as "BOOKED"
- ✅ The booking will appear in "My Bookings"
- ✅ (If enabled) You'll receive an email confirmation
- ✅ (If enabled) A calendar event will be created

---

## Managing Your Bookings

### Viewing Your Bookings

1. Click **My Bookings** in the top menu
2. You'll see a list of all your bookings:
   - Upcoming bookings
   - Past bookings
   - Cancelled bookings

### Cancelling a Booking

You can cancel your own bookings:

1. Go to **My Bookings**
2. Find the booking you want to cancel
3. Click **Cancel** button
4. Confirm the cancellation

**Rules**:
- ✅ You can only cancel future bookings
- ✅ You cannot cancel past bookings
- ✅ Once cancelled, the slot becomes available for others
- ✅ (If enabled) You'll receive a cancellation email

---

## User Roles

### Employee 👤

**What you can do**:
- ✅ View all cabin availability
- ✅ See booking details
- ✅ Check which cabins are available

**What you cannot do**:
- ❌ Create bookings
- ❌ Cancel bookings
- ❌ Access admin features

*If you need to book a cabin, contact your Team Lead or Admin.*

---

### Team Lead 👥

**What you can do**:
- ✅ Everything an Employee can do
- ✅ Create bookings for your team
- ✅ View your bookings
- ✅ Cancel your own bookings

**What you cannot do**:
- ❌ Cancel other people's bookings
- ❌ Manage cabins or users
- ❌ Access admin dashboard

---

### Admin 👑

**What you can do**:
- ✅ Everything a Team Lead can do
- ✅ Cancel any booking
- ✅ Manage cabins (add, edit, enable/disable)
- ✅ Manage users (add, deactivate, change roles)
- ✅ View all bookings
- ✅ Configure system settings
- ✅ View statistics

**Admin Dashboard** includes:
- Overview with key statistics
- All bookings management
- Cabin management
- User management
- System settings

---

## FAQs

### Q: How far in advance can I book?
**A**: You can book up to 30 days in advance (configurable by admin).

### Q: What is the maximum booking duration?
**A**: The default maximum is 60 minutes (1 hour). Your admin can change this.

### Q: Can I book the same cabin multiple times?
**A**: Yes, as long as the time slots don't overlap.

### Q: What if I need to book multiple cabins at once?
**A**: You'll need to book each cabin separately. You can have multiple active bookings.

### Q: I started booking but the countdown expired. What happened?
**A**: Your temporary reservation expired after 5 minutes. The slot is now available for others. You can try booking again.

### Q: Can I extend an existing booking?
**A**: No, you cannot extend a booking. You'll need to:
1. Cancel the existing booking
2. Create a new booking with the extended time
   
*Note: Another user might book the slot between cancellation and rebooking.*

### Q: What if someone else books "my" regular time slot?
**A**: The system is first-come, first-served. There are no recurring bookings or reserved slots.

### Q: I'm a Team Lead but I can't create bookings. Why?
**A**: Contact your admin. They may need to:
- Verify your role in the system
- Ensure your account is active

### Q: The cabin I want shows as "DISABLED". What should I do?
**A**: This means the cabin is temporarily unavailable. Contact your admin for:
- Reason for disability
- Expected availability date

### Q: Can I book on behalf of someone else?
**A**: Yes, if you're a Team Lead or Admin. The booking will be recorded under your name, but you can mention the actual attendees in the purpose field.

### Q: What happens if I don't show up for my booking?
**A**: Please cancel bookings you won't use. This allows others to use the cabin. Repeated no-shows may result in booking privileges being reviewed.

### Q: Is there a mobile app?
**A**: There's no separate mobile app, but the website is mobile-friendly. Access it from your phone's browser.

### Q: I accidentally cancelled my booking. Can it be restored?
**A**: No, cancellations are permanent. You'll need to create a new booking if the slot is still available.

### Q: The system shows a slot as "LOCKED" for a long time. Is it stuck?
**A**: Temporary locks expire after 5 minutes. If it's still locked after that:
1. Refresh the page
2. If the issue persists, contact your admin

### Q: Can I see who booked a specific time slot?
**A**: Yes, booked slots show the name of the person who made the booking.

### Q: Will I get notifications?
**A**: If enabled by your admin:
- ✅ Email confirmation when you book
- ✅ Email notification when you cancel
- ✅ Calendar invite for the booking

### Q: What if the website is down?
**A**: Contact your IT department or admin. In the meantime:
- Check if others can access it
- Try a different browser
- Clear your browser cache

---

## Tips for Best Experience

### ✅ Do's

- **Book in advance** - Popular times fill up quickly
- **Cancel unused bookings** - Help others find availability
- **Be specific in purpose** - Helps with room allocation
- **Leave on time** - Respect the next booking
- **Keep cabin clean** - Be considerate of the next user

### ❌ Don'ts

- **Don't book and forget** - Check your bookings regularly
- **Don't be late** - Your booking starts at the scheduled time
- **Don't overstay** - Your booking ends at the scheduled time
- **Don't share accounts** - Use your own company account
- **Don't book "just in case"** - Only book what you need

---

## Need Help?

### Technical Issues
- Browser not loading the page
- Login problems
- Error messages

**Contact**: [Your IT Support]

### Booking Questions
- Can't create bookings
- Need special accommodations
- Recurring meeting needs

**Contact**: [Your Admin]

### Account Issues
- Role changes needed
- Access problems
- Permissions questions

**Contact**: [Your HR/Admin]

---

## Quick Reference Card

```
┌─────────────────────────────────────┐
│     CABIN BOOKING QUICK GUIDE       │
├─────────────────────────────────────┤
│                                     │
│  VIEW AVAILABILITY                  │
│  └─ Dashboard → Select date         │
│                                     │
│  CREATE BOOKING (Team Lead/Admin)   │
│  └─ Click available slot            │
│     └─ Enter purpose                │
│        └─ Continue                  │
│           └─ Confirm (within 5 min) │
│                                     │
│  MY BOOKINGS                        │
│  └─ Top menu → My Bookings          │
│     └─ View/Cancel bookings         │
│                                     │
│  ADMIN FEATURES (Admin only)        │
│  └─ Top menu → Admin                │
│     └─ Manage everything            │
│                                     │
└─────────────────────────────────────┘
```

---

## Keyboard Shortcuts

Currently, the system is optimized for mouse/touch interaction. Keyboard navigation follows standard web patterns:
- **Tab** - Move between elements
- **Enter** - Activate buttons/links
- **Esc** - Close modals

---

**Last Updated**: September 2026

**Version**: 1.0

**For system updates and announcements, check with your admin.**
