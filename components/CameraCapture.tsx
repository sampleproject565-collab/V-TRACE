import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

interface CameraCaptureProps {
    visible: boolean;
    onClose: () => void;
    onPictureTaken: (uri: string) => void;
    cameraType?: 'front' | 'back';
}

export default function CameraCapture({ visible, onClose, onPictureTaken, cameraType = 'back' }: CameraCaptureProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState(cameraType);
    const cameraRef = useRef<CameraView>(null);
    const viewShotRef = useRef<View>(null);

    const [addressText, setAddressText] = useState('Fetching GPS Details...');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (visible) {
            setCapturedImage(null);
            setIsProcessing(false);
            (async () => {
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const results = await Location.reverseGeocodeAsync(loc.coords);
                    if (results && results.length > 0) {
                        const place = results[0];
                        setAddressText(`${place.name || ''} ${place.street || ''}\n${place.city || ''}, ${place.region || ''} ${place.postalCode || ''}`);
                    } else {
                        setAddressText(`Lat: ${loc.coords.latitude.toFixed(4)}, Lng: ${loc.coords.longitude.toFixed(4)}`);
                    }
                } catch (e) {
                    setAddressText('GPS Unavailable');
                }
            })();
        }
    }, [visible]);

    if (!visible) return null;

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <Modal visible={visible} animationType="slide">
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>We need your permission to show the camera</Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                        <Text style={styles.permissionButtonText}>Allow Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={[styles.permissionButton, { backgroundColor: '#ccc', marginTop: 10 }]}>
                        <Text style={styles.permissionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            setIsProcessing(true);
            const photo = await cameraRef.current.takePictureAsync();
            if (photo) {
                setCapturedImage(photo.uri);
            }
            setIsProcessing(false);
        }
    };

    const confirmPicture = async () => {
        if (viewShotRef.current) {
            setIsProcessing(true);
            try {
                const finalUri = await captureRef(viewShotRef, {
                    format: "jpg",
                    quality: 0.8,
                });
                onPictureTaken(finalUri);
                setCapturedImage(null);
            } catch (err) {
                console.error("ViewShot failed", err);
                onPictureTaken(capturedImage!); // fallback
            }
            setIsProcessing(false);
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const renderOverlay = () => (
        <View style={styles.gpsOverlay}>
            <Text style={styles.gpsText}>{addressText}</Text>
            <Text style={styles.gpsTextTime}>{new Date().toLocaleString()}</Text>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                {!capturedImage ? (
                    <>
                        <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
                        {renderOverlay()}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <MaterialIcons name="close" size={30} color="white" />
                            </TouchableOpacity>

                            <View style={styles.bottomControls}>
                                <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                                    <MaterialIcons name="flip-camera-ios" size={30} color="white" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={isProcessing}>
                                    <View style={[styles.captureInner, isProcessing && { backgroundColor: '#ccc' }]} />
                                </TouchableOpacity>

                                <View style={{ width: 44 }} />
                            </View>
                        </View>
                    </>
                ) : (
                    <>
                        <ViewShot ref={viewShotRef} style={styles.camera} options={{ format: "jpg", quality: 0.8 }}>
                            <Image source={{ uri: capturedImage }} style={styles.camera} />
                            {renderOverlay()}
                        </ViewShot>

                        <View style={styles.previewControls}>
                            <TouchableOpacity style={styles.previewButton} onPress={() => setCapturedImage(null)} disabled={isProcessing}>
                                <MaterialIcons name="close" size={24} color="#fff" />
                                <Text style={styles.previewButtonText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.previewButton, { backgroundColor: '#4ade80' }]} onPress={confirmPicture} disabled={isProcessing}>
                                <MaterialIcons name="check" size={24} color="#fff" />
                                <Text style={styles.previewButtonText}>{isProcessing ? "Saving..." : "Use Photo"}</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    permissionText: {
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 18,
    },
    permissionButton: {
        backgroundColor: '#fbb115',
        padding: 15,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    permissionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    camera: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%', // ensure image stretches over full screen
    },
    buttonContainer: {
        flex: 1,
        backgroundColor: 'transparent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    closeButton: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 5,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 80, // slightly higher to clear GPS overlay
    },
    flipButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
        padding: 10,
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
    },
    previewControls: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    previewButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 30,
        gap: 8,
    },
    previewButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    gpsOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 10,
        borderRadius: 10,
    },
    gpsText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    gpsTextTime: {
        color: '#fbb115',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 4,
    },
});
