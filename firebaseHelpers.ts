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

// Travel Expense helpers
export const createTravelExpense = async (expenseData: {
  employeeId: string;
  sessionId: string;
  distanceKm: number;
  taRate: number;
  totalExpense: number;
  date: Date;
}) => {
  const expensesRef = ref(db, 'travelExpenses');
  const newExpenseRef = push(expensesRef);
  
  await set(newExpenseRef, {
    ...expenseData,
    date: expenseData.date.toISOString(),
    createdAt: new Date().toISOString(),
  });
  
  return newExpenseRef.key;
};

export const getTravelExpensesByEmployee = async (employeeId: string) => {
  const expensesRef = ref(db, 'travelExpenses');
  const snapshot = await get(expensesRef);
  
  if (!snapshot.exists()) return [];
  
  const expenses: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (data.employeeId === employeeId) {
      expenses.push({
        id: childSnapshot.key,
        ...data,
      });
    }
  });
  
  return expenses;
};

// Customer CRM helpers
export const createCustomer = async (customerData: {
  employeeId: string;
  type: 'Farmer' | 'Dealer' | 'Distributor';
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  // Farmer fields
  cropType?: string;
  landSize?: string;
  village?: string;
  // Dealer fields
  shopName?: string;
  licenseNumber?: string;
  productsSold?: string;
  // Distributor fields
  companyName?: string;
  territory?: string;
  gstNumber?: string;
}) => {
  const customersRef = ref(db, 'customers');
  const newCustomerRef = push(customersRef);
  
  await set(newCustomerRef, {
    ...customerData,
    createdAt: new Date().toISOString(),
  });
  
  return newCustomerRef.key;
};

export const getCustomersByEmployee = async (employeeId: string) => {
  const customersRef = ref(db, 'customers');
  const snapshot = await get(customersRef);
  
  if (!snapshot.exists()) return [];
  
  const customers: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (data.employeeId === employeeId) {
      customers.push({
        id: childSnapshot.key,
        ...data,
      });
    }
  });
  
  return customers;
};

// Crop Report helpers
export const createCropReport = async (reportData: {
  employeeId: string;
  sessionId: string;
  cropName: string;
  disease: string;
  notes: string;
  photoUri: string;
  latitude: number;
  longitude: number;
}) => {
  const reportsRef = ref(db, 'cropReports');
  const newReportRef = push(reportsRef);
  
  await set(newReportRef, {
    ...reportData,
    timestamp: new Date().toISOString(),
  });
  
  return newReportRef.key;
};

export const getCropReportsByEmployee = async (employeeId: string) => {
  const reportsRef = ref(db, 'cropReports');
  const snapshot = await get(reportsRef);
  
  if (!snapshot.exists()) return [];
  
  const reports: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (data.employeeId === employeeId) {
      reports.push({
        id: childSnapshot.key,
        ...data,
      });
    }
  });
  
  return reports;
};

// Field Measurement helpers
export const createFieldMeasurement = async (measurementData: {
  employeeId: string;
  sessionId: string;
  customerName: string;
  points: Array<{ latitude: number; longitude: number }>;
  areaSquareMeters: number;
  areaAcres: number;
  areaSquareFeet: number;
  notes?: string;
}) => {
  const measurementsRef = ref(db, 'fieldMeasurements');
  const newMeasurementRef = push(measurementsRef);
  
  await set(newMeasurementRef, {
    ...measurementData,
    timestamp: new Date().toISOString(),
  });
  
  return newMeasurementRef.key;
};

export const getFieldMeasurementsByEmployee = async (employeeId: string) => {
  const measurementsRef = ref(db, 'fieldMeasurements');
  const snapshot = await get(measurementsRef);
  
  if (!snapshot.exists()) return [];
  
  const measurements: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (data.employeeId === employeeId) {
      measurements.push({
        id: childSnapshot.key,
        ...data,
      });
    }
  });
  
  return measurements;
};

// Task Management helpers
export const getTasksByEmployee = async (employeeId: string) => {
  const tasksRef = ref(db, 'tasks');
  const snapshot = await get(tasksRef);
  
  if (!snapshot.exists()) return [];
  
  const tasks: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (data.assignedTo === employeeId) {
      tasks.push({
        id: childSnapshot.key,
        ...data,
      });
    }
  });
  
  // Sort by date (newest first)
  return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const updateTaskStatus = async (taskId: string, status: 'accepted' | 'rejected' | 'completed' | 'not_completed', reason?: string) => {
  const taskRef = ref(db, `tasks/${taskId}`);
  
  const updates: any = {
    status,
    updatedAt: new Date().toISOString(),
  };
  
  if (status === 'accepted') {
    updates.acceptedAt = new Date().toISOString();
  } else if (status === 'rejected') {
    updates.rejectedAt = new Date().toISOString();
    updates.rejectionReason = reason || '';
  } else if (status === 'completed') {
    updates.completedAt = new Date().toISOString();
  } else if (status === 'not_completed') {
    updates.notCompletedAt = new Date().toISOString();
    updates.notCompletedReason = reason || '';
  }
  
  await update(taskRef, updates);
};

export const getTodayTasks = async (employeeId: string) => {
  const tasksRef = ref(db, 'tasks');
  const snapshot = await get(tasksRef);
  
  if (!snapshot.exists()) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tasks: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    const taskDate = new Date(data.dueDate || data.createdAt);
    taskDate.setHours(0, 0, 0, 0);
    
    if (data.assignedTo === employeeId && taskDate.getTime() === today.getTime()) {
      tasks.push({
        id: childSnapshot.key,
        ...data,
      });
    }
  });
  
  return tasks;
};

export const getPendingTasksCount = async (employeeId: string) => {
  const tasksRef = ref(db, 'tasks');
  const snapshot = await get(tasksRef);
  
  if (!snapshot.exists()) return 0;
  
  let count = 0;
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (data.assignedTo === employeeId && data.status === 'pending') {
      count++;
    }
  });
  
  return count;
};
