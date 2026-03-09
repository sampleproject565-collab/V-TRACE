import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createCropReport } from '../firebaseHelpers';
import CameraCapture from './CameraCapture';
import { useSession } from './SessionContext';

export default function CropDiseaseModule() {
    const { session, employee } = useSession();
    const insets = useSafeAreaInsets();

    const [cropName, setCropName] = useState('');
    const [disease, setDisease] = useState('');
    const [notes, setNotes] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [cameraVisible, setCameraVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handlePhotoTaken = (uri: string) => {
        setPhotoUri(uri);
        setCameraVisible(false);
    };

    const handleSaveReport = async () => {
        if (!employee || !session.sessionId) {
            Alert.alert('Error', 'No active session found.');
            return;
        }

        if (!cropName.trim() || !disease.trim() || !photoUri) {
            Alert.alert('Missing Fields', 'Please fill crop name, disease, and take a photo.');
            return;
        }

        setIsSaving(true);
        try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

            await createCropReport({
                employeeId: employee.employeeId,
                sessionId: session.sessionId,
                cropName: cropName.trim(),
                disease: disease.trim(),
                notes: notes.trim(),
                photoUri: photoUri,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            Alert.alert('Success', 'Crop disease report saved successfully!');

            // Reset form
            setCropName('');
            setDisease('');
            setNotes('');
            setPhotoUri(null);
        } catch (error) {
            console.error('Error saving crop report:', error);
            Alert.alert('Error', 'Could not save crop report. Please check location permissions.');
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
                <MaterialIcons name="bug-report" size={40} color="#FF5722" />
                <Text style={styles.title}>Crop Disease Report</Text>
            </View>
            <Text style={styles.subtitle}>Document crop health and disease issues</Text>

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
                        <Text style={styles.captureText}>Take Crop Photo {"\n"}(Required)</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
                <View style={styles.inputContainer}>
                    <MaterialIcons name="grass" size={24} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Crop Name (e.g., Tomato, Rice) *"
                        value={cropName}
                        onChangeText={setCropName}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <MaterialIcons name="warning" size={24} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Disease Name (e.g., Leaf Spot) *"
                        value={disease}
                        onChangeText={setDisease}
                    />
                </View>

                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <MaterialIcons name="note" size={24} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Disease Notes & Observations"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.disabledButton]}
                    onPress={handleSaveReport}
                    disabled={isSaving}
                >
                    <Text style={styles.saveButtonText}>
                        {isSaving ? 'Saving...' : 'Save Crop Report'}
                    </Text>
                    {!isSaving && <MaterialIcons name="save" size={24} color="#fff" />}
                </TouchableOpacity>
            </View>

            <CameraCapture
                visible={cameraVisible}
                onClose={() => setCameraVisible(false)}
                onPictureTaken={handlePhotoTaken}
                cameraType="back"
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
    previewImage: {
        width: '100%',
        height: '100%',
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
    saveButton: {
        backgroundColor: '#FF5722',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 15,
        marginTop: 10,
        gap: 10,
    },
    disabledButton: {
        backgroundColor: '#e5e5e5',
        opacity: 0.7,
    },
    saveButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
});
