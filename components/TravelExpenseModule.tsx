import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { off, onValue, ref } from 'firebase/database';
import { getDistance } from 'geolib';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { createTravelExpense } from '../firebaseHelpers';
import { useSession } from './SessionContext';

interface SavedExpense {
    id: string;
    distanceKm: number;
    taRate: number;
    totalExpense: number;
    date: string;
    createdAt: string;
}

export default function TravelExpenseModule() {
    const { session, employee } = useSession();
    const insets = useSafeAreaInsets();
    
    const [taRate, setTaRate] = useState('6');
    const [distanceKm, setDistanceKm] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [isTracking, setIsTracking] = useState(false);
    const [trackingPoints, setTrackingPoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [savedExpenses, setSavedExpenses] = useState<SavedExpense[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Load saved expenses from Firebase
    useEffect(() => {
        if (!employee) return;

        const expensesRef = ref(db, 'travelExpenses');
        const unsubscribe = onValue(expensesRef, (snapshot) => {
            if (!snapshot.exists()) {
                setSavedExpenses([]);
                return;
            }

            const expenses: SavedExpense[] = [];
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                if (data.employeeId === employee.employeeId) {
                    expenses.push({
                        id: childSnapshot.key || '',
                        distanceKm: data.distanceKm,
                        taRate: data.taRate,
                        totalExpense: data.totalExpense,
                        date: data.date,
                        createdAt: data.createdAt,
                    });
                }
            });

            // Sort by date (newest first)
            expenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setSavedExpenses(expenses);
        });

        return () => off(expensesRef, 'value', unsubscribe);
    }, [employee]);

    useEffect(() => {
        const rate = parseFloat(taRate) || 0;
        setTotalExpense(distanceKm * rate);
    }, [distanceKm, taRate]);

    const startTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to track distance.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setTrackingPoints([{ latitude: location.coords.latitude, longitude: location.coords.longitude }]);
            setIsTracking(true);
            setDistanceKm(0);
            Alert.alert('Tracking Started', 'Distance tracking has begun. Move around and tap "Stop Tracking" when done.');
        } catch (error) {
            Alert.alert('Error', 'Could not start tracking. Please check location permissions.');
        }
    };

    const addTrackingPoint = async () => {
        if (!isTracking) return;

        try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const newPoint = { latitude: location.coords.latitude, longitude: location.coords.longitude };
            
            if (trackingPoints.length > 0) {
                const lastPoint = trackingPoints[trackingPoints.length - 1];
                const distanceMeters = getDistance(lastPoint, newPoint);
                const distanceKmIncrement = distanceMeters / 1000;
                
                setDistanceKm(prev => prev + distanceKmIncrement);
            }
            
            setTrackingPoints(prev => [...prev, newPoint]);
        } catch (error) {
            console.error('Error adding tracking point:', error);
        }
    };

    const stopTracking = () => {
        setIsTracking(false);
        Alert.alert('Tracking Stopped', `Total distance: ${distanceKm.toFixed(2)} KM`);
    };

    const handleSaveExpense = async () => {
        if (!employee || !session.sessionId) {
            Alert.alert('Error', 'No active session found.');
            return;
        }

        if (distanceKm === 0) {
            Alert.alert('Error', 'Distance must be greater than 0.');
            return;
        }

        setIsSaving(true);
        try {
            await createTravelExpense({
                employeeId: employee.employeeId,
                sessionId: session.sessionId,
                distanceKm: parseFloat(distanceKm.toFixed(2)),
                taRate: parseFloat(taRate),
                totalExpense: parseFloat(totalExpense.toFixed(2)),
                date: new Date(),
            });

            Alert.alert('Success', `Travel expense of ₹${totalExpense.toFixed(2)} saved successfully!`);
            
            // Reset
            setDistanceKm(0);
            setTrackingPoints([]);
            setIsTracking(false);
        } catch (error) {
            console.error('Error saving expense:', error);
            Alert.alert('Error', 'Could not save travel expense.');
        } finally {
            setIsSaving(false);
        }
    };

    const totalSavedExpenses = savedExpenses.reduce((sum, exp) => sum + exp.totalExpense, 0);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }
            ]}
        >
            <View style={styles.header}>
                <MaterialIcons name="directions-car" size={40} color="#2196F3" />
                <Text style={styles.title}>Travel Expense Calculator</Text>
            </View>
            <Text style={styles.subtitle}>Track distance and calculate TA reimbursement</Text>

            {/* Toggle View Button */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, !showHistory && styles.toggleButtonActive]}
                    onPress={() => setShowHistory(false)}
                >
                    <MaterialIcons name="add-circle" size={20} color={!showHistory ? '#fff' : '#2196F3'} />
                    <Text style={[styles.toggleText, !showHistory && styles.toggleTextActive]}>New Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, showHistory && styles.toggleButtonActive]}
                    onPress={() => setShowHistory(true)}
                >
                    <MaterialIcons name="history" size={20} color={showHistory ? '#fff' : '#2196F3'} />
                    <Text style={[styles.toggleText, showHistory && styles.toggleTextActive]}>History ({savedExpenses.length})</Text>
                </TouchableOpacity>
            </View>

            {showHistory ? (
                // History View
                <>
                    {savedExpenses.length > 0 && (
                        <View style={styles.totalCard}>
                            <Text style={styles.totalLabel}>Total Expenses</Text>
                            <Text style={styles.totalValue}>₹ {totalSavedExpenses.toFixed(2)}</Text>
                        </View>
                    )}

                    {savedExpenses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="receipt-long" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No expenses recorded yet</Text>
                        </View>
                    ) : (
                        savedExpenses.map((expense) => (
                            <View key={expense.id} style={styles.historyCard}>
                                <View style={styles.historyHeader}>
                                    <MaterialIcons name="receipt" size={24} color="#2196F3" />
                                    <Text style={styles.historyDate}>
                                        {new Date(expense.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </Text>
                                </View>
                                <View style={styles.historyDetails}>
                                    <View style={styles.historyRow}>
                                        <Text style={styles.historyLabel}>Distance:</Text>
                                        <Text style={styles.historyValue}>{expense.distanceKm.toFixed(2)} KM</Text>
                                    </View>
                                    <View style={styles.historyRow}>
                                        <Text style={styles.historyLabel}>TA Rate:</Text>
                                        <Text style={styles.historyValue}>₹{expense.taRate.toFixed(2)} / KM</Text>
                                    </View>
                                    <View style={[styles.historyRow, styles.historyTotal]}>
                                        <Text style={styles.historyTotalLabel}>Total:</Text>
                                        <Text style={styles.historyTotalValue}>₹{expense.totalExpense.toFixed(2)}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </>
            ) : (
                // New Expense View
                <>

            {/* Distance Display */}
            <View style={styles.distanceCard}>
                <MaterialIcons name="straighten" size={48} color="#2196F3" />
                <Text style={styles.distanceValue}>{distanceKm.toFixed(2)} KM</Text>
                <Text style={styles.distanceLabel}>Total Distance Travelled</Text>
            </View>

            {/* TA Rate Input */}
            <View style={styles.inputContainer}>
                <MaterialIcons name="currency-rupee" size={24} color="#999" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="TA Rate per KM"
                    value={taRate}
                    onChangeText={setTaRate}
                    keyboardType="decimal-pad"
                />
                <Text style={styles.inputSuffix}>/ KM</Text>
            </View>

            {/* Total Expense Display */}
            <View style={styles.expenseCard}>
                <Text style={styles.expenseLabel}>Total TA Expense</Text>
                <Text style={styles.expenseValue}>₹ {totalExpense.toFixed(2)}</Text>
                <Text style={styles.expenseFormula}>
                    {distanceKm.toFixed(2)} KM × ₹{taRate} = ₹{totalExpense.toFixed(2)}
                </Text>
            </View>

            {/* Tracking Controls */}
            <View style={styles.trackingSection}>
                {!isTracking ? (
                    <TouchableOpacity style={styles.startButton} onPress={startTracking}>
                        <MaterialIcons name="play-arrow" size={28} color="#fff" />
                        <Text style={styles.startButtonText}>Start Distance Tracking</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.trackingControls}>
                        <TouchableOpacity style={styles.addPointButton} onPress={addTrackingPoint}>
                            <MaterialIcons name="add-location" size={24} color="#fff" />
                            <Text style={styles.addPointText}>Add Point ({trackingPoints.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
                            <MaterialIcons name="stop" size={24} color="#fff" />
                            <Text style={styles.stopButtonText}>Stop</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
                style={[styles.saveButton, (isSaving || distanceKm === 0) && styles.disabledButton]}
                onPress={handleSaveExpense}
                disabled={isSaving || distanceKm === 0}
            >
                <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save Travel Expense'}
                </Text>
                {!isSaving && <MaterialIcons name="save" size={24} color="#000" />}
            </TouchableOpacity>
            </>
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
        fontSize: 28,
        fontWeight: 'bold',
        marginLeft: 10,
        color: '#000',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    distanceCard: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#e3f2fd',
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#2196F3',
    },
    distanceValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#2196F3',
        marginTop: 10,
    },
    distanceLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        paddingHorizontal: 15,
        marginBottom: 20,
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
    inputSuffix: {
        fontSize: 14,
        color: '#999',
        marginLeft: 10,
    },
    expenseCard: {
        alignItems: 'center',
        padding: 25,
        backgroundColor: '#fff9e6',
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#fbb115',
    },
    expenseLabel: {
        fontSize: 16,
        color: '#666',
    },
    expenseValue: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#fbb115',
        marginTop: 10,
    },
    expenseFormula: {
        fontSize: 14,
        color: '#999',
        marginTop: 10,
    },
    trackingSection: {
        marginBottom: 20,
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
    addPointButton: {
        flex: 1,
        backgroundColor: '#2196F3',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 15,
        gap: 8,
    },
    addPointText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    stopButton: {
        backgroundColor: '#f44336',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
        borderRadius: 15,
        gap: 8,
    },
    stopButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
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
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
        padding: 5,
        marginBottom: 20,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    toggleButtonActive: {
        backgroundColor: '#2196F3',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2196F3',
    },
    toggleTextActive: {
        color: '#fff',
    },
    totalCard: {
        alignItems: 'center',
        padding: 25,
        backgroundColor: '#e8f5e9',
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    totalLabel: {
        fontSize: 16,
        color: '#666',
    },
    totalValue: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 10,
    },
    historyCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    historyDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 10,
    },
    historyDetails: {
        gap: 8,
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyLabel: {
        fontSize: 14,
        color: '#666',
    },
    historyValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    historyTotal: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    historyTotalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    historyTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 15,
    },
});
