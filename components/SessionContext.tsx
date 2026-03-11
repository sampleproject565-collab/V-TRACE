import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { addLocation, createSession, updateSession } from '../firebaseHelpers';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface Employee {
  employeeId: string;
  name: string;
  role?: 'field_staff' | 'office_staff';
}

export type WorkType = 'OFFICE' | 'FIELD' | 'FARM';

interface SessionState {
  sessionId: string | null;
  isActive: boolean;
  isPaused: boolean;
  workType: WorkType | null;
  startTime: Date | null;
  breakStartTime: Date | null;
  totalWorkTimeMs: number;
  totalBreakTimeMs: number;
}

interface SessionContextType {
  employee: Employee | null;
  session: SessionState;
  login: (emp: Employee) => void;
  logout: () => void;
  refreshUserRole: () => Promise<void>;
  startSession: (location: any, photoUri: string, workType: WorkType) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  closeSession: (location: any, photoUri: string) => Promise<void>;
  currentLocation: any;
  locationCount: number;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Helper to ask for Notification Permissions
async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [breakReminderId, setBreakReminderId] = useState<string | null>(null);

  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    isActive: false,
    isPaused: false,
    workType: null,
    startTime: null,
    breakStartTime: null,
    totalWorkTimeMs: 0,
    totalBreakTimeMs: 0,
  });

  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationCount, setLocationCount] = useState(0);
  const [intervalId, setIntervalId] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from Storage on load and sync role from Firebase
  useEffect(() => {
    const hydrate = async () => {
      try {
        const storedEmployee = await AsyncStorage.getItem('vtrace_employee');
        const storedSession = await AsyncStorage.getItem('vtrace_session');

        if (storedEmployee) {
          const employeeData = JSON.parse(storedEmployee);
          
          // Fetch latest role from Firebase
          try {
            const { get, ref } = await import('firebase/database');
            const { db } = await import('../firebase');
            const sanitizedPhone = employeeData.employeeId;
            const userRef = ref(db, `users/${sanitizedPhone}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
              const userData = snapshot.val();
              // Update employee with latest role from database
              employeeData.role = userData.role || 'field_staff';
              // Update storage with latest role
              await AsyncStorage.setItem('vtrace_employee', JSON.stringify(employeeData));
            }
          } catch (roleError) {
            console.warn('Failed to fetch role from Firebase, using cached data', roleError);
          }
          
          setEmployee(employeeData);
        }
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed.startTime) parsed.startTime = new Date(parsed.startTime);
          if (parsed.breakStartTime) parsed.breakStartTime = new Date(parsed.breakStartTime);
          setSession(parsed);
        }
      } catch (e) {
        console.warn('Storage hydration failed', e);
      } finally {
        setIsLoading(false);
      }
    };
    hydrate();
  }, []);

  // Sync session state changes
  useEffect(() => {
    if (!isLoading) {
      if (session.sessionId) {
        AsyncStorage.setItem('vtrace_session', JSON.stringify(session)).catch(console.warn);
      } else {
        AsyncStorage.removeItem('vtrace_session').catch(console.warn);
      }
    }
  }, [session, isLoading]);

  // Background Location & Setup
  useEffect(() => {
    requestNotificationPermissions();
    scheduleDailyReminders();

    if (session.isActive && !session.isPaused && employee) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    return () => stopLocationTracking();
  }, [session.isActive, session.isPaused, employee]);

  const scheduleDailyReminders = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Reminder to start workday at 9:00 AM
    await Notifications.scheduleNotificationAsync({
      content: { title: "Time to Punch In", body: "Don't forget to start your S2C Session today!" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });

    // Reminder to close workday at 6:00 PM
    await Notifications.scheduleNotificationAsync({
      content: { title: "Time to Punch Out", body: "Don't forget to complete your Close Day punch!" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    });
  };

  const login = async (emp: Employee) => {
    setEmployee(emp);
    await AsyncStorage.setItem('vtrace_employee', JSON.stringify(emp)).catch(console.warn);
  };

  const refreshUserRole = async () => {
    if (!employee) return;
    
    try {
      const { get, ref } = await import('firebase/database');
      const { db } = await import('../firebase');
      const sanitizedPhone = employee.employeeId;
      const userRef = ref(db, `users/${sanitizedPhone}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const updatedEmployee = {
          ...employee,
          role: userData.role || 'field_staff',
        };
        setEmployee(updatedEmployee);
        await AsyncStorage.setItem('vtrace_employee', JSON.stringify(updatedEmployee));
      }
    } catch (error) {
      console.error('Failed to refresh user role', error);
    }
  };

  const logout = async () => {
    setEmployee(null);
    setSession({
      sessionId: null,
      isActive: false,
      isPaused: false,
      workType: null,
      startTime: null,
      breakStartTime: null,
      totalWorkTimeMs: 0,
      totalBreakTimeMs: 0,
    });
    stopLocationTracking();
    setCurrentLocation(null);
    setLocationCount(0);
    await AsyncStorage.removeItem('vtrace_employee').catch(console.warn);
    await AsyncStorage.removeItem('vtrace_session').catch(console.warn);
  };

  const startLocationTracking = async () => {
    // Request permission just in case
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for active sessions.');
      return;
    }

    const updateLocation = async () => {
      try {
        let loc;
        try {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
        } catch (highAccError) {
          console.warn("High accuracy location failed, falling back to Balanced", highAccError);
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }

        setCurrentLocation(loc.coords);

        if (employee) {
          await addLocation({
            employeeId: employee.employeeId,
            sessionId: session.sessionId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          setLocationCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    // Update immediately, then every 2 minutes
    await updateLocation();
    const id = setInterval(updateLocation, 120000);
    setIntervalId(id);
  };

  const stopLocationTracking = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  const startSession = async (location: any, photoUri: string, workType: WorkType) => {
    if (!employee) return;
    const now = new Date();

    // Create new session
    const sessionId = await createSession({
      employeeId: employee.employeeId,
      workType,
      startTime: now,
      startLocation: location,
      startPhotoUri: photoUri,
    });

    setSession({
      sessionId: sessionId || null,
      isActive: true,
      isPaused: false,
      workType,
      startTime: now,
      breakStartTime: null,
      totalWorkTimeMs: 0,
      totalBreakTimeMs: 0,
    });
  };

  const pauseSession = async () => {
    if (!session.isActive || session.isPaused || !employee || !session.sessionId) return;
    const now = new Date();

    await updateSession(session.sessionId, {
      status: 'PAUSED',
      breakStartTime: now,
    });

    setSession(prev => ({
      ...prev,
      isPaused: true,
      breakStartTime: now,
    }));

    // Schedule Snooze Reminder
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Break Time",
        body: "You've been on break for 15 minutes. Remember to resume your work session when ready.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 15 * 60, // 15 mins
      },
    });
    setBreakReminderId(notifId);
  };

  const resumeSession = async () => {
    if (!session.isActive || !session.isPaused || !employee || !session.sessionId || !session.breakStartTime) return;
    const now = new Date();

    const breakDurationMs = now.getTime() - session.breakStartTime.getTime();
    const newTotalBreakTime = session.totalBreakTimeMs + breakDurationMs;

    await updateSession(session.sessionId, {
      status: 'ACTIVE',
      breakStartTime: null,
      totalBreakTimeMs: newTotalBreakTime,
    });

    setSession(prev => ({
      ...prev,
      isPaused: false,
      breakStartTime: null,
      totalBreakTimeMs: newTotalBreakTime,
    }));

    if (breakReminderId) {
      await Notifications.cancelScheduledNotificationAsync(breakReminderId);
      setBreakReminderId(null);
    }
  };

  const closeSession = async (location: any, photoUri: string) => {
    if (!session.isActive || !employee || !session.sessionId || !session.startTime) return;
    const now = new Date();

    // Calculate final time
    let finalBreakTime = session.totalBreakTimeMs;
    if (session.isPaused && session.breakStartTime) {
      finalBreakTime += (now.getTime() - session.breakStartTime.getTime());
    }

    const totalElapsedMs = now.getTime() - session.startTime.getTime();
    const finalWorkTime = totalElapsedMs - finalBreakTime;

    await updateSession(session.sessionId, {
      status: 'CLOSED',
      endTime: now,
      endLocation: location,
      endPhotoUri: photoUri,
      totalWorkTimeMs: finalWorkTime,
      totalBreakTimeMs: finalBreakTime,
    });

    setSession({
      sessionId: null,
      isActive: false,
      isPaused: false,
      workType: null,
      startTime: null,
      breakStartTime: null,
      totalWorkTimeMs: 0,
      totalBreakTimeMs: 0,
    });

    if (breakReminderId) {
      await Notifications.cancelScheduledNotificationAsync(breakReminderId);
      setBreakReminderId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fbb115" />
      </View>
    );
  }

  return (
    <SessionContext.Provider value={{
      employee,
      session,
      login,
      logout,
      refreshUserRole,
      startSession,
      pauseSession,
      resumeSession,
      closeSession,
      currentLocation,
      locationCount
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
