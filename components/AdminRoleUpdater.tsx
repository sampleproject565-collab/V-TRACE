import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { getUserData, updateUserRole } from '../authHelpers';

/**
 * Admin Role Updater Component
 * 
 * Temporary component to update user roles in Firebase.
 * You can add this to any screen temporarily to update roles.
 * 
 * Usage:
 * 1. Import this component in any screen
 * 2. Add <AdminRoleUpdater /> to the screen
 * 3. Enter phone number and select role
 * 4. Click Update Role
 * 5. Remove this component after updating roles
 */
export default function AdminRoleUpdater() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedRole, setSelectedRole] = useState<'field_staff' | 'office_staff'>('office_staff');
    const [loading, setLoading] = useState(false);

    const formatPhoneNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length > 0 && !text.startsWith('+')) {
            return '+91' + cleaned;
        }
        return '+' + cleaned;
    };

    const handleUpdateRole = async () => {
        if (!phoneNumber.trim()) {
            Alert.alert('Error', 'Please enter phone number');
            return;
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        if (formattedPhone.length < 13) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);

        try {
            // Check if user exists
            const userData = await getUserData(formattedPhone);
            
            if (!userData) {
                Alert.alert('Error', 'User not found with this phone number');
                setLoading(false);
                return;
            }

            // Update role
            await updateUserRole(formattedPhone, selectedRole);
            
            Alert.alert(
                'Success', 
                `User "${userData.name}" role updated to ${selectedRole.replace('_', ' ')}\n\nPlease ask the user to logout and login again to see the changes.`
            );
            
            setPhoneNumber('');
        } catch (error: any) {
            console.error('Error updating role:', error);
            Alert.alert('Error', error.message || 'Failed to update role');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="admin-panel-settings" size={32} color="#fbb115" />
                <Text style={styles.title}>Admin: Update User Role</Text>
            </View>

            <Text style={styles.warning}>
                ⚠️ This is a temporary admin tool. Remove after updating roles.
            </Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number (10 digits)</Text>
                <TextInput
                    style={styles.input}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={10}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Role</Text>
                <View style={styles.roleButtons}>
                    <TouchableOpacity
                        style={[
                            styles.roleButton,
                            selectedRole === 'field_staff' && styles.roleButtonActive
                        ]}
                        onPress={() => setSelectedRole('field_staff')}
                    >
                        <MaterialIcons 
                            name="agriculture" 
                            size={24} 
                            color={selectedRole === 'field_staff' ? '#fff' : '#666'} 
                        />
                        <Text style={[
                            styles.roleButtonText,
                            selectedRole === 'field_staff' && styles.roleButtonTextActive
                        ]}>
                            Field Staff
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.roleButton,
                            selectedRole === 'office_staff' && styles.roleButtonActive
                        ]}
                        onPress={() => setSelectedRole('office_staff')}
                    >
                        <MaterialIcons 
                            name="business" 
                            size={24} 
                            color={selectedRole === 'office_staff' ? '#fff' : '#666'} 
                        />
                        <Text style={[
                            styles.roleButtonText,
                            selectedRole === 'office_staff' && styles.roleButtonTextActive
                        ]}>
                            Office Staff
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.updateButton, loading && styles.updateButtonDisabled]}
                onPress={handleUpdateRole}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <MaterialIcons name="update" size={20} color="#fff" />
                        <Text style={styles.updateButtonText}>Update Role</Text>
                    </>
                )}
            </TouchableOpacity>

            <Text style={styles.note}>
                Note: User must logout and login again to see role changes.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        margin: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    warning: {
        backgroundColor: '#fff3cd',
        padding: 10,
        borderRadius: 8,
        fontSize: 12,
        color: '#856404',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ffeaa7',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    roleButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    roleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        borderWidth: 2,
        borderColor: '#e5e5e5',
        gap: 8,
    },
    roleButtonActive: {
        backgroundColor: '#fbb115',
        borderColor: '#fbb115',
    },
    roleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    roleButtonTextActive: {
        color: '#fff',
    },
    updateButton: {
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    updateButtonDisabled: {
        opacity: 0.6,
    },
    updateButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    note: {
        marginTop: 15,
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
