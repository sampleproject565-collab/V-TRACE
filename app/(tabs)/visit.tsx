import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
    Alert, Image, KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CameraCapture from '../../components/CameraCapture';
import { useSession } from '../../components/SessionContext';
import { createVisit } from '../../firebaseHelpers';

export default function VisitScreen() {
    const { session, employee } = useSession();
    const insets = useSafeAreaInsets();

    const [customerName, setCustomerName] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [purpose, setPurpose] = useState('');
    const [notes, setNotes] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [cameraVisible, setCameraVisible] = useState(false);

    const handlePhotoTaken = (uri: string) => {
        setPhotoUri(uri);
        setCameraVisible(false);
    };

    const handleSaveVisit = async () => {
        if (!employee) return;
        if (!customerName.trim() || !contactInfo.trim() || !purpose.trim() || !photoUri) {
            Alert.alert("Missing Fields", "Please take a site photo and fill all required fields.");
            return;
        }

        setIsSaving(true);
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

            await createVisit({
                sessionId: session.sessionId || 'NO_SESSION',
                employeeId: employee.employeeId,
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                leadName: customerName.trim(),
                leadPhone: contactInfo.trim(),
                notes: `${purpose.trim()} - ${notes.trim()}`,
                photoUri: photoUri,
            });

            Alert.alert("Success", "Customer visit recorded successfully.");

            // clear form
            setCustomerName('');
            setContactInfo('');
            setPurpose('');
            setNotes('');
            setPhotoUri(null);

        } catch (error) {
            console.error("Error saving visit", error);
            Alert.alert("Error", "Could not save the visit. Please check connection and location permissions.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingTop: Math.max(insets.top, 50), paddingBottom: Math.max(insets.bottom, 50) }
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <MaterialIcons name="handshake" size={40} color="#fbb115" />
                    <Text style={styles.title}>Log Visit</Text>
                </View>
                <Text style={styles.subtitle}>Record customer interactions and site visits</Text>

                {/* Photo Capture Section */}
                <View style={styles.photoSection}>
                    {photoUri ? (
                        <View style={styles.imageContainer}>
                            <Image source={{ uri: photoUri }} style={styles.previewImage} />
                            <TouchableOpacity style={styles.retakeButton} onPress={() => setCameraVisible(true)}>
                                <MaterialIcons name="cameraswitch" size={24} color="#fff" />
                                <Text style={styles.retakeText}>Retake Photo</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.captureArea} onPress={() => setCameraVisible(true)}>
                            <MaterialIcons name="add-a-photo" size={48} color="#ccc" />
                            <Text style={styles.captureText}>Take Site Photo {"\n"}(Required)</Text>
                        </TouchableOpacity>
                    )}
                </View>


                {/* Form Section */}
                <View style={styles.formSection}>
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="person" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Customer Name *"
                            value={customerName}
                            onChangeText={setCustomerName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="phone" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Contact Info (Phone/Email) *"
                            value={contactInfo}
                            onChangeText={setContactInfo}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="flag" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Purpose of Visit *"
                            value={purpose}
                            onChangeText={setPurpose}
                        />
                    </View>

                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <MaterialIcons name="note" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Meeting Notes / Confidential Info"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isSaving && styles.disabledButton]}
                        onPress={handleSaveVisit}
                        disabled={isSaving}
                    >
                        <Text style={styles.submitButtonText}>{isSaving ? "Saving..." : "Save Visit Record"}</Text>
                        {!isSaving && <MaterialIcons name="save" size={24} color="#000" />}
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <CameraCapture
                visible={cameraVisible}
                onClose={() => setCameraVisible(false)}
                onPictureTaken={handlePhotoTaken}
                cameraType="back"
            />
        </KeyboardAvoidingView>
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
        marginBottom: 20,
    },
    photoSection: {
        marginBottom: 20,
    },
    captureArea: {
        width: '100%',
        height: 200,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#e5e5e5',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 10,
        fontSize: 16,
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        height: 250,
        borderRadius: 20,
        overflow: 'hidden',
    },
    previewContainer: {
        width: '100%',
        height: '100%',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    gpsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 10,
    },
    gpsText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    gpsTextTime: {
        color: '#fbb115',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
    },
    retakeButton: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.7)',
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        gap: 5,
    },
    retakeText: {
        color: '#fff',
        fontWeight: '600',
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
        height: 100,
    },
    submitButton: {
        backgroundColor: '#fbb115',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 15,
        marginTop: 10,
        gap: 10,
        elevation: 4,
        shadowColor: '#fbb115',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    disabledButton: {
        backgroundColor: '#e5e5e5',
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    }
});
