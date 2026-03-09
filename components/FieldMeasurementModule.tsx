import { MaterialIcons } from '@expo/vector-icons';
import * as turf from '@turf/turf';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
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

export default function FieldMeasurementModule() {
    const { session, employee } = useSession();
    const insets = useSafeAreaInsets();

    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [points, setPoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [area, setArea] = useState({ sqMeters: 0, acres: 0, sqFeet: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [mapRegion, setMapRegion] = useState({
        latitude: 11.0168,
        longitude: 76.9558,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    });

    const startTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            
            setMapRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });

            setPoints([]);
            setArea({ sqMeters: 0, acres: 0, sqFeet: 0 });
            setIsTracking(true);
            Alert.alert('Tracking Started', 'Walk around the field boundary and tap "Add Point" at each corner.');
        } catch (error) {
            Alert.alert('Error', 'Could not get location. Please check permissions.');
        }
    };

    const addPoint = async () => {
        if (!isTracking) return;

        try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const newPoint = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setPoints(prev => [...prev, newPoint]);
            
            // Update map region to center on new point
            setMapRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        } catch (error) {
            Alert.alert('Error', 'Could not add point.');
        }
    };

    const calculateArea = () => {
        if (points.length < 3) {
            Alert.alert('Not Enough Points', 'You need at least 3 points to calculate area.');
            return;
        }

        try {
            // Create a polygon using turf
            const coordinates = points.map(p => [p.longitude, p.latitude]);
            coordinates.push(coordinates[0]); // Close the polygon
            
            const polygon = turf.polygon([coordinates]);
            const areaSquareMeters = turf.area(polygon);
            
            // Convert to acres and square feet
            const areaAcres = areaSquareMeters * 0.000247105;
            const areaSquareFeet = areaSquareMeters * 10.7639;

            setArea({
                sqMeters: areaSquareMeters,
                acres: areaAcres,
                sqFeet: areaSquareFeet,
            });

            setIsTracking(false);
            Alert.alert(
                'Area Calculated',
                `Area: ${areaAcres.toFixed(2)} Acres\n${areaSquareFeet.toFixed(0)} sq ft\n${areaSquareMeters.toFixed(0)} sq m`
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
            await createFieldMeasurement({
                employeeId: employee.employeeId,
                sessionId: session.sessionId,
                customerName: customerName.trim(),
                points: points,
                areaSquareMeters: parseFloat(area.sqMeters.toFixed(2)),
                areaAcres: parseFloat(area.acres.toFixed(4)),
                areaSquareFeet: parseFloat(area.sqFeet.toFixed(2)),
                notes: notes.trim(),
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
                <Text style={styles.title}>Field Area Measurement</Text>
            </View>
            <Text style={styles.subtitle}>Measure farm land using GPS polygon</Text>

            {/* Map View */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    region={mapRegion}
                    showsUserLocation
                    showsMyLocationButton
                >
                    {points.map((point, index) => (
                        <Marker
                            key={index}
                            coordinate={point}
                            title={`Point ${index + 1}`}
                        />
                    ))}
                    {points.length >= 3 && (
                        <Polygon
                            coordinates={points}
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
                        <Text style={styles.startButtonText}>Start Field Measurement</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.trackingControls}>
                        <TouchableOpacity
                            style={[styles.controlButton, styles.addButton]}
                            onPress={addPoint}
                            disabled={!isTracking}
                        >
                            <MaterialIcons name="add-location" size={24} color="#fff" />
                            <Text style={styles.controlButtonText}>Add Point ({points.length})</Text>
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
                            <Text style={styles.areaValue}>{area.acres.toFixed(2)}</Text>
                            <Text style={styles.areaUnit}>Acres</Text>
                        </View>
                        <View style={styles.areaItem}>
                            <Text style={styles.areaValue}>{area.sqFeet.toFixed(0)}</Text>
                            <Text style={styles.areaUnit}>sq ft</Text>
                        </View>
                        <View style={styles.areaItem}>
                            <Text style={styles.areaValue}>{area.sqMeters.toFixed(0)}</Text>
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
