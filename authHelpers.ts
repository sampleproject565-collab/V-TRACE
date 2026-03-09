import { get, ref, remove, set } from 'firebase/database';
import { db } from './firebase';
import { sendOTPViaSMS } from './smsService';

// Generate random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS and store in database
export const sendOTP = async (phoneNumber: string) => {
  const otp = generateOTP();
  
  // Store OTP in database
  await storeOTP(phoneNumber, otp);
  
  // Send OTP via SMS
  try {
    await sendOTPViaSMS(phoneNumber, otp);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error: any) {
    console.error('SMS sending failed:', error);
    // Don't return OTP in production
    return { success: false, message: 'Failed to send SMS' };
  }
};

// Store OTP in database (expires in 5 minutes)
export const storeOTP = async (phoneNumber: string, otp: string) => {
  const sanitizedPhone = phoneNumber.replace(/[^0-9]/g, '');
  const otpRef = ref(db, `otps/${sanitizedPhone}`);
  
  await set(otpRef, {
    otp,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
  });
  
  return otp;
};

// Verify OTP
export const verifyOTP = async (phoneNumber: string, enteredOTP: string) => {
  const sanitizedPhone = phoneNumber.replace(/[^0-9]/g, '');
  const otpRef = ref(db, `otps/${sanitizedPhone}`);
  
  const snapshot = await get(otpRef);
  
  if (!snapshot.exists()) {
    throw new Error('OTP not found or expired');
  }
  
  const data = snapshot.val();
  const now = new Date();
  const expiresAt = new Date(data.expiresAt);
  
  if (now > expiresAt) {
    await remove(otpRef);
    throw new Error('OTP expired');
  }
  
  if (data.otp !== enteredOTP) {
    throw new Error('Invalid OTP');
  }
  
  // OTP is valid, remove it
  await remove(otpRef);
  return true;
};

// Check if user exists in database
export const checkUserExists = async (phoneNumber: string) => {
  const sanitizedPhone = phoneNumber.replace(/[^0-9]/g, '');
  const userRef = ref(db, `users/${sanitizedPhone}`);
  const snapshot = await get(userRef);
  return snapshot.exists() ? snapshot.val() : null;
};

// Create new user in database
export const createUser = async (phoneNumber: string, name: string) => {
  const sanitizedPhone = phoneNumber.replace(/[^0-9]/g, '');
  const userRef = ref(db, `users/${sanitizedPhone}`);
  
  const userData = {
    phoneNumber,
    name,
    employeeId: sanitizedPhone,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
  
  await set(userRef, userData);
  return userData;
};

// Update last login
export const updateLastLogin = async (phoneNumber: string) => {
  const sanitizedPhone = phoneNumber.replace(/[^0-9]/g, '');
  const userRef = ref(db, `users/${sanitizedPhone}/lastLogin`);
  await set(userRef, new Date().toISOString());
};
