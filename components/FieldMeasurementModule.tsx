import { MaterialIcons } from '@expo/vector-icons';
import * as turf from '@turf/turf';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createFieldMeasurement } from '../firebaseHelpers';
import { useSession } from './SessionContext';

interface GPSPoint {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
}

export default function FieldMeasurementModule() {
    const { session, employee } = useSession();
    const insets = useSafeAreaInsets();

    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [points, setPoints] = useState<GPSPoint[]>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [area, setArea] = useState({ sqMeters: 0, acres: 0, sqFeet: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
    const [isWaitingForAccuracy, setIsWaitingForAccuracy] = useState(false);
    const [mapRegion, setMapRegion] = useState({
        latitude: 11.0168,
        longitude: 76.9558,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    });

    // Monitor GPS accuracy in real-time
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        const startMonitoring = async () => {
            if (isTracking) {
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 1000,
                        distanceInterval: 0,
                    },
                    (location) => {
                        setCurrentAccuracy(location.coords.accuracy || null);
                    }
                );
            }
        };

        startMonitoring();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, [isTracking]);

    const startTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required for accurate measurements.');
                return;
            }

            // Request background location for better accuracy
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            
            Alert.alert(
                'GPS Accuracy Tips',
                '• Stand in an open area\n• Wait for GPS signal to stabilize\n• Avoid buildings and trees\n• Keep phone steady when adding points\n• Best accuracy: < 5 meters',
                [{ text: 'Got it', onPress: () => initializeTracking() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Could not initialize GPS. Please check permissions.');
        }
    };

    const initializeTracking = async () => {
        try {
            // Get initial high-accuracy location
            const location = await Location.getCurrentPositionAsync({ 
                accuracy: Location.Accuracy.BestForNavigation,
            });
            
            setMapRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.002, // Zoomed in for better precision
                longitudeDelta: 0.002,
            });

            setPoints([]);
            setArea({ sqMeters: 0, acres: 0, sqFeet: 0 });
            setIsTracking(true);
            setCurrentAccuracy(location.coords.accuracy || null);
        } catch (error) {
            Alert.alert('Error', 'Could not get GPS location. Please ensure GPS is enabled.');
        }
    };

    const addPoint = async () => {
        if (!isTracking) return;

        setIsWaitingForAccuracy(true);

        try {
            // Take multiple readings for better accuracy
            const readings: Location.LocationObject[] = [];
            
            for (let i = 0; i < 5; i++) {
                const location = await Location.getCurrentPositionAsync({ 
                    accuracy: Location.Accuracy.BestForNavigation,
                });
                readings.push(location);
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between readings
            }

            // Filter out readings with poor accuracy (> 10 meters)
            const goodReadings = readings.filter(r => (r.coords.accuracy || 999) < 10);
            
            if (goodReadings.length === 0) {
                Alert.alert(
                    'Poor GPS Signal',
                    'GPS accuracy is too low. Please:\n• Move to an open area\n• Wait for better signal\n• Try again',
                    [{ text: 'OK' }]
                );
                setIsWaitingForAccuracy(false);
                return;
            }

            // Calculate average position from good readings
            const avgLat = goodReadings.reduce((sum, r) => sum + r.coords.latitude, 0) / goodReadings.length;
            const avgLng = goodReadings.reduce((sum, r) => sum + r.coords.longitude, 0) / goodReadings.length;
            const avgAccuracy = goodReadings.reduce((sum, r) => sum + (r.coords.accuracy || 0), 0) / goodReadings.length;

            const newPoint: GPSPoint = {
                latitude: avgLat,
                longitude: avgLng,
                accuracy: avgAccuracy,
                timestamp: Date.now(),
            };

            setPoints(prev => [...prev, newPoint]);
            
            // Update map to show new point
            setMapRegion({
                latitude: avgLat,
                longitude: avgLng,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
            });

            Alert.alert(
                'Point Added',
                `Accuracy: ${avgAccuracy.toFixed(1)}m\nPoints: ${points.length + 1}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert('Error', 'Could not add point. Please try again.');
        } finally {
            setIsWaitingForAccuracy(false);
        }
    };

    const calculateArea = () => {
        if (points.length < 3) {
            Alert.alert('Not Enough Points', 'You need at least 3 points to calculate area.');
            return;
        }

        try {
            // Create a polygon using turf with high precision
            const coordinates = points.map(p => [p.longitude, p.latitude]);
            coordinates.push(coordinates[0]); // Close the polygon
            
            const polygon = turf.polygon([coordinates]);
            const areaSquareMeters = turf.area(polygon);
            
            // Convert to acres and square feet with high precision
            const areaAcres = areaSquareMeters * 0.000247105;
            const areaSquareFeet = areaSquareMeters * 10.7639;

            // Calculate average accuracy
            const avgAccuracy = points.reduce((sum, p) => sum + p.accuracy, 0) / points.length;

            setArea({
                sqMeters: areaSquareMeters,
                acres: areaAcres,
                sqFeet: areaSquareFeet,
            });

            setIsTracking(false);
            
            Alert.alert(
                'Area Calculated',
                `Area: ${areaAcres.toFixed(4)} Acres\n${areaSquareFeet.toFixed(2)} sq ft\n${areaSquareMeters.toFixed(2)} sq m\n\nAvg GPS Accuracy: ${avgAccuracy.toFixed(1)}m\nPoints Used: ${points.length}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error calculating area:', error);
            Alert.alert('Error', 'Could not calculate area. Make sure points form a valid polygon.');
        }
    };

    const clearPoints = () => {
        Alert.alert('Clear Points', 'Are you sure you want to clear all points?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear',
                style: 'destructive',
                onPress: () => {
                    setPoints([]);
                    setArea({ sqMeters: 0, acres: 0, sqFeet: 0 });
                    setIsTracking(false);
                }
            }
        ]);
    };

    const handleSaveMeasurement = async () => {
        if (!employee || !session.sessionId) {
            Alert.alert('Error', 'No active session found.');
            return;
        }

        if (!customerName.trim() || points.length < 3 || area.sqMeters === 0) {
            Alert.alert('Missing Data', 'Please enter customer name and measure the field area.');
            return;
        }

        setIsSaving(true);
        try {
            // Calculate measurement quality
            const avgAccuracy = points.reduce((sum, p) => sum + p.accuracy, 0) / points.length;
            const qualityNote = avgAccuracy < 5 ? 'Excellent' : avgAccuracy < 10 ? 'Good' : 'Fair';

            await createFieldMeasurement({
                employeeId: employee.employeeId,
                sessionId: session.sessionId,
                customerName: customerName.trim(),
                points: points.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
                areaSquareMeters: parseFloat(area.sqMeters.toFixed(2)),
                areaAcres: parseFloat(area.acres.toFixed(4)),
                areaSquareFeet: parseFloat(area.sqFeet.toFixed(2)),
                notes: `${notes.trim()}\n\nMeasurement Quality: ${qualityNote} (Avg Accuracy: ${avgAccuracy.toFixed(1)}m, ${points.length} points)`,
            });

            Alert.alert('Success', 'Field measurement saved successfully!');

            // Reset
            setCustomerName('');
            setNotes('');
            setPoints([]);
            setArea({ sqMeters: 0, acres: 0, sqFeet: 0 });
        } catch (error) {
            console.error('Error saving measurement:', error);
            Alert.alert('Error', 'Could not save field measurement.');
        } finally {
            setIsSaving(false);
        }
    };

    const getAccuracyColor = (accuracy: number | null) => {
        if (!accuracy) return '#999';
        if (accuracy < 5) return '#4CAF50'; // Excellent
        if (accuracy < 10) return '#FFC107'; // Good
        return '#f44336'; // Poor
    };

    const getAccuracyLabel = (accuracy: number | null) => {
        if (!accuracy) return 'Waiting...';
        if (accuracy < 5) return 'Excellent';
        if (accuracy < 10) return 'Good';
        return 'Poor';
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }
            ]}
        >
            <View style={styles.header}>
                <MaterialIcons name="square-foot" size={40} color="#00BCD4" />
                <Text style={styles.title}>Field Measurement</Text>
            </View>
            <Text style={styles.subtitle}>High-precision GPS polygon measurement</Text>

            {/* GPS Accuracy Indicator */}
            {isTracking && (
                <View style={[styles.accuracyCard, { borderColor: getAccuracyColor(currentAccuracy) }]}>
                    <MaterialIcons name="gps-fixed" size={24} color={getAccuracyColor(currentAccuracy)} />
                    <View style={styles.accuracyInfo}>
                        <Text style={styles.accuracyLabel}>GPS Accuracy</Text>
                        <Text style={[styles.accuracyValue, { color: getAccuracyColor(currentAccuracy) }]}>
                            {currentAccuracy ? `±${currentAccuracy.toFixed(1)}m` : 'Acquiring...'}
                        </Text>
                        <Text style={styles.accuracyStatus}>{getAccuracyLabel(currentAccuracy)}</Text>
                    </View>
                </View>
            )}

            {/* Map View */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    region={mapRegion}
                    showsUserLocation
                    showsMyLocationButton
                    mapType="hybrid"
                >
                    {points.map((point, index) => (
                        <Marker
                            key={index}
                            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                            title={`Point ${index + 1}`}
                            description={`Accuracy: ±${point.accuracy.toFixed(1)}m`}
                            pinColor={point.accuracy < 5 ? '#4CAF50' : point.accuracy < 10 ? '#FFC107' : '#f44336'}
                        />
                    ))}
                    {points.length >= 3 && (
                        <Polygon
                            coordinates={points.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
                            strokeColor="#00BCD4"
                            fillColor="rgba(0, 188, 212, 0.3)"
                            strokeWidth={3}
                        />
                    )}
                </MapView>
            </View>

            {/* Tracking Controls */}
            <View style={styles.controlsSection}>
                {!isTracking && points.length === 0 ? (
                    <TouchableOpacity style={styles.startButton} onPress={startTracking}>
                        <MaterialIcons name="play-arrow" size={28} color="#fff" />
                        <Text style={styles.startButtonText}>Start Measurement</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.trackingControls}>
                        <TouchableOpacity
                            style={[styles.controlButton, styles.addButton, isWaitingForAccuracy && styles.disabledButton]}
                            onPress={addPoint}
                            disabled={!isTracking || isWaitingForAccuracy}
                        >
                            {isWaitingForAccuracy ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <MaterialIcons name="add-location" size={24} color="#fff" />
                            )}
                            <Text style={styles.controlButtonText}>
                                {isWaitingForAccuracy ? 'Reading...' : `Add Point (${points.length})`}
                            </Text>
                        </TouchableOpacity>
                        
                        {points.length >= 3 && (
                            <TouchableOpacity
                                style={[styles.controlButton, styles.calculateButton]}
                                onPress={calculateArea}
                            >
                                <MaterialIcons name="calculate" size={24} color="#fff" />
                                <Text style={styles.controlButtonText}>Calculate</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                            style={[styles.controlButton, styles.clearButton]}
                            onPress={clearPoints}
                        >
                            <MaterialIcons name="clear" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Area Display */}
            {area.sqMeters > 0 && (
                <View style={styles.areaCard}>
                    <Text style={styles.areaTitle}>Measured Area</Text>
                    <View style={styles.areaValues}>
                        <View style={styles.areaItem}>
                            <Text style={styles.areaValue}>{area.acres.toFixed(4)}</Text>
                            <Text style={styles.areaUnit}>Acres</Text>
                        </View>
                        <View style={styles.areaItem}>
                            <Text style={styles.areaValue}>{area.sqFeet.toFixed(2)}</Text>
                            <Text style={styles.areaUnit}>sq ft</Text>
                        </View>
                        <View style={styles.areaItem}>
                            <Text style={styles.areaValue}>{area.sqMeters.toFixed(2)}</Text>
                            <Text style={styles.areaUnit}>sq m</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Form Section */}
            {area.sqMeters > 0 && (
                <View style={styles.formSection}>
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="person" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Customer/Farmer Name *"
                            value={customerName}
                            onChangeText={setCustomerName}
                        />
                    </View>

                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <MaterialIcons name="note" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Additional Notes"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.disabledButton]}
                        onPress={handleSaveMeasurement}
                        disabled={isSaving}
                    >
                        <Text style={styles.saveButtonText}>
                            {isSaving ? 'Saving...' : 'Save Measurement'}
                        </Text>
                        {!isSaving && <MaterialIcons name="save" size={24} color="#000" />}
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginLeft: 10,
        color: '#000',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 15,
    },
    accuracyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderWidth: 2,
        gap: 12,
    },
    accuracyInfo: {
        flex: 1,
    },
    accuracyLabel: {
        fontSize: 12,
        color: '#666',
    },
    accuracyValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 2,
    },
    accuracyStatus: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    mapContainer: {
        height: 300,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#e5e5e5',
    },
    map: {
        flex: 1,
    },
    controlsSection: {
        marginBottom: 15,
    },
    startButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 15,
        gap: 10,
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    trackingControls: {
        flexDirection: 'row',
        gap: 10,
    },
    controlButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        gap: 8,
    },
    addButton: {
        backgroundColor: '#00BCD4',
    },
    calculateButton: {
        backgroundColor: '#4CAF50',
    },
    clearButton: {
        backgroundColor: '#f44336',
        flex: 0,
        paddingHorizontal: 20,
    },
    controlButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
    },
    areaCard: {
        backgroundColor: '#e0f7fa',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#00BCD4',
    },
    areaTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 15,
        textAlign: 'center',
    },
    areaValues: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    areaItem: {
        alignItems: 'center',
    },
    areaValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#00BCD4',
    },
    areaUnit: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    formSection: {
        gap: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        paddingHorizontal: 15,
    },
    textAreaContainer: {
        alignItems: 'flex-start',
        paddingTop: 15,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: '#000',
    },
    textArea: {
        height: 80,
    },
    saveButton: {
        backgroundColor: '#fbb115',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 15,
        gap: 10,
    },
    disabledButton: {
        backgroundColor: '#e5e5e5',
        opacity: 0.7,
    },
    saveButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
});
