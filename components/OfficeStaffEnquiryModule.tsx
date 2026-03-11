import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createEnquiry, getAssignedContacts, getEnquiriesByEmployee } from '../firebaseHelpers';
import { useSession } from './SessionContext';

interface Contact {
    id: string;
    contactNumber: string;
    contactName?: string;
    assignedAt: string;
}

interface Enquiry {
    id: string;
    contactNumber: string;
    contactName?: string;
    userSpokeTo: string;
    description: string;
    status: 'contacted' | 'not_contacted' | 'follow_up';
    createdAt: string;
}

export default function OfficeStaffEnquiryModule() {
    const { employee } = useSession();
    const insets = useSafeAreaInsets();
    
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    
    // Form fields
    const [userSpokeTo, setUserSpokeTo] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'contacted' | 'not_contacted' | 'follow_up'>('contacted');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!employee) return;
        
        try {
            setLoading(true);
            const [contactsData, enquiriesData] = await Promise.all([
                getAssignedContacts(employee.employeeId),
                getEnquiriesByEmployee(employee.employeeId)
            ]);
            
            setContacts(contactsData);
            setEnquiries(enquiriesData);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitEnquiry = async () => {
        if (!employee || !selectedContact) return;
        
        if (!userSpokeTo.trim()) {
            Alert.alert('Required', 'Please enter who you spoke to');
            return;
        }
        
        if (!description.trim()) {
            Alert.alert('Required', 'Please enter a description');
            return;
        }

        try {
            setSubmitting(true);
            
            await createEnquiry({
                employeeId: employee.employeeId,
                contactNumber: selectedContact.contactNumber,
                contactName: selectedContact.contactName,
                userSpokeTo: userSpokeTo.trim(),
                description: description.trim(),
                status,
            });

            Alert.alert('Success', 'Enquiry submitted successfully');
            
            // Reset form
            setUserSpokeTo('');
            setDescription('');
            setStatus('contacted');
            setSelectedContact(null);
            
            // Reload data
            await loadData();
        } catch (error) {
            console.error('Error submitting enquiry:', error);
            Alert.alert('Error', 'Failed to submit enquiry');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fbb115" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(insets.bottom, 20) + 20 }
            ]}
        >
            {/* Assigned Contacts Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assigned Contacts ({contacts.length})</Text>
                
                {contacts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="phone-disabled" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No contacts assigned yet</Text>
                    </View>
                ) : (
                    contacts.map((contact) => (
                        <TouchableOpacity
                            key={contact.id}
                            style={[
                                styles.contactCard,
                                selectedContact?.id === contact.id && styles.contactCardSelected
                            ]}
                            onPress={() => setSelectedContact(contact)}
                        >
                            <MaterialIcons 
                                name="phone" 
                                size={24} 
                                color={selectedContact?.id === contact.id ? '#fbb115' : '#666'} 
                            />
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactNumber}>{contact.contactNumber}</Text>
                                {contact.contactName && (
                                    <Text style={styles.contactName}>{contact.contactName}</Text>
                                )}
                            </View>
                            {selectedContact?.id === contact.id && (
                                <MaterialIcons name="check-circle" size={24} color="#fbb115" />
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {/* Enquiry Form */}
            {selectedContact && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>New Enquiry</Text>
                    
                    <View style={styles.formCard}>
                        <Text style={styles.selectedContact}>
                            Contact: {selectedContact.contactNumber}
                        </Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>User Spoke To *</Text>
                            <TextInput
                                style={styles.input}
                                value={userSpokeTo}
                                onChangeText={setUserSpokeTo}
                                placeholder="Enter name of person you spoke to"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Status *</Text>
                            <View style={styles.statusButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.statusButton,
                                        status === 'contacted' && styles.statusButtonActive
                                    ]}
                                    onPress={() => setStatus('contacted')}
                                >
                                    <Text style={[
                                        styles.statusButtonText,
                                        status === 'contacted' && styles.statusButtonTextActive
                                    ]}>Contacted</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[
                                        styles.statusButton,
                                        status === 'not_contacted' && styles.statusButtonActive
                                    ]}
                                    onPress={() => setStatus('not_contacted')}
                                >
                                    <Text style={[
                                        styles.statusButtonText,
                                        status === 'not_contacted' && styles.statusButtonTextActive
                                    ]}>Not Contacted</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[
                                        styles.statusButton,
                                        status === 'follow_up' && styles.statusButtonActive
                                    ]}
                                    onPress={() => setStatus('follow_up')}
                                >
                                    <Text style={[
                                        styles.statusButtonText,
                                        status === 'follow_up' && styles.statusButtonTextActive
                                    ]}>Follow Up</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Enter conversation details and notes"
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={handleSubmitEnquiry}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialIcons name="send" size={20} color="#fff" />
                                    <Text style={styles.submitButtonText}>Submit Enquiry</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Enquiry History */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Enquiry History ({enquiries.length})</Text>
                
                {enquiries.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="history" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No enquiries yet</Text>
                    </View>
                ) : (
                    enquiries.map((enquiry) => (
                        <View key={enquiry.id} style={styles.enquiryCard}>
                            <View style={styles.enquiryHeader}>
                                <Text style={styles.enquiryContact}>{enquiry.contactNumber}</Text>
                                <View style={[
                                    styles.statusBadge,
                                    enquiry.status === 'contacted' && styles.statusBadgeContacted,
                                    enquiry.status === 'not_contacted' && styles.statusBadgeNotContacted,
                                    enquiry.status === 'follow_up' && styles.statusBadgeFollowUp,
                                ]}>
                                    <Text style={styles.statusBadgeText}>
                                        {enquiry.status.replace('_', ' ').toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            
                            <Text style={styles.enquirySpokeTo}>
                                Spoke to: {enquiry.userSpokeTo}
                            </Text>
                            
                            <Text style={styles.enquiryDescription}>{enquiry.description}</Text>
                            
                            <Text style={styles.enquiryDate}>
                                {new Date(enquiry.createdAt).toLocaleString()}
                            </Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 15,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: '#999',
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    contactCardSelected: {
        borderColor: '#fbb115',
        backgroundColor: '#fffbf0',
    },
    contactInfo: {
        flex: 1,
        marginLeft: 12,
    },
    contactNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    contactName: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    formCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
    },
    selectedContact: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fbb115',
        marginBottom: 20,
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
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    statusButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    statusButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        borderWidth: 2,
        borderColor: '#e5e5e5',
        alignItems: 'center',
    },
    statusButtonActive: {
        backgroundColor: '#fbb115',
        borderColor: '#fbb115',
    },
    statusButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    statusButtonTextActive: {
        color: '#fff',
    },
    submitButton: {
        flexDirection: 'row',
        backgroundColor: '#fbb115',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    enquiryCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    enquiryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    enquiryContact: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeContacted: {
        backgroundColor: '#4CAF50',
    },
    statusBadgeNotContacted: {
        backgroundColor: '#FF5722',
    },
    statusBadgeFollowUp: {
        backgroundColor: '#2196F3',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    enquirySpokeTo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    enquiryDescription: {
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
        marginBottom: 8,
    },
    enquiryDate: {
        fontSize: 12,
        color: '#999',
    },
});
