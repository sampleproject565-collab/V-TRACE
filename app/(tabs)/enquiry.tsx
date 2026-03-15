import { MaterialIcons } from '@expo/vector-icons';
import { off, onValue } from 'firebase/database';
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
import { db, ref } from '../../firebase';
import {
    getTasksByEmployee,
    updateTaskStatus
} from '../../firebaseHelpers';

interface Task {
    id: string;
    title: string;
    description?: string;
    assignedTo: string;
    assignedBy: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'not_completed';
    createdAt: string;
    dueDate?: string;
    taskType?: 'field' | 'enquiry';
    priority?: 'high' | 'medium' | 'low';
    completionDescription?: string;
    completedAt?: string;
}

interface EnquiryContact {
    taskId: string;
    contactNumber: string;
    taskTitle: string;
    taskDescription?: string;
    dueDate?: string;
    priority?: string;
    isCompleted: boolean;
    completionDescription?: string;
    completedAt?: string;
    callDuration?: number; // in seconds
}

interface CallTimer {
    contactKey: string;
    startTime: number;
}

export default function EnquiryScreen() {
    const { employee } = useSession();
    const insets = useSafeAreaInsets();
    
    const [contacts, setContacts] = useState<EnquiryContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [callDurations, setCallDurations] = useState<{ [key: string]: number }>({});
    const [callStartTimes, setCallStartTimes] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (!employee) return;

        const tasksRef = ref(db, 'tasks');
        
        // Set up real-time listener
        const unsubscribe = onValue(tasksRef, (snapshot) => {
            if (!snapshot.exists()) {
                setContacts([]);
                setLoading(false);
                return;
            }
            
            // Filter only enquiry tasks for this employee
            const allTasks: Task[] = [];
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                if (data.assignedTo === employee.employeeId) {
                    allTasks.push({
                        id: childSnapshot.key,
                        ...data,
                    });
                }
            });
            
            // Filter only enquiry tasks
            const enquiryTasks = allTasks.filter(task => 
                task.taskType === 'enquiry' || !task.taskType
            );
            
            // Parse contact numbers from description and create individual enquiry items
            const contactItems: EnquiryContact[] = [];
            const descMap: { [key: string]: string } = {};
            
            enquiryTasks.forEach((task: Task) => {
                // Check if description contains comma-separated phone numbers
                if (task.description) {
                    const descriptionHasNumbers = /^[\d,\s+]+$/.test(task.description.trim());
                    
                    if (descriptionHasNumbers) {
                        // Parse comma-separated numbers
                        const numbers = task.description
                            .split(',')
                            .map(n => n.trim())
                            .filter(n => n.length > 0);
                        
                        // Create separate enquiry for each number
                        numbers.forEach(number => {
                            const contactKey = `${task.id}_${number}`;
                            
                            // Check if this specific contact is completed
                            let contactCompletions: any = {};
                            try {
                                if (task.completionDescription && task.completionDescription.startsWith('{')) {
                                    contactCompletions = JSON.parse(task.completionDescription);
                                }
                            } catch (e) {
                                console.error('Error parsing contactCompletions:', e);
                            }
                            
                            const completion = contactCompletions[number];
                            
                            contactItems.push({
                                taskId: task.id,
                                contactNumber: number,
                                taskTitle: task.title,
                                taskDescription: task.description,
                                dueDate: task.dueDate,
                                priority: task.priority,
                                isCompleted: !!completion,
                                completionDescription: completion?.description,
                                completedAt: completion?.completedAt,
                                callDuration: completion?.callDuration,
                            });
                            
                            if (completion?.description) {
                                descMap[contactKey] = completion.description;
                            }
                        });
                    } else {
                        // Not a phone number list, treat as single enquiry
                        contactItems.push({
                            taskId: task.id,
                            contactNumber: '',
                            taskTitle: task.title,
                            taskDescription: task.description,
                            dueDate: task.dueDate,
                            priority: task.priority,
                            isCompleted: task.status === 'completed',
                            completionDescription: task.completionDescription,
                            completedAt: task.completedAt,
                        });
                        
                        if (task.completionDescription) {
                            descMap[task.id] = task.completionDescription;
                        }
                    }
                } else {
                    // No description, treat as single enquiry
                    contactItems.push({
                        taskId: task.id,
                        contactNumber: '',
                        taskTitle: task.title,
                        taskDescription: task.description,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        isCompleted: task.status === 'completed',
                        completionDescription: task.completionDescription,
                        completedAt: task.completedAt,
                    });
                    
                    if (task.completionDescription) {
                        descMap[task.id] = task.completionDescription;
                    }
                }
            });
            
            setContacts(contactItems);
            setDescriptions(descMap);
            setLoading(false);
        }, (error) => {
            console.error('Error listening to tasks:', error);
            Alert.alert('Error', 'Failed to load enquiry tasks: ' + error.message);
            setLoading(false);
        });

        // Cleanup listener on unmount
        return () => off(tasksRef, 'value', unsubscribe);
    }, [employee]);

    const handleCall = async (phoneNumber: string, contactKey: string) => {
        const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
        
        // Check if there's already a call in progress for this contact
        if (callStartTimes[contactKey]) {
            // Call in progress, clicking again will end it
            endCall(contactKey);
            return;
        }
        
        // Record call start time
        setCallStartTimes(prev => ({
            ...prev,
            [contactKey]: Date.now(),
        }));
        
        // Open phone dialer
        Linking.openURL(`tel:${cleanNumber}`);
    };

    const endCall = (contactKey: string) => {
        const startTime = callStartTimes[contactKey];
        if (startTime) {
            const duration = Math.floor((Date.now() - startTime) / 1000); // in seconds
            
            setCallDurations(prev => {
                const updated = {
                    ...prev,
                    [contactKey]: (prev[contactKey] || 0) + duration,
                };
                return updated;
            });
            
            // Automatically expand the card to show description box
            setExpandedId(contactKey);
            
            Alert.alert(
                'Call Duration Recorded',
                `Duration: ${formatCallDuration(duration)}\n\nPlease enter completion details below.`,
                [{ text: 'OK' }]
            );
        }
    };

    const formatCallDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleMarkCompleted = async (contact: EnquiryContact) => {
        if (!employee) return;
        
        const contactKey = contact.contactNumber 
            ? `${contact.taskId}_${contact.contactNumber}` 
            : contact.taskId;
        const description = descriptions[contactKey]?.trim();
        
        if (!description) {
            Alert.alert('Required', 'Please enter a completion description before marking as completed');
            return;
        }

        const callDuration = callDurations[contactKey] || 0;

        try {
            setSubmitting(contactKey);
            
            if (contact.contactNumber) {
                // This is a contact-based enquiry, update contactCompletions
                const allTasks = await getTasksByEmployee(employee.employeeId);
                const task = allTasks.find(t => t.id === contact.taskId);
                
                if (!task) {
                    return;
                }
                
                // Parse existing contactCompletions from completionDescription
                let contactCompletions: any = {};
                try {
                    if (task.completionDescription && task.completionDescription.startsWith('{')) {
                        contactCompletions = JSON.parse(task.completionDescription);
                    }
                } catch (e) {
                    console.error('Error parsing existing contactCompletions:', e);
                }
                
                contactCompletions[contact.contactNumber] = {
                    description,
                    completedAt: new Date().toISOString(),
                    callDuration, // Store call duration in seconds
                    completedBy: employee.employeeId,
                    completedByName: employee.name,
                };
                
                // Check if all contacts in this task are completed
                const numbers = task.description
                    ?.split(',')
                    .map(n => n.trim())
                    .filter(n => n.length > 0) || [];
                
                const allCompleted = numbers.every(num => contactCompletions[num]);
                
                // Update task with contact completions
                const jsonString = JSON.stringify(contactCompletions);
                
                await updateTaskStatus(
                    contact.taskId,
                    allCompleted ? 'completed' : 'pending',
                    jsonString
                );
            } else {
                // Regular task completion
                await updateTaskStatus(contact.taskId, 'completed', description);
            }

            Alert.alert('Success', `Enquiry marked as completed${callDuration > 0 ? `\nCall duration: ${formatCallDuration(callDuration)}` : ''}`);
            
            // Clear call duration for this contact
            setCallDurations(prev => {
                const updated = { ...prev };
                delete updated[contactKey];
                return updated;
            });
            
            setExpandedId(null);
        } catch (error) {
            console.error('Error updating enquiry:', error);
            Alert.alert('Error', 'Failed to update enquiry status');
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
                        <Text style={styles.sectionTitle}>Pending Enquiries</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingContacts.length}</Text>
                        </View>
                    </View>
                    
                    {pendingContacts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
                            <Text style={styles.emptyTitle}>All Done!</Text>
                            <Text style={styles.emptyText}>
                                No pending enquiry tasks
                            </Text>
                        </View>
                    ) : (
                        pendingContacts.map((contact) => {
                            const contactKey = contact.contactNumber 
                                ? `${contact.taskId}_${contact.contactNumber}` 
                                : contact.taskId;
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
                                            <MaterialIcons 
                                                name={contact.contactNumber ? "phone" : "assignment"} 
                                                size={24} 
                                                color="#fbb115" 
                                            />
                                        </View>
                                        <View style={styles.taskInfo}>
                                            {contact.contactNumber ? (
                                                <>
                                                    <Text style={styles.taskTitle}>{contact.contactNumber}</Text>
                                                    <Text style={styles.taskSubtitle}>{contact.taskTitle}</Text>
                                                </>
                                            ) : (
                                                <Text style={styles.taskTitle}>{contact.taskTitle}</Text>
                                            )}
                                            {contact.dueDate && (
                                                <Text style={styles.taskDate}>
                                                    Due: {new Date(contact.dueDate).toLocaleDateString()}
                                                </Text>
                                            )}
                                            {contact.priority && (
                                                <View style={[
                                                    styles.priorityBadge,
                                                    contact.priority === 'high' && styles.priorityHigh,
                                                    contact.priority === 'medium' && styles.priorityMedium,
                                                    contact.priority === 'low' && styles.priorityLow,
                                                ]}>
                                                    <Text style={styles.priorityText}>{contact.priority.toUpperCase()}</Text>
                                                </View>
                                            )}
                                        </View>
                                        {contact.contactNumber && (
                                            <TouchableOpacity
                                                style={[
                                                    styles.callButton,
                                                    callStartTimes[contactKey] && styles.callButtonActive
                                                ]}
                                                onPress={() => handleCall(contact.contactNumber, contactKey)}
                                            >
                                                <MaterialIcons 
                                                    name={callStartTimes[contactKey] ? "call-end" : "call"} 
                                                    size={24} 
                                                    color={callStartTimes[contactKey] ? "#f44336" : "#4CAF50"} 
                                                />
                                            </TouchableOpacity>
                                        )}
                                        <MaterialIcons 
                                            name={isExpanded ? "expand-less" : "expand-more"} 
                                            size={28} 
                                            color="#666" 
                                        />
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.taskDetails}>
                                            {contact.taskDescription && !contact.contactNumber && (
                                                <View style={styles.taskDescriptionBox}>
                                                    <Text style={styles.taskDescriptionLabel}>Task Details:</Text>
                                                    <Text style={styles.taskDescriptionText}>{contact.taskDescription}</Text>
                                                </View>
                                            )}
                                            
                                            {callDurations[contactKey] > 0 && (
                                                <View style={styles.callDurationBox}>
                                                    <MaterialIcons name="timer" size={20} color="#4CAF50" />
                                                    <Text style={styles.callDurationText}>
                                                        Total Call Time: {formatCallDuration(callDurations[contactKey])}
                                                    </Text>
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
                                                    placeholder="Enter enquiry details, outcome, and notes..."
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
                            <Text style={styles.sectionTitle}>Completed Enquiries</Text>
                            <View style={[styles.badge, styles.badgeCompleted]}>
                                <Text style={styles.badgeText}>{completedContacts.length}</Text>
                            </View>
                        </View>
                        
                        {completedContacts.map((contact) => {
                            const contactKey = contact.contactNumber 
                                ? `${contact.taskId}_${contact.contactNumber}` 
                                : contact.taskId;
                            
                            return (
                                <View key={contactKey} style={styles.completedCard}>
                                    <View style={styles.completedHeader}>
                                        <View style={styles.completedIconContainer}>
                                            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                                        </View>
                                        <View style={styles.completedInfo}>
                                            {contact.contactNumber ? (
                                                <>
                                                    <Text style={styles.completedTitle}>{contact.contactNumber}</Text>
                                                    <Text style={styles.completedSubtitle}>{contact.taskTitle}</Text>
                                                </>
                                            ) : (
                                                <Text style={styles.completedTitle}>{contact.taskTitle}</Text>
                                            )}
                                            {contact.dueDate && (
                                                <Text style={styles.completedDate}>
                                                    Due: {new Date(contact.dueDate).toLocaleDateString()}
                                                </Text>
                                            )}
                                        </View>
                                        {contact.contactNumber && (
                                            <TouchableOpacity
                                                style={styles.callButtonSmall}
                                                onPress={() => handleCall(contact.contactNumber, `${contact.taskId}_${contact.contactNumber}`)}
                                            >
                                                <MaterialIcons name="call" size={20} color="#4CAF50" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    
                                    {contact.taskDescription && !contact.contactNumber && (
                                        <View style={styles.taskDescriptionBox}>
                                            <Text style={styles.taskDescriptionLabel}>Task Details:</Text>
                                            <Text style={styles.taskDescriptionText}>{contact.taskDescription}</Text>
                                        </View>
                                    )}
                                    
                                    {contact.completionDescription && (
                                        <View style={styles.completedDescription}>
                                            <Text style={styles.descriptionLabel}>Completion Notes:</Text>
                                            <Text style={styles.descriptionText}>{contact.completionDescription}</Text>
                                        </View>
                                    )}
                                    
                                    {contact.callDuration && contact.callDuration > 0 && (
                                        <View style={styles.callDurationBox}>
                                            <MaterialIcons name="timer" size={18} color="#4CAF50" />
                                            <Text style={styles.callDurationText}>
                                                Call Duration: {formatCallDuration(contact.callDuration)}
                                            </Text>
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
                            Admin will assign enquiry tasks for you to complete
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
    taskTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    taskSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    taskDate: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    priorityHigh: {
        backgroundColor: '#ffebee',
    },
    priorityMedium: {
        backgroundColor: '#fff3e0',
    },
    priorityLow: {
        backgroundColor: '#e8f5e9',
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
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
    completedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    completedSubtitle: {
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
    callButtonActive: {
        backgroundColor: '#ffebee',
        borderRadius: 8,
    },
    callButtonSmall: {
        padding: 6,
    },
    callDurationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        gap: 8,
    },
    callDurationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },
});
