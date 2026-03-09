import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CameraCapture from '../../components/CameraCapture';
import { useSession } from '../../components/SessionContext';

export default function SessionScreen() {
    const { session, startSession, pauseSession, resumeSession, closeSession } = useSession();
    const [cameraVisible, setCameraVisible] = useState(false);
    const [actionType, setActionType] = useState<'START' | 'CLOSE' | null>(null);
    const [selectedWorkType, setSelectedWorkType] = useState<'OFFICE' | 'FIELD' | 'FARM'>('OFFICE');
    const insets = useSafeAreaInsets();

    const handleCameraAction = async (photoUri: string) => {
        setCameraVisible(false);
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            if (actionType === 'START') {
                await startSession(loc.coords, photoUri, selectedWorkType);
            } else if (actionType === 'CLOSE') {
                await closeSession(loc.coords, photoUri);
            }
            setActionType(null);
            Alert.alert("Success", actionType === 'START' ? "Work day started!" : "Work day closed!");
        } catch (e) {
            console.error("Location or Save Error", e);
            Alert.alert("Location Error", "Could not get current location. Ensure permissions are granted.");
            setActionType(null);
        }
    };

    const attemptStart = () => {
        setActionType('START');
        setCameraVisible(true);
    };

    const attemptClose = () => {
        Alert.alert("Close Work Day", "Are you sure you want to end your shift? This will finalize your work hours.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Confirm", onPress: () => {
                    setActionType('CLOSE');
                    setCameraVisible(true);
                }
            }
        ]);
    };

    const handlePause = async () => {
        await pauseSession();
    };

    const handleResume = async () => {
        await resumeSession();
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { paddingTop: Math.max(insets.top, 50), paddingBottom: Math.max(insets.bottom, 50) }
            ]}
        >
            <View style={styles.header}>
                <MaterialIcons name="timer" size={40} color="#fbb115" />
                <Text style={styles.title}>S2C Session</Text>
            </View>
            <Text style={styles.subtitle}>Start-To-Close Work Tracker</Text>

            <View style={[styles.stateCard, session.isActive ? (session.isPaused ? styles.stateCardPaused : styles.stateCardActive) : null]}>
                <Text style={styles.stateTextLabel}>Current Status</Text>
                <Text style={styles.stateText}>
                    {!session.isActive ? "Not Started" : (session.isPaused ? "On Break" : "Active Working")}
                </Text>
            </View>

            {!session.isActive ? (
                <View style={styles.actionContainer}>
                    <Text style={styles.instructionText}>Select your work type and tap below to start your shift.</Text>

                    <View style={styles.workTypeContainer}>
                        <TouchableOpacity
                            style={[styles.workTypeBtn, selectedWorkType === 'OFFICE' && styles.workTypeBtnActive]}
                            onPress={() => setSelectedWorkType('OFFICE')}
                        >
                            <MaterialIcons name="business" size={24} color={selectedWorkType === 'OFFICE' ? '#000' : '#666'} />
                            <Text style={[styles.workTypeText, selectedWorkType === 'OFFICE' && styles.workTypeTextActive]}>Office</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.workTypeBtn, selectedWorkType === 'FIELD' && styles.workTypeBtnActive]}
                            onPress={() => setSelectedWorkType('FIELD')}
                        >
                            <MaterialIcons name="directions-car" size={24} color={selectedWorkType === 'FIELD' ? '#000' : '#666'} />
                            <Text style={[styles.workTypeText, selectedWorkType === 'FIELD' && styles.workTypeTextActive]}>Field</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.workTypeBtn, selectedWorkType === 'FARM' && styles.workTypeBtnActive]}
                            onPress={() => setSelectedWorkType('FARM')}
                        >
                            <MaterialIcons name="agriculture" size={24} color={selectedWorkType === 'FARM' ? '#000' : '#666'} />
                            <Text style={[styles.workTypeText, selectedWorkType === 'FARM' && styles.workTypeTextActive]}>Farm</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.mainButton} onPress={attemptStart}>
                        <MaterialIcons name="play-circle-filled" size={40} color="#000" />
                        <Text style={styles.mainButtonText}>Start Day</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.actionContainer}>
                    <View style={styles.timeInfoCard}>
                        <View style={styles.timeRow}>
                            <Text style={styles.timeLabel}>Started At:</Text>
                            <Text style={styles.timeValue}>
                                {session.startTime ? session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                            </Text>
                        </View>
                        {session.isPaused && session.breakStartTime && (
                            <View style={styles.timeRow}>
                                <Text style={styles.timeLabel}>Break Started At:</Text>
                                <Text style={styles.timeValue}>
                                    {session.breakStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.controlsContainer}>
                        {session.isPaused ? (
                            <>
                                <View style={styles.warningBox}>
                                    <MaterialIcons name="notifications-active" size={24} color="#fbb115" />
                                    <Text style={styles.warningText}>You are currently on a break. Return to work to resume background tracking.</Text>
                                </View>
                                <TouchableOpacity style={[styles.controlButton, styles.resumeButton]} onPress={handleResume}>
                                    <MaterialIcons name="play-arrow" size={28} color="#000" />
                                    <Text style={styles.controlButtonText}>Resume Work</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity style={[styles.controlButton, styles.pauseButton]} onPress={handlePause}>
                                <MaterialIcons name="pause" size={28} color="#000" />
                                <Text style={styles.controlButtonText}>Take Break</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[styles.controlButton, styles.closeButton]} onPress={attemptClose}>
                            <MaterialIcons name="stop" size={28} color="#fff" />
                            <Text style={[styles.controlButtonText, { color: '#fff' }]}>Close Day</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <CameraCapture
                visible={cameraVisible}
                onClose={() => { setCameraVisible(false); setActionType(null); }}
                onPictureTaken={handleCameraAction}
                cameraType="front"
            />
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
        fontSize: 32,
        fontWeight: 'bold',
        marginLeft: 10,
        color: '#000',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    stateCard: {
        backgroundColor: '#f5f5f5',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#e5e5e5',
    },
    stateCardActive: {
        backgroundColor: '#e6ffe6',
        borderColor: '#4ade80',
    },
    stateCardPaused: {
        backgroundColor: '#fff5e6',
        borderColor: '#fbb115',
    },
    stateTextLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    stateText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    actionContainer: {
        alignItems: 'center',
    },
    instructionText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
    },
    mainButton: {
        backgroundColor: '#fbb115',
        width: '100%',
        paddingVertical: 20,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#fbb115',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        gap: 10,
    },
    mainButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    timeInfoCard: {
        width: '100%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        marginBottom: 25,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    timeLabel: {
        fontSize: 16,
        color: '#666',
    },
    timeValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    controlsContainer: {
        width: '100%',
        gap: 15,
    },
    controlButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    pauseButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 2,
        borderColor: '#e5e5e5',
    },
    resumeButton: {
        backgroundColor: '#fbb115',
        elevation: 4,
        shadowColor: '#fbb115',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    closeButton: {
        backgroundColor: '#ef4444',
        elevation: 4,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginTop: 10,
    },
    controlButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: '#fff5e6',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#fbb115',
        marginBottom: 10,
        gap: 10,
    },
    warningText: {
        flex: 1,
        color: '#666',
        fontSize: 14,
        lineHeight: 20,
    },
    workTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
        gap: 10,
    },
    workTypeBtn: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e5e5e5',
        gap: 5,
    },
    workTypeBtnActive: {
        backgroundColor: '#fff5e6',
        borderColor: '#fbb115',
    },
    workTypeText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    workTypeTextActive: {
        color: '#000',
    }
});
