import { MaterialIcons } from '@expo/vector-icons';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createCustomer } from '../firebaseHelpers';
import { useSession } from './SessionContext';

type CustomerType = 'Farmer' | 'Dealer' | 'Distributor' | '';

export default function CRMModule() {
    const { employee } = useSession();
    const insets = useSafeAreaInsets();

    const [customerType, setCustomerType] = useState<CustomerType>('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    
    // Farmer fields
    const [cropType, setCropType] = useState('');
    const [landSize, setLandSize] = useState('');
    const [village, setVillage] = useState('');
    
    // Dealer fields
    const [shopName, setShopName] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [productsSold, setProductsSold] = useState('');
    
    // Distributor fields
    const [companyName, setCompanyName] = useState('');
    const [territory, setTerritory] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);

    const resetForm = () => {
        setCustomerType('');
        setName('');
        setPhone('');
        setCropType('');
        setLandSize('');
        setVillage('');
        setShopName('');
        setLicenseNumber('');
        setProductsSold('');
        setCompanyName('');
        setTerritory('');
        setGstNumber('');
    };

    const handleSaveCustomer = async () => {
        if (!employee) return;
        
        if (!customerType || !name.trim() || !phone.trim()) {
            Alert.alert('Missing Fields', 'Please fill customer type, name, and phone number.');
            return;
        }

        setIsSaving(true);
        try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

            const customerData: any = {
                employeeId: employee.employeeId,
                type: customerType,
                name: name.trim(),
                phone: phone.trim(),
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            // Add type-specific fields
            if (customerType === 'Farmer') {
                customerData.cropType = cropType.trim();
                customerData.landSize = landSize.trim();
                customerData.village = village.trim();
            } else if (customerType === 'Dealer') {
                customerData.shopName = shopName.trim();
                customerData.licenseNumber = licenseNumber.trim();
                customerData.productsSold = productsSold.trim();
            } else if (customerType === 'Distributor') {
                customerData.companyName = companyName.trim();
                customerData.territory = territory.trim();
                customerData.gstNumber = gstNumber.trim();
            }

            await createCustomer(customerData);

            Alert.alert('Success', `${customerType} customer added successfully!`);
            resetForm();
        } catch (error) {
            console.error('Error saving customer:', error);
            Alert.alert('Error', 'Could not save customer. Please check location permissions.');
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
                <MaterialIcons name="people-outline" size={40} color="#9C27B0" />
                <Text style={styles.title}>Dynamic CRM</Text>
            </View>
            <Text style={styles.subtitle}>Add customers with smart form fields</Text>

            {/* Customer Type Selection */}
            <Text style={styles.sectionLabel}>Customer Type *</Text>
            <View style={styles.typeSelector}>
                {(['Farmer', 'Dealer', 'Distributor'] as CustomerType[]).map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.typeButton,
                            customerType === type && styles.typeButtonActive
                        ]}
                        onPress={() => setCustomerType(type)}
                    >
                        <MaterialIcons
                            name={
                                type === 'Farmer' ? 'agriculture' :
                                type === 'Dealer' ? 'store' : 'business'
                            }
                            size={28}
                            color={customerType === type ? '#fff' : '#9C27B0'}
                        />
                        <Text style={[
                            styles.typeButtonText,
                            customerType === type && styles.typeButtonTextActive
                        ]}>
                            {type}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Common Fields */}
            {customerType && (
                <>
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="person" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Customer Name *"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="phone" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number *"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>
                </>
            )}

            {/* Farmer-specific fields */}
            {customerType === 'Farmer' && (
                <>
                    <Text style={styles.sectionLabel}>Farmer Details</Text>
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="grass" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Crop Type (e.g., Rice, Wheat)"
                            value={cropType}
                            onChangeText={setCropType}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="landscape" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Land Size (e.g., 3 Acres)"
                            value={landSize}
                            onChangeText={setLandSize}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="location-city" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Village"
                            value={village}
                            onChangeText={setVillage}
                        />
                    </View>
                </>
            )}

            {/* Dealer-specific fields */}
            {customerType === 'Dealer' && (
                <>
                    <Text style={styles.sectionLabel}>Dealer Details</Text>
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="store" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Shop Name"
                            value={shopName}
                            onChangeText={setShopName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="badge" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="License Number"
                            value={licenseNumber}
                            onChangeText={setLicenseNumber}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="inventory" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Products Sold"
                            value={productsSold}
                            onChangeText={setProductsSold}
                        />
                    </View>
                </>
            )}

            {/* Distributor-specific fields */}
            {customerType === 'Distributor' && (
                <>
                    <Text style={styles.sectionLabel}>Distributor Details</Text>
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="business" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Company Name"
                            value={companyName}
                            onChangeText={setCompanyName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="map" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Territory"
                            value={territory}
                            onChangeText={setTerritory}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialIcons name="receipt" size={24} color="#999" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="GST Number"
                            value={gstNumber}
                            onChangeText={setGstNumber}
                        />
                    </View>
                </>
            )}

            {/* Save Button */}
            {customerType && (
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.disabledButton]}
                    onPress={handleSaveCustomer}
                    disabled={isSaving}
                >
                    <Text style={styles.saveButtonText}>
                        {isSaving ? 'Saving...' : 'Save Customer'}
                    </Text>
                    {!isSaving && <MaterialIcons name="save" size={24} color="#fff" />}
                </TouchableOpacity>
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
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 10,
        marginTop: 10,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#e5e5e5',
        gap: 5,
    },
    typeButtonActive: {
        backgroundColor: '#9C27B0',
        borderColor: '#9C27B0',
    },
    typeButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#9C27B0',
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        paddingHorizontal: 15,
        marginBottom: 15,
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
    saveButton: {
        backgroundColor: '#9C27B0',
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
