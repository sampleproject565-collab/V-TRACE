# Field Measurement Database Structure

## Updated Implementation

Field measurements are now saved to Firebase Realtime Database with detailed information including field name, location name, and uploader name.

## Firebase Database Structure

```json
{
  "fieldMeasurements": {
    "measurement_id_1": {
      "employeeId": "EMP001",
      "sessionId": "session_xyz",
      "fieldName": "North Field",
      "locationName": "Village Name / Area Name",
      "uploaderName": "John Doe",
      "customerName": "North Field - Village Name",
      "points": [
        { "latitude": 11.0168, "longitude": 76.9558 },
        { "latitude": 11.0169, "longitude": 76.9559 },
        { "latitude": 11.0170, "longitude": 76.9560 },
        { "latitude": 11.0171, "longitude": 76.9557 }
      ],
      "areaSquareMeters": 1234.56,
      "areaAcres": 0.3051,
      "areaSquareFeet": 13289.45,
      "notes": "Additional notes\n\nMeasurement Quality: Excellent (Avg Accuracy: 3.2m, 4 points)",
      "timestamp": "2026-03-09T10:30:00.000Z"
    }
  }
}
```

## Field Descriptions

### Required Fields:
- **fieldName**: Name of the field being measured (e.g., "North Field", "Plot A", "Farm Section 1")
- **locationName**: Location/village/area name where the field is located
- **uploaderName**: Name of the person who uploaded/measured the field
- **points**: Array of GPS coordinates forming the polygon (minimum 3 points)
- **areaSquareMeters**: Calculated area in square meters
- **areaAcres**: Calculated area in acres
- **areaSquareFeet**: Calculated area in square feet

### Optional Fields:
- **notes**: Additional notes about the measurement
- **customerName**: Backward compatibility field (auto-generated from fieldName + locationName)

### Auto-Generated Fields:
- **employeeId**: ID of the employee who performed the measurement
- **sessionId**: Active session ID when measurement was taken
- **timestamp**: ISO timestamp of when measurement was saved

## Measurement Quality Information

The system automatically adds measurement quality information to the notes:
- **Excellent**: Average GPS accuracy < 5 meters
- **Good**: Average GPS accuracy 5-10 meters
- **Fair**: Average GPS accuracy > 10 meters

Example note:
```
User's additional notes here

Measurement Quality: Excellent (Avg Accuracy: 3.2m, 4 points)
```

## GPS Accuracy Features

1. **Multiple Readings**: Takes 5 GPS readings per point and averages them
2. **Accuracy Filtering**: Rejects readings with accuracy > 10 meters
3. **Real-time Monitoring**: Shows current GPS accuracy while tracking
4. **Quality Indicators**: Color-coded accuracy display (Green/Yellow/Red)

## Accessing Data in Flask Admin

To retrieve field measurements for a specific employee:

```python
import firebase_admin
from firebase_admin import db

# Get all measurements for an employee
ref = db.reference('fieldMeasurements')
measurements = ref.order_by_child('employeeId').equal_to('EMP001').get()

for measurement_id, data in measurements.items():
    print(f"Field: {data['fieldName']}")
    print(f"Location: {data['locationName']}")
    print(f"Uploader: {data['uploaderName']}")
    print(f"Area: {data['areaAcres']} acres")
    print(f"Points: {len(data['points'])}")
    print(f"Timestamp: {data['timestamp']}")
    print("---")
```

## Query Examples

### Get measurements by location:
```python
ref = db.reference('fieldMeasurements')
measurements = ref.order_by_child('locationName').equal_to('Village Name').get()
```

### Get measurements by uploader:
```python
ref = db.reference('fieldMeasurements')
measurements = ref.order_by_child('uploaderName').equal_to('John Doe').get()
```

### Get measurements by date range:
```python
from datetime import datetime, timedelta

ref = db.reference('fieldMeasurements')
all_measurements = ref.get()

# Filter by date
today = datetime.now()
week_ago = today - timedelta(days=7)

recent = {
    k: v for k, v in all_measurements.items()
    if datetime.fromisoformat(v['timestamp'].replace('Z', '+00:00')) > week_ago
}
```

## Map Visualization

The GPS points can be used to visualize the field on a map:

```python
import folium

# Create map centered on first point
m = folium.Map(
    location=[data['points'][0]['latitude'], data['points'][0]['longitude']],
    zoom_start=18
)

# Add polygon
coordinates = [(p['latitude'], p['longitude']) for p in data['points']]
folium.Polygon(
    locations=coordinates,
    color='blue',
    fill=True,
    fillColor='cyan',
    fillOpacity=0.3,
    popup=f"{data['fieldName']} - {data['areaAcres']:.4f} acres"
).add_to(m)

m.save('field_map.html')
```

## Data Validation

The app ensures:
- Minimum 3 GPS points for valid polygon
- All required fields are filled before saving
- GPS accuracy is monitored and poor readings are rejected
- Area calculations use high-precision Turf.js library
- Measurements are linked to active session

## Benefits

✅ Detailed field identification with name and location  
✅ Uploader tracking for accountability  
✅ High-precision GPS measurements with quality indicators  
✅ Multiple unit conversions (acres, sq ft, sq m)  
✅ Real-time Firebase sync  
✅ Map visualization support  
✅ Quality metrics included in notes  
