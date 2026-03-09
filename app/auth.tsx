import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { checkUserExists, createUser, sendOTP, updateLastLogin, verifyOTP } from "../authHelpers";
import { useSession } from "../components/SessionContext";

export default function AuthOTPScreen() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [name, setName] = useState("");
    const [generatedOTP, setGeneratedOTP] = useState("");
    const [isOTPSent, setIsOTPSent] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const { login } = useSession();
    const router = useRouter();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const formatPhoneNumber = (text: string) => {
        // Remove all non-numeric characters
        const cleaned = text.replace(/\D/g, '');
        // Add +91 prefix if not present
        if (cleaned.length > 0 && !text.startsWith('+')) {
            return '+91' + cleaned;
        }
        return '+' + cleaned;
    };

    const handleSendOTP = async () => {
        if (!phoneNumber.trim()) {
            Alert.alert("Error", "Please enter your phone number");
            return;
        }

        if (isRegisterMode && !name.trim()) {
            Alert.alert("Error", "Please enter your name");
            return;
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        if (formattedPhone.length < 13) {
            Alert.alert("Error", "Please enter a valid 10-digit phone number");
            return;
        }

        setIsLoading(true);

        try {
            // Check if user exists
            const existingUser = await checkUserExists(formattedPhone);

            if (!isRegisterMode && !existingUser) {
                Alert.alert("Error", "Phone number not registered. Please register first.");
                setIsLoading(false);
                return;
            }

            if (isRegisterMode && existingUser) {
                Alert.alert("Error", "Phone number already registered. Please login.");
                setIsLoading(false);
                return;
            }

            // Send OTP via SMS
            const result = await sendOTP(formattedPhone);
            
            if (result.success) {
                setIsOTPSent(true);
                Alert.alert("Success", "OTP sent to your phone number");
            } else {
                // SMS service failed
                setIsOTPSent(false);
                Alert.alert(
                    "Error", 
                    "Failed to send OTP. Please check your SMS service configuration and try again."
                );
            }
        } catch (error: any) {
            console.error("Send OTP error:", error);
            Alert.alert("Error", error.message || "Failed to send OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp.trim() || otp.length !== 6) {
            Alert.alert("Error", "Please enter the 6-digit OTP");
            return;
        }

        setIsLoading(true);

        try {
            const formattedPhone = formatPhoneNumber(phoneNumber);
            await verifyOTP(formattedPhone, otp);

            if (isRegisterMode) {
                // Create new user
                const userData = await createUser(formattedPhone, name);
                login({
                    employeeId: userData.employeeId,
                    name: userData.name,
                });
            } else {
                // Login existing user
                const userData = await checkUserExists(formattedPhone);
                await updateLastLogin(formattedPhone);
                login({
                    employeeId: userData.employeeId,
                    name: userData.name,
                });
            }

            router.replace("/(tabs)");
        } catch (error: any) {
            console.error("Verify OTP error:", error);
            Alert.alert("Error", error.message || "Invalid OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setOtp("");
        setIsOTPSent(false);
        await handleSendOTP();
    };

    return (
        <View style={styles.gradientContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View
                        style={[
                            styles.loginCard,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircle}>
                                <MaterialIcons
                                    name={isOTPSent ? "sms" : "phone-android"}
                                    size={60}
                                    color="#fbb115"
                                />
                            </View>
                        </View>

                        <Text style={styles.title}>
                            {isOTPSent ? "Verify OTP" : (isRegisterMode ? "Create Account" : "Welcome Back")}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isOTPSent 
                                ? `Enter the 6-digit code sent to ${phoneNumber}` 
                                : (isRegisterMode ? "Register with phone number" : "Sign in with phone number")}
                        </Text>

                        {!isOTPSent && (
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[styles.tab, !isRegisterMode && styles.tabActive]}
                                    onPress={() => setIsRegisterMode(false)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.tabText, !isRegisterMode && styles.tabTextActive]}>
                                        Login
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, isRegisterMode && styles.tabActive]}
                                    onPress={() => setIsRegisterMode(true)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.tabText, isRegisterMode && styles.tabTextActive]}>
                                        Register
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {!isOTPSent ? (
                            <>
                                {isRegisterMode && (
                                    <View style={styles.inputContainer}>
                                        <MaterialIcons
                                            name="person"
                                            size={24}
                                            color="#fbb115"
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Full Name"
                                            placeholderTextColor="#999"
                                            value={name}
                                            onChangeText={setName}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                )}

                                <View style={styles.inputContainer}>
                                    <MaterialIcons
                                        name="phone"
                                        size={24}
                                        color="#fbb115"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Phone Number (10 digits)"
                                        placeholderTextColor="#999"
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.loginButton, isLoading && styles.disabledButton]}
                                    onPress={handleSendOTP}
                                    activeOpacity={0.8}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <>
                                            <Text style={styles.loginButtonText}>Send OTP</Text>
                                            <MaterialIcons name="send" size={20} color="#000" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.otpContainer}>
                                    <MaterialIcons
                                        name="lock"
                                        size={24}
                                        color="#fbb115"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.otpInput}
                                        placeholder="Enter 6-digit OTP"
                                        placeholderTextColor="#999"
                                        value={otp}
                                        onChangeText={setOtp}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.loginButton, isLoading && styles.disabledButton]}
                                    onPress={handleVerifyOTP}
                                    activeOpacity={0.8}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <>
                                            <Text style={styles.loginButtonText}>Verify & Continue</Text>
                                            <MaterialIcons name="check-circle" size={20} color="#000" />
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.resendButton}
                                    onPress={handleResendOTP}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.resendText}>Didn't receive OTP? Resend</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.changeNumberButton}
                                    onPress={() => {
                                        setIsOTPSent(false);
                                        setOtp("");
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <MaterialIcons name="edit" size={16} color="#666" />
                                    <Text style={styles.changeNumberText}>Change Phone Number</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <View style={styles.footer}>
                            <MaterialIcons name="security" size={16} color="#999" />
                            <Text style={styles.footerText}>Secure OTP Authentication</Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loginCard: {
        width: "100%",
        maxWidth: 400,
        backgroundColor: "#fff",
        borderRadius: 30,
        padding: 30,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    iconContainer: {
        alignItems: "center",
        marginBottom: 30,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fbb115",
        elevation: 5,
        shadowColor: "#fbb115",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#000",
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: "#fbb115",
    },
    tabText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
    },
    tabTextActive: {
        color: "#000",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: "#e5e5e5",
    },
    otpContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: "#fbb115",
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: "#000",
    },
    otpInput: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 24,
        fontWeight: "bold",
        color: "#000",
        letterSpacing: 8,
        textAlign: "center",
    },
    loginButton: {
        backgroundColor: "#fbb115",
        borderRadius: 15,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 16,
        gap: 10,
        elevation: 5,
        shadowColor: "#fbb115",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginTop: 10,
    },
    disabledButton: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: "#000",
        fontSize: 18,
        fontWeight: "bold",
    },
    resendButton: {
        marginTop: 20,
        alignItems: "center",
    },
    resendText: {
        color: "#fbb115",
        fontSize: 16,
        fontWeight: "600",
    },
    changeNumberButton: {
        marginTop: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
    },
    changeNumberText: {
        color: "#666",
        fontSize: 14,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
        gap: 8,
    },
    footerText: {
        color: "#999",
        fontSize: 14,
    },
});
