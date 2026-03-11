# Fix User Role - Quick Guide

## Problem
Your office staff user is showing as "Field Staff" in the app because the role wasn't set in Firebase.

## Solution
I've added an Admin Role Updater component to the home screen that lets you update user roles.

## Steps to Fix

### 1. Open the App
- Login to the app with any account
- You'll see the "Admin: Update User Role" section at the top of the home screen

### 2. Update the User Role
- Enter the phone number (10 digits) of the office staff user
- Select "Office Staff" role
- Click "Update Role"
- You'll see a success message

### 3. User Must Re-login
- The office staff user needs to:
  1. Logout from the app
  2. Login again
- After re-login, they will see "Office Staff" header and the Contact Enquiry module

### 4. Remove the Admin Component (After Updating)
Once you've updated all the roles you need, remove the admin component:

**In `app/(tabs)/index.tsx`:**
1. Remove the import: `import AdminRoleUpdater from "../../components/AdminRoleUpdater";`
2. Remove the component: `<AdminRoleUpdater />`

## What Was Fixed

### 1. Auth Flow Updated
- `app/auth.tsx` now passes the `role` field when logging in
- Existing users without a role default to 'field_staff'

### 2. New Helper Functions
Added to `authHelpers.ts`:
- `updateUserRole()` - Update a user's role
- `getUserData()` - Get user data from Firebase

### 3. Admin Component
Created `components/AdminRoleUpdater.tsx`:
- Simple UI to update user roles
- Validates phone numbers
- Shows success/error messages
- Temporary tool for admin use

## Firebase Structure

After updating, the user data in Firebase will look like:

```json
{
  "users": {
    "1234567890": {
      "phoneNumber": "+911234567890",
      "name": "John Doe",
      "employeeId": "1234567890",
      "role": "office_staff",  // ← This field is now set
      "createdAt": "2024-03-11T10:00:00.000Z",
      "lastLogin": "2024-03-11T10:30:00.000Z"
    }
  }
}
```

## Alternative: Direct Firebase Update

If you prefer to update directly in Firebase Console:

1. Go to Firebase Console → Realtime Database
2. Navigate to: `users/{phoneNumber}/role`
3. Set value to: `"office_staff"` (with quotes)
4. User must logout and login again

## Testing

After updating the role:
1. Office staff user logs out
2. Office staff user logs in again
3. Home screen should show "Office Staff" in the header
4. Employees tab should show "Office Staff" modules
5. Contact Enquiry module should be available

## Notes

- The role field is optional and defaults to 'field_staff'
- All existing users without a role will be treated as field staff
- New users created via registration will default to field staff
- You can change roles back and forth as needed
- Changes take effect immediately after re-login
