import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
import { useSession } from "../components/SessionContext";

export default function AuthScreen() {
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [employeeName, setEmployeeName] = useState("");
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    const handleLogin = async () => {
        if (!employeeId.trim() || !password.trim()) {
            Alert.alert("Error", "Please enter Employee ID and Password");
            return;
        }

        try {
            const employeeData = await getEmployeeByIdAndPassword(employeeId.trim(), password);

            if (!employeeData) {
                Alert.alert("Error", "Invalid Employee ID or Password");
                return;
            }

            login({
                employeeId: employeeData.employeeId,
                name: employeeData.name || "Employee",
            });

            router.replace("/(tabs)");
        } catch (error) {
            console.error("Login error:", error);
            Alert.alert("Error", "Failed to login. Please try again.");
        }
    };

    const handleRegister = async () => {
        if (!employeeId.trim() || !password.trim() || !confirmPassword.trim() || !employeeName.trim()) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters");
            return;
        }

        try {
            const exists = await checkEmployeeExists(employeeId.trim());

            if (exists) {
                Alert.alert("Error", "Employee ID already exists");
                return;
            }

            await createEmployee({
                employeeId: employeeId.trim(),
                password: password,
                name: employeeName.trim(),
            });

            Alert.alert(
                "Success",
                "Registration successful! You can now login.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setIsRegisterMode(false);
                            setPassword("");
                            setConfirmPassword("");
                            setEmployeeName("");
                        },
                    },
                ]
            );
        } catch (error) {
            console.error("Registration error:", error);
            Alert.alert("Error", "Failed to register. Please try again.");
        }
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
                                    name={isRegisterMode ? "person-add" : "fingerprint"}
                                    size={60}
                                    color="#fbb115"
                                />
                            </View>
                        </View>

                        <Text style={styles.title}>
                            {isRegisterMode ? "Create Account" : "Welcome Back"}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isRegisterMode ? "Register new employee" : "Sign in to continue"}
                        </Text>

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

                        <View style={styles.inputContainer}>
                            <MaterialIcons
                                name="badge"
                                size={24}
                                color="#fbb115"
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Employee ID"
                                placeholderTextColor="#999"
                                value={employeeId}
                                onChangeText={setEmployeeId}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <MaterialIcons
                                name="lock"
                                size={24}
                                color="#fbb115"
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <MaterialIcons
                                    name={showPassword ? "visibility" : "visibility-off"}
                                    size={24}
                                    color="#999"
                                />
                            </TouchableOpacity>
                        </View>

                        {isRegisterMode && (
                            <>
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
                                        value={employeeName}
                                        onChangeText={setEmployeeName}
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <MaterialIcons
                                        name="lock-outline"
                                        size={24}
                                        color="#fbb115"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Confirm Password"
                                        placeholderTextColor="#999"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <MaterialIcons
                                            name={showConfirmPassword ? "visibility" : "visibility-off"}
                                            size={24}
                                            color="#999"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={isRegisterMode ? handleRegister : handleLogin}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.loginButtonText}>
                                {isRegisterMode ? "Register" : "Sign In"}
                            </Text>
                            <MaterialIcons
                                name={isRegisterMode ? "person-add" : "arrow-forward"}
                                size={20}
                                color="#000"
                            />
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <MaterialIcons name="security" size={16} color="#999" />
                            <Text style={styles.footerText}>
                                {isRegisterMode ? "Secure Registration" : "Secure Login"}
                            </Text>
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
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: "#000",
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
    loginButtonText: {
        color: "#000",
        fontSize: 18,
        fontWeight: "bold",
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
