import { get, push, ref, set, update } from "firebase/database";
import { db } from "./firebase";

// Employee helpers
export const createEmployee = async (employeeData: {
  employeeId: string;
  password: string;
  name: string;
}) => {
  const employeeRef = ref(db, `employees/${employeeData.employeeId}`);
  await set(employeeRef, {
    ...employeeData,
    registeredAt: new Date().toISOString(),
  });
};

export const getEmployeeByIdAndPassword = async (employeeId: string, password: string) => {
  const employeeRef = ref(db, `employees/${employeeId}`);
  const snapshot = await get(employeeRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    if (data.password === password) {
      return data;
    }
  }
  return null;
};

export const checkEmployeeExists = async (employeeId: string) => {
  const employeeRef = ref(db, `employees/${employeeId}`);
  const snapshot = await get(employeeRef);
  return snapshot.exists();
};

// Session helpers
export const createSession = async (sessionData: {
  employeeId: string;
  workType: string;
  startTime: Date;
  startLocation: any;
  startPhotoUri: string;
}) => {
  const sessionsRef = ref(db, 'sessions');
  const newSessionRef = push(sessionsRef);
  
  await set(newSessionRef, {
    ...sessionData,
    startTime: sessionData.startTime.toISOString(),
    status: 'ACTIVE',
    totalWorkTimeMs: 0,
    totalBreakTimeMs: 0,
  });
  
  return newSessionRef.key;
};

export const updateSession = async (sessionId: string, updates: any) => {
  const sessionRef = ref(db, `sessions/${sessionId}`);
  
  // Convert dates to ISO strings
  const processedUpdates = { ...updates };
  if (processedUpdates.breakStartTime instanceof Date) {
    processedUpdates.breakStartTime = processedUpdates.breakStartTime.toISOString();
  }
  if (processedUpdates.endTime instanceof Date) {
    processedUpdates.endTime = processedUpdates.endTime.toISOString();
  }
  
  await update(sessionRef, processedUpdates);
};

export const getSessionsByEmployee = async (employeeId: string) => {
  const sessionsRef = ref(db, 'sessions');
  const snapshot = await get(sessionsRef);
  
  if (!snapshot.exists()) return [];
  
  const sessions: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (data.employeeId === employeeId) {
      sessions.push({
        id: childSnapshot.key,
        ...data,
      });
    }
  });
  
  return sessions;
};

// Location helpers
export const addLocation = async (locationData: {
  employeeId: string;
  sessionId: string | null;
  latitude: number;
  longitude: number;
}) => {
  const locationsRef = ref(db, 'locations');
  const newLocationRef = push(locationsRef);
  
  await set(newLocationRef, {
    ...locationData,
    timestamp: new Date().toISOString(),
  });
};

// Visit helpers
export const createVisit = async (visitData: {
  sessionId: string | null;
  employeeId: string;
  latitude: number;
  longitude: number;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  notes?: string;
  photoUri?: string;
}) => {
  const visitsRef = ref(db, 'visits');
  const newVisitRef = push(visitsRef);
  
  await set(newVisitRef, {
    ...visitData,
    timestamp: new Date().toISOString(),
  });
  
  return newVisitRef.key;
};

export const getVisitsByEmployee = async (employeeId: string) => {
  const visitsRef = ref(db, 'visits');
  const snapshot = await get(visitsRef);
  
  if (!snapshot.exists()) return [];
  
  const visits: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (data.employeeId === employeeId) {
      visits.push({
        id: childSnapshot.key,
        ...data,
      });
    }
  });
  
  return visits;
};
