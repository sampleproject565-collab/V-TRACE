# Image Storage Information

## Current Implementation

Currently, all images captured in the app are stored as **local URIs** in Firebase Realtime Database. This means:

### What is Stored:
- The file path/URI on the device (e.g., `file:///data/user/0/com.yourapp/cache/Camera/photo_123.jpg`)
- NOT the actual image file itself

### Where Images are Used:
1. **Visit Module** - Site photos (`photoUri`)
2. **Session Management** - Start/End session photos (`startPhotoUri`, `endPhotoUri`)
3. **Crop Disease Reports** - Disease photos (`photoUri`)

### Firebase Database Structure:
```json
{
  "visits": {
    "visit_id": {
      "photoUri": "file:///local/path/to/image.jpg",
      "customerName": "...",
      ...
    }
  },
  "sessions": {
    "session_id": {
      "startPhotoUri": "file:///local/path/to/start.jpg",
      "endPhotoUri": "file:///local/path/to/end.jpg",
      ...
    }
  },
  "cropReports": {
    "report_id": {
      "photoUri": "file:///local/path/to/crop.jpg",
      ...
    }
  }
}
```

## Limitations of Current Approach

1. **Device-Specific**: Images only exist on the device that captured them
2. **Not Accessible**: Admin/Flask app cannot view these images
3. **Lost on Uninstall**: Images are deleted if app is uninstalled
4. **No Backup**: Images are not backed up to cloud

## Recommended Solution: Firebase Storage

To make images accessible across devices and to admin, you should:

### 1. Install Firebase Storage SDK
```bash
yarn add firebase
```

### 2. Enable Firebase Storage in Console
- Go to Firebase Console → Storage
- Click "Get Started"
- Set security rules

### 3. Upload Images to Firebase Storage
```typescript
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

async function uploadImage(uri: string, path: string): Promise<string> {
  const storage = getStorage();
  const imageRef = storageRef(storage, path);
  
  // Convert URI to blob
  const response = await fetch(uri);
  const blob = await response.blob();
  
  // Upload
  await uploadBytes(imageRef, blob);
  
  // Get download URL
  const downloadURL = await getDownloadURL(imageRef);
  return downloadURL;
}
```

### 4. Update Firebase Helpers
Replace local URIs with cloud URLs:
```typescript
// Before saving to database
const cloudUrl = await uploadImage(
  photoUri, 
  `visits/${employeeId}/${Date.now()}.jpg`
);

// Save cloud URL instead of local URI
await createVisit({
  ...visitData,
  photoUri: cloudUrl  // Now accessible from anywhere
});
```

## Benefits of Cloud Storage

✅ Images accessible from admin dashboard  
✅ Images persist even if app is uninstalled  
✅ Automatic backup and CDN delivery  
✅ Can be viewed in Flask admin panel  
✅ Supports image compression and optimization  

## Current Status

**Images are NOT uploaded to cloud storage** - they only exist locally on the device.

To view images in your Flask admin panel, you must implement Firebase Storage upload functionality.
