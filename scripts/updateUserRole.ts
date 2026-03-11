/**
 * Utility script to update user role in Firebase
 * 
 * This script helps you change a user's role from field_staff to office_staff
 * or vice versa.
 * 
 * Usage:
 * 1. Import this in your app or run via a temporary button
 * 2. Call updateUserRole with the phone number and desired role
 */

import { updateUserRole } from '../authHelpers';

/**
 * Update a user's role
 * @param phoneNumber - Phone number with country code (e.g., '+911234567890')
 * @param role - 'field_staff' or 'office_staff'
 */
export async function changeUserRole(
  phoneNumber: string, 
  role: 'field_staff' | 'office_staff'
) {
  try {
    await updateUserRole(phoneNumber, role);
    console.log(`✅ Successfully updated ${phoneNumber} to ${role}`);
    return { success: true, message: `User role updated to ${role}` };
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    return { success: false, message: 'Failed to update user role' };
  }
}

/**
 * Example usage:
 * 
 * // Change user to office staff
 * await changeUserRole('+911234567890', 'office_staff');
 * 
 * // Change user to field staff
 * await changeUserRole('+911234567890', 'field_staff');
 */
