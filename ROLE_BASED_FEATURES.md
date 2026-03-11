# Role-Based Features Implementation

## Overview
The application now supports two types of users:
1. **Field Staff** - Original functionality for field operations
2. **Office Staff** - New functionality for contact enquiry management

## Changes Made

### 1. User Role System
- Added `role` field to Employee interface: `'field_staff' | 'office_staff'`
- Updated `createUser()` in `authHelpers.ts` to accept role parameter (defaults to 'field_staff')
- Modified `SessionContext.tsx` to include role in Employee interface

### 2. Office Staff Enquiry Module
Created new component: `components/OfficeStaffEnquiryModule.tsx`

Features:
- View assigned contact numbers from admin
- Select a contact to enquire
- Fill enquiry form with:
  - User Spoke To (name of person contacted)
  - Status (Contacted / Not Contacted / Follow Up)
  - Description (conversation details and notes)
- View enquiry history with status badges
- Real-time data sync with Firebase

### 3. Firebase Database Structure

#### New Collections:

**assignedContacts/{employeeId}/{contactId}**
```json
{
  "contactNumber": "+1234567890",
  "contactName": "John Doe",
  "assignedAt": "2024-03-11T10:00:00.000Z"
}
```

**enquiries/{enquiryId}**
```json
{
  "employeeId": "1234567890",
  "contactNumber": "+1234567890",
  "contactName": "John Doe",
  "userSpokeTo": "Jane Smith",
  "description": "Discussed product interest...",
  "status": "contacted",
  "createdAt": "2024-03-11T10:30:00.000Z"
}
```

### 4. Updated Employees Page
- `app/(tabs)/employees.tsx` now shows different modules based on user role
- Office Staff see: Contact Enquiry + My Tasks
- Field Staff see: All original modules (Visit, Travel Expense, CRM, Crop Disease, Field Measurement, Tasks)

### 5. New Firebase Helper Functions
Added to `firebaseHelpers.ts`:
- `createEnquiry()` - Save new enquiry
- `getEnquiriesByEmployee()` - Fetch employee's enquiry history
- `getAssignedContacts()` - Fetch contacts assigned to office staff

## Admin Setup Required

To assign contacts to office staff, admin needs to add data to Firebase:

```javascript
// Example: Assign contacts to office staff
firebase.database().ref('assignedContacts/[employeeId]').push({
  contactNumber: '+1234567890',
  contactName: 'Customer Name',
  assignedAt: new Date().toISOString()
});
```

## User Creation

When creating users via OTP authentication, you can specify the role:

```typescript
// Create office staff user
await createUser(phoneNumber, name, 'office_staff');

// Create field staff user (default)
await createUser(phoneNumber, name, 'field_staff');
// or
await createUser(phoneNumber, name);
```

## Testing

1. Create a user with role 'office_staff'
2. Admin assigns contact numbers to that employee
3. Office staff logs in and sees "Office Staff" header
4. Office staff can access "Contact Enquiry" module
5. Select contact, fill form, submit enquiry
6. View enquiry history

## Future Enhancements

Potential additions:
- Admin panel to assign contacts
- Bulk contact assignment
- Enquiry analytics and reports
- Call scheduling and reminders
- Export enquiry data
- Search and filter enquiries
