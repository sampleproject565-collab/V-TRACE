import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { get, getDatabase, ref, remove, set, update } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB7rnnj9tOX3mpHU8GT4NP7F52g6NOc6lg",
  authDomain: "login-otp-29372.firebaseapp.com",
  databaseURL: "https://login-otp-29372-default-rtdb.firebaseio.com",
  projectId: "login-otp-29372",
  storageBucket: "login-otp-29372.firebasestorage.app",
  messagingSenderId: "659522199701",
  appId: "1:659522199701:web:0d97b29376dcc10dc5fb9c",
  measurementId: "G-3RMQL1Y4R4"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// User data structure helper functions
export const userDataPaths = {
  profile: (userId: string) => `users/${userId}/profile`,
  personal: (userId: string) => `users/${userId}/personal`,
  contact: (userId: string) => `users/${userId}/contact`,
  preferences: (userId: string) => `users/${userId}/preferences`,
  activity: (userId: string) => `users/${userId}/activity`,
  settings: (userId: string) => `users/${userId}/settings`,
  documents: (userId: string) => `users/${userId}/documents`,
  metadata: (userId: string) => `users/${userId}/metadata`,
};

// Create/Update user profile
export const createUserProfile = async (userId: string, userData: {
  // Profile Information
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  bio?: string;
  
  // Personal Information
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  
  // Contact Information
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  alternateEmail?: string;
  alternatePhone?: string;
  
  // Preferences
  language?: string;
  timezone?: string;
  theme?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  
  // Additional metadata
  occupation?: string;
  company?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
}) => {
  const userRef = ref(db, `users/${userId}`);
  
  const completeUserData = {
    profile: {
      displayName: userData.displayName || '',
      email: userData.email || '',
      phoneNumber: userData.phoneNumber || '',
      photoURL: userData.photoURL || '',
      bio: userData.bio || '',
    },
    personal: {
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      dateOfBirth: userData.dateOfBirth || '',
      gender: userData.gender || '',
      nationality: userData.nationality || '',
      occupation: userData.occupation || '',
      company: userData.company || '',
      website: userData.website || '',
    },
    contact: {
      address: userData.address || {},
      alternateEmail: userData.alternateEmail || '',
      alternatePhone: userData.alternatePhone || '',
      socialMedia: userData.socialMedia || {},
    },
    preferences: {
      language: userData.language || 'en',
      timezone: userData.timezone || 'UTC',
      theme: userData.theme || 'light',
      notifications: userData.notifications || {
        email: true,
        push: true,
        sms: false,
      },
    },
    activity: {
      lastLogin: new Date().toISOString(),
      loginCount: 0,
      lastActive: new Date().toISOString(),
    },
    settings: {
      privacy: {
        profileVisible: true,
        showEmail: false,
        showPhone: false,
      },
      security: {
        twoFactorEnabled: false,
        loginAlerts: true,
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      accountStatus: 'active',
      emailVerified: false,
      phoneVerified: false,
    },
  };
  
  await set(userRef, completeUserData);
  return completeUserData;
};

// Get user data
export const getUserData = async (userId: string) => {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  return snapshot.exists() ? snapshot.val() : null;
};

// Update specific user data section
export const updateUserData = async (userId: string, section: keyof typeof userDataPaths, data: any) => {
  const sectionRef = ref(db, userDataPaths[section](userId));
  await update(sectionRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
};

// Update user activity
export const updateUserActivity = async (userId: string) => {
  const activityRef = ref(db, `users/${userId}/activity`);
  const snapshot = await get(activityRef);
  const currentData = snapshot.val() || {};
  
  await update(activityRef, {
    lastActive: new Date().toISOString(),
    loginCount: (currentData.loginCount || 0) + 1,
    lastLogin: new Date().toISOString(),
  });
};

// Delete user data
export const deleteUserData = async (userId: string) => {
  const userRef = ref(db, `users/${userId}`);
  await remove(userRef);
};

// Export database utilities
export { get, ref, remove, set, update };

