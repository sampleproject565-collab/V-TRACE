# V Trace - Project Documentation

## Project Overview
V Trace is a React Native mobile application built with Expo that helps field employees track visits, expenses, crop diseases, and field measurements using GPS technology and Firebase integration.

---

## Core Features

### 1. Authentication System
- **SMS OTP Verification**: Users receive one-time passwords via SMS for secure login
- **Phone Number Verification**: Validates phone numbers before sending OTP
- **Development Mode**: DEV_MODE enabled for testing (OTP logs to console)
- **Production Ready**: Switch DEV_MODE to false when Twilio credentials are configured

**How it works:**
1. User enters phone number
2. System sends OTP via SMS (or logs to console in dev mode)
3. User enters OTP to verify
4. User is authenticated and can access the app

---

### 2. Employees Dashboard
Main hub with 5 integrated modules accessible via card-based interface:
- Visit Module
- Travel Expense Calculator
- Dynamic CRM
- Crop Disease Report
- Field Measurement

**How it works:**
- Tap any module card to open it
- Each module has its own functionality and data storage
- All data syncs to Firebase Realtime Database in real-time

---

### 3. Visit Module
Logs customer/farmer visits with photo documentation.

**Features:**
- Record visit date and time
- Add customer/farmer name
- Capture photo of location/customer
- Add visit notes/remarks
- Save to Firebase with unique ID

**Data Structure:**
```
visits/{uniqueId}
├── date: ISO string
├── customerName: string
├── notes: string
└── photoUri: local file path
```

**How it works:**
1. Open Visit Module
2. Enter customer name and notes
3. Tap camera icon to capture photo
4. Submit to save to Firebase

---

### 4. Travel Expense Calculator
Calculates travel expenses based on GPS distance tracking.

**Features:**
- Start/Stop GPS tracking
- Automatic distance calculation using Geolib
- TA (Travel Allowance) calculation: ₹5 per km
- Real-time distance display
- Accuracy monitoring (Green <5m, Yellow 5-10m, Red >10m)
- Save expense report with date, distance, and TA amount

**Data Structure:**
```
travelExpenses/{uniqueId}
├── date: ISO string
├── distance: number (km)
├── taAmount: number (₹)
├── startLocation: {lat, lng}
├── endLocation: {lat, lng}
└── accuracy: number (meters)
```

**How it works:**
1. Open Travel Expense Module
2. Tap "Start Tracking" to begin GPS recording
3. Move around (app records multiple GPS readings for accuracy)
4. Tap "Stop Tracking" to end
5. System calculates distance and TA amount
6. Submit to save to Firebase

---

### 5. Dynamic CRM Module
Smart forms that adapt based on customer type.

**Features:**
- Select customer type: Farmer, Dealer, or Distributor
- Dynamic form fields based on type:
  - **Farmer**: Name, Land Size, Crop Type, Soil Type
  - **Dealer**: Name, Shop Location, Product Category, Stock Level
  - **Distributor**: Name, Distribution Area, Product Range, Warehouse Location
- Save customer data to Firebase

**Data Structure:**
```
crmData/{uniqueId}
├── type: "farmer" | "dealer" | "distributor"
├── name: string
├── date: ISO string
└── [type-specific fields]
```

**How it works:**
1. Open CRM Module
2. Select customer type from dropdown
3. Form fields update based on selection
4. Fill in the fields
5. Submit to save to Firebase

---

### 6. Crop Disease Report
Documents crop diseases with photo evidence.

**Features:**
- Select crop type
- Select disease from predefined list
- Capture photo of affected area
- Add detailed description
- Record severity level
- Save report with timestamp

**Data Structure:**
```
cropDiseases/{uniqueId}
├── date: ISO string
├── cropType: string
├── disease: string
├── severity: "low" | "medium" | "high"
├── description: string
└── photoUri: local file path
```

**How it works:**
1. Open Crop Disease Module
2. Select crop type and disease
3. Capture photo of affected area
4. Add description and severity
5. Submit to save to Firebase

---

### 7. Field Measurement Module
Measures field area using GPS polygon mapping.

**Features:**
- GPS-based polygon drawing on map
- Add points by tapping map or using GPS
- Real-time accuracy monitoring
- 5-reading average per point (500ms intervals)
- Accuracy filtering (rejects readings >10m)
- Uses Turf.js for area calculation
- Displays area in square meters and hectares
- Quality metrics saved with measurement

**Accuracy System:**
- Green: <5m accuracy (Excellent)
- Yellow: 5-10m accuracy (Good)
- Red: >10m accuracy (Poor)

**Data Structure:**
```
fieldMeasurements/{uniqueId}
├── date: ISO string
├── points: [{lat, lng, accuracy}]
├── areaM2: number
├── areaHectares: number
└── qualityMetrics: {avgAccuracy, maxAccuracy}
```

**How it works:**
1. Open Field Measurement Module
2. Tap map to add points (or use GPS button)
3. Each point takes 5 GPS readings for accuracy
4. View real-time accuracy feedback
5. Complete polygon by closing the shape
6. System calculates area automatically
7. Submit to save to Firebase

---

### 8. Tasks Management System
Displays daily tasks from Flask admin and tracks completion.

**Task Workflow:**
- Pending → Accept/Reject → Completed/Not Completed

**Features:**
- View pending tasks from admin
- Accept or reject tasks with optional reason
- Mark accepted tasks as completed or not completed
- Add reason if task not completed
- View task history with status
- Priority levels: High (Red), Medium (Yellow), Low (Green)
- Overdue task detection
- Summary statistics

**Data Structure:**
```
tasks/{uniqueId}
├── title: string
├── description: string
├── dueDate: ISO string
├── priority: "high" | "medium" | "low"
├── status: "pending" | "accepted" | "rejected" | "completed" | "not_completed"
├── rejectionReason: string (if rejected)
├── incompletionReason: string (if not completed)
└── assignedTo: string
```

**How it works:**
1. Open Tasks Module
2. View pending tasks
3. Tap task to see details
4. Accept or Reject task
5. If accepted, mark as Completed or Not Completed
6. If not completed, add reason
7. Submit to save status to Firebase

---

### 9. Calendar/History View
Displays all recorded activities grouped by date.

**Features:**
- View sessions and visits by date
- Proper date formatting (Monday, March 9, 2026)
- Grouped by ISO date format (YYYY-MM-DD)
- No invalid date errors
- Quick access to historical data

**How it works:**
1. Open Calendar tab
2. View activities grouped by date
3. Tap date to see details
4. View all visits and sessions for that day

---

## Firebase Integration

### Database Structure
All data is stored in Firebase Realtime Database under the following paths:

```
v-trace-database/
├── visits/
├── travelExpenses/
├── crmData/
├── cropDiseases/
├── fieldMeasurements/
└── tasks/
```

### Real-time Sync
- All modules automatically sync data to Firebase
- Changes appear instantly across devices
- Offline support via local caching

---

## Technical Stack

**Frontend:**
- React Native with Expo
- TypeScript
- React Navigation (Bottom Tabs)
- Expo Router for navigation

**Backend:**
- Firebase Realtime Database
- Twilio SMS (for OTP)

**Libraries:**
- Geolib: GPS distance calculations
- Turf.js: Polygon area calculations
- Expo Location: GPS tracking
- Expo Camera: Photo capture
- React Native Maps: Map visualization

**External Integration:**
- Flask Admin: Task management (Python backend)
- Twilio: SMS authentication

---

## How to Use the App

### First Time Setup
1. Launch app
2. Enter phone number
3. Receive OTP via SMS (or check console in dev mode)
4. Enter OTP to verify
5. Access dashboard

### Daily Workflow
1. **Check Tasks**: View pending tasks from admin
2. **Log Visits**: Record customer visits with photos
3. **Track Expenses**: Start/stop GPS to calculate travel allowance
4. **Report Issues**: Document crop diseases with photos
5. **Measure Fields**: Use GPS to measure field areas
6. **Manage CRM**: Add/update customer information
7. **Submit Tasks**: Accept/reject/complete daily tasks

### Data Backup
- All data automatically saves to Firebase
- No manual backup needed
- Access data from any device with same login

---

## Development Mode

### SMS Testing
- Set `DEV_MODE = true` in `smsService.ts`
- OTP will log to console instead of sending SMS
- Use logged OTP for testing

### Production Mode
- Set `DEV_MODE = false` in `smsService.ts`
- Configure valid Twilio credentials
- SMS will be sent to actual phone numbers

---

## Troubleshooting

### Common Issues

**1. Invalid Date in History**
- Fixed: Uses ISO date format (YYYY-MM-DD)
- Displays as: "Monday, March 9, 2026"

**2. GPS Accuracy Issues**
- App uses 5-reading average per point
- Rejects readings with >10m accuracy
- Move to open area for better signal

**3. Firebase Connection Issues**
- Check internet connection
- Verify Firebase credentials in config
- Restart app

**4. Camera Permission Denied**
- Grant camera permission in app settings
- Restart app after granting permission

**5. Location Permission Issues**
- Grant location permission in app settings
- Enable "Always Allow" for background tracking
- Restart app

---

## File Structure

```
V-TRACE/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx (Tab navigation)
│   │   ├── employees.tsx (Main dashboard)
│   │   ├── calendar.tsx (History view)
│   │   └── profile.tsx (User profile)
│   └── _layout.tsx (Root layout)
├── components/
│   ├── VisitModule.tsx
│   ├── TravelExpenseModule.tsx
│   ├── CRMModule.tsx
│   ├── CropDiseaseModule.tsx
│   ├── FieldMeasurementModule.tsx
│   └── TasksModule.tsx
├── services/
│   ├── firebaseHelpers.ts (Firebase functions)
│   ├── smsService.ts (SMS/OTP service)
│   └── authHelpers.ts (Authentication)
├── assets/
│   └── images/ (App icons and images)
├── app.json (Expo configuration)
└── package.json (Dependencies)
```

---

## Future Enhancements

- Image upload to Firebase Storage
- Offline mode with sync when online
- Advanced analytics dashboard
- Multi-language support
- Dark mode
- Push notifications
- Export reports as PDF

---

## Support & Contact

For issues or questions, refer to:
- Firebase Console: https://console.firebase.google.com
- Expo Documentation: https://docs.expo.dev
- React Native Docs: https://reactnative.dev

---

**Last Updated:** March 10, 2026
**Version:** 1.0.0
