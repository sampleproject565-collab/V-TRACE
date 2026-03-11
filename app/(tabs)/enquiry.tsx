import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../components/SessionContext';
import { getTasksByEmployee, updateTaskStatus } from '../../firebaseHelpers';

interface Task {
    id: string;
    title: string;
    description?: string;
    assignedTo: string;
    assignedBy: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'not_completed';
    createdAt: string;
    dueDate?: string;
    contactNumber?: string;
    contactName?: string;
    completionDescription?: string;
    completedAt?: string;
}

export default function EnquiryScreen() {
    const { employee } = useSession();
    const insets = useSafeAreaInsets();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({});
    const [submitting, setSubmitting] = useState<string | null>(null);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        if (!employee) return;
        
        try {
            setLoading(true);
            const tasksData = await getTasksByEmployee(employee.employeeId);
            
            console.log('=== ENQUIRY DEBUG ===');
            console.log('Employee ID:', employee.employeeId);
            console.log('Total tasks fetched:', tasksData.length);
            console.log('Tasks data:', JSON.stringify(tasksData, null, 2));
            
            setTasks(tasksData);
            
            // Parse tasks and extract individual contact numbers
            const contactItems: ContactItem[] = [];
            const descMap: { [key: string]: string } = {};
            
            tasksData.forEach((task: Task) => {
                console.log('Processing task:', task.id, task.title);
                
                // Get contact numbers from multiple possible fields
                // Priority: contactNumbers > contactNumber > description (if it looks like phone numbers)
                let numbersString = task.contactNumbers || task.contactNumber || '';
                
                // If no numbers found, check if description contains phone numbers
                if (!numbersString && task.description) {
                    // Check if description looks like it contains phone numbers (comma-separated digits)
                    const descriptionHasNumbers = /^[\d,\s+]+$/.test(task.description.trim());
                    if (descriptionHasNumbers) {
                        numbersString = task.description;
                    }
                }
                
                console.log('Numbers string:', numbersString);
                
                const numbers = numbersString.split(',').map(n => n.trim()).filter(n => n);
                console.log('Parsed numbers:', numbers);
                
                numbers.forEach((number) => {
                    const contactKey = `${task.id}_${number}`;
                    const completion = task.contactCompletions?.[number];
                    
                    contactItems.push({
                        number,
                        taskId: task.id,
                        taskTitle: task.title,
                        taskDescription: task.description,
                        isCompleted: !!completion,
                        completionDescription: completion?.description,
                        completedAt: completion?.completedAt,
                    });
                    
                    if (completion?.description) {
                        descMap[contactKey] = completion.description;
                    }
                });
            });
            
            console.log('Total contact items:', contactItems.length);
            console.log('Contact items:', contactItems);
            
            setContacts(contactItems);
            setDescriptions(descMap);
        } catch (error) {
            console.error('Error loading tasks:', error);
            Alert.alert('Error', 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phoneNumber: string) => {
        const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
        Linking.openURL(`tel:${cleanNumber}`);
    };

    const handleMarkCompleted = async (contact: ContactItem) => {
        if (!employee) return;
        
        const contactKey = `${contact.taskId}_${contact.number}`;
        const description = descriptions[contactKey]?.trim();
        
        if (!description) {
            Alert.alert('Required', 'Please enter a completion description before marking as completed');
            return;
        }

        try {
            setSubmitting(contactKey);
            
            // Get the task
            const task = tasks.find(t => t.id === contact.taskId);
            if (!task) return;
            
            // Update contactCompletions
            const contactCompletions = task.contactCompletions || {};
            contactCompletions[contact.number] = {
                description,
                completedAt: new Date().toISOString(),
            };
            
            // Check if all contacts in this task are completed
            const numbersString = task.contactNumbers || task.contactNumber || '';
            const allNumbers = numbersString.split(',').map(n => n.trim()).filter(n => n);
            const allCompleted = allNumbers.every(num => contactCompletions[num]);
            
            // Update task in Firebase
            await updateTaskStatus(
                contact.taskId,
                allCompleted ? 'completed' : 'pending',
                JSON.stringify(contactCompletions)
            );

            Alert.alert('Success', 'Contact enquiry marked as completed');
            
            // Reload tasks
            await loadTasks();
            setExpandedId(null);
        } catch (error) {
            console.error('Error updating contact:', error);
            Alert.alert('Error', 'Failed to update contact status');
        } finally {
            setSubmitting(null);
        }
    };

    const toggleExpand = (contactKey: string) => {
        setExpandedId(expandedId === contactKey ? null : contactKey);
    };

    const pendingContacts = contacts.filter(c => !c.isCompleted);
    const completedContacts = contacts.filter(c => c.isCompleted);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fbb115" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                <MaterialIcons name="phone-in-talk" size={36} color="#fbb115" />
                <Text style={styles.headerTitle}>Enquiry Tasks</Text>
            </View>

            <ScrollView 
                style={styles.scrollContainer}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: Math.max(insets.bottom, 20) + 20 }
                ]}
            >
                {/* Pending Contacts */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Pending Contacts</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingContacts.length}</Text>
                        </View>
                    </View>
                    
                    {pendingContacts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
                            <Text style={styles.emptyTitle}>All Done!</Text>
                            <Text style={styles.emptyText}>
                                No pending contact enquiries
                            </Text>
                        </View>
                    ) : (
                        pendingContacts.map((contact) => {
                            const contactKey = `${contact.taskId}_${contact.number}`;
                            const isExpanded = expandedId === contactKey;
                            const isSubmittingThis = submitting === contactKey;
                            
                            return (
                                <View key={contactKey} style={styles.taskCard}>
                                    <TouchableOpacity
                                        style={styles.taskHeader}
                                        onPress={() => toggleExpand(contactKey)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.taskIconContainer}>
                                            <MaterialIcons name="phone" size={24} color="#fbb115" />
                                        </View>
                                        <View style={styles.taskInfo}>
                                            <Text style={styles.taskNumber}>{contact.number}</Text>
                                            {contact.taskTitle && (
                                                <Text style={styles.taskName}>{contact.taskTitle}</Text>
                                            )}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.callButton}
                                            onPress={() => handleCall(contact.number)}
                                        >
                                            <MaterialIcons name="call" size={24} color="#4CAF50" />
                                        </TouchableOpacity>
                                        <MaterialIcons 
                                            name={isExpanded ? "expand-less" : "expand-more"} 
                                            size={28} 
                                            color="#666" 
                                        />
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.taskDetails}>
                                            {contact.taskDescription && (
                                                <View style={styles.taskDescriptionBox}>
                                                    <Text style={styles.taskDescriptionLabel}>Task Details:</Text>
                                                    <Text style={styles.taskDescriptionText}>{contact.taskDescription}</Text>
                                                </View>
                                            )}
                                            
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.label}>Completion Description *</Text>
                                                <TextInput
                                                    style={[styles.input, styles.textArea]}
                                                    value={descriptions[contactKey] || ''}
                                                    onChangeText={(text) => 
                                                        setDescriptions(prev => ({ ...prev, [contactKey]: text }))
                                                    }
                                                    placeholder="Enter conversation details, outcome, and notes..."
                                                    placeholderTextColor="#999"
                                                    multiline
                                                    numberOfLines={5}
                                                    textAlignVertical="top"
                                                />
                                            </View>

                                            <TouchableOpacity
                                                style={[
                                                    styles.completeButton,
                                                    isSubmittingThis && styles.completeButtonDisabled
                                                ]}
                                                onPress={() => handleMarkCompleted(contact)}
                                                disabled={isSubmittingThis}
                                            >
                                                {isSubmittingThis ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <>
                                                        <MaterialIcons name="check-circle" size={20} color="#fff" />
                                                        <Text style={styles.completeButtonText}>Mark as Completed</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Completed Contacts */}
                {completedContacts.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Completed Contacts</Text>
                            <View style={[styles.badge, styles.badgeCompleted]}>
                                <Text style={styles.badgeText}>{completedContacts.length}</Text>
                            </View>
                        </View>
                        
                        {completedContacts.map((contact) => {
                            const contactKey = `${contact.taskId}_${contact.number}`;
                            
                            return (
                                <View key={contactKey} style={styles.completedCard}>
                                    <View style={styles.completedHeader}>
                                        <View style={styles.completedIconContainer}>
                                            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                                        </View>
                                        <View style={styles.completedInfo}>
                                            <Text style={styles.completedNumber}>{contact.number}</Text>
                                            {contact.taskTitle && (
                                                <Text style={styles.completedName}>{contact.taskTitle}</Text>
                                            )}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.callButtonSmall}
                                            onPress={() => handleCall(contact.number)}
                                        >
                                            <MaterialIcons name="call" size={20} color="#4CAF50" />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    {contact.completionDescription && (
                                        <View style={styles.completedDescription}>
                                            <Text style={styles.descriptionLabel}>Completion Notes:</Text>
                                            <Text style={styles.descriptionText}>{contact.completionDescription}</Text>
                                        </View>
                                    )}
                                    
                                    {contact.completedAt && (
                                        <Text style={styles.completedDate}>
                                            Completed: {new Date(contact.completedAt).toLocaleString()}
                                        </Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Empty State - No Contacts at All */}
                {contacts.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="assignment" size={64} color="#ccc" />
                        <Text style={styles.emptyTitle}>No Enquiry Tasks</Text>
                        <Text style={styles.emptyText}>
                            Admin will assign contact numbers for you to enquire
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginLeft: 12,
        color: '#000',
    },
    scrollContainer: {
        flex: 1,
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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    badge: {
        backgroundColor: '#fbb115',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeCompleted: {
        backgroundColor: '#4CAF50',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
    emptyState: {
        alignItems: 'center',
        padding: 50,
        backgroundColor: '#fff',
        borderRadius: 16,
    },
    emptyTitle: {
        marginTop: 15,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    emptyText: {
        marginTop: 8,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    taskCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        overflow: 'hidden',
    },
    taskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    taskIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff5e6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    taskInfo: {
        flex: 1,
    },
    taskNumber: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    taskName: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    taskDescription: {
        fontSize: 13,
        color: '#999',
        marginTop: 4,
    },
    taskDetails: {
        padding: 18,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
    },
    taskDescriptionBox: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    taskDescriptionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    taskDescriptionText: {
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    textArea: {
        minHeight: 100,
        paddingTop: 14,
    },
    completeButton: {
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    completeButtonDisabled: {
        opacity: 0.6,
    },
    completeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    completedCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    completedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    completedIconContainer: {
        marginRight: 12,
    },
    completedInfo: {
        flex: 1,
    },
    completedNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    completedName: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    completedDescription: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    descriptionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    descriptionText: {
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
    },
    completedDate: {
        fontSize: 12,
        color: '#999',
    },
    callButton: {
        padding: 8,
        marginRight: 8,
    },
    callButtonSmall: {
        padding: 6,
    },
});
