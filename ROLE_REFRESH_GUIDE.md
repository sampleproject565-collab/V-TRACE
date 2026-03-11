# How to Refresh User Role

## Problem
You updated the user role to "Office Staff" in the database, but the app still shows "Field Staff".

## Solution - 3 Options:

### Option 1: Use the Refresh Button (Easiest)
1. Open the app
2. Go to the Dashboard (Home screen)
3. Look at the role display under your name
4. Click the **refresh icon** (🔄) next to the role
5. You'll see a success message
6. The role will update immediately
7. The tabs will change automatically

### Option 2: Logout and Login Again
1. Click the logout button on the Dashboard
2. Login again with your phone number
3. The app will fetch the latest role from the database
4. Tabs will show correctly based on your role

### Option 3: Close and Reopen the App
1. Close the app completely (swipe away from recent apps)
2. Open the app again
3. The app automatically fetches the latest role on startup
4. Tabs will update based on your role

## What Changed:

### Automatic Role Sync
The app now automatically fetches the latest role from Firebase when:
- App starts up
- User clicks the refresh button
- User logs in

### Real-time Role Updates
- No need to manually update cached data
- Role is always synced with the database
- Changes take effect immediately after refresh

## For Office Staff:
After refreshing, you should see:
- ✅ Dashboard tab
- ✅ Enquiry tab (new)
- ✅ History tab
- ❌ S2C tab (hidden)
- ❌ Employees tab (hidden)
- ❌ Map tab (hidden)

## For Field Staff:
You should see:
- ✅ Dashboard tab
- ✅ S2C tab
- ✅ Employees tab
- ✅ Map tab
- ✅ History tab
- ❌ Enquiry tab (hidden)

## Testing:
1. Update role in database to "office_staff"
2. Click refresh button on Dashboard
3. Check that role shows "Office Staff"
4. Check that tabs changed (Enquiry visible, Employees hidden)
5. Success!
