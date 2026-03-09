import { MaterialIcons } from '@expo/vector-icons';
import { off, onValue, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { updateTaskStatus } from '../firebaseHelpers';
import { useSession } from './SessionContext';

interface Task {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'not_completed';
    assignedTo: string;
    assignedBy: string;
    dueDate: string;
    createdAt: string;
    acceptedAt?: string;
    rejectedAt?: string;
    completedAt?: string;
    notCompletedAt?: string;
    rejectionReason?: string;
    notCompletedReason?: string;
}

export default function TasksModule() {
    const { employee } = useSession();
    const insets = useSafeAreaInsets();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [reasonModalVisible, setReasonModalVisible] = useState(false);
    const [reason, setReason] = useState('');
    const [actionType, setActionType] = useState<'reject' | 'not_completed' | null>(null);

    useEffect(() => {
        if (!employee) return;

        const tasksRef = ref(db, 'tasks');
        const unsubscribe = onValue(tasksRef, (snapshot) => {
            if (!snapshot.exists()) {
                setTasks([]);
                setLoading(false);
                return;
            }

            const tasksList: Task[] = [];
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                if (data.assignedTo === employee.employeeId) {
                    tasksList.push({
                        id: childSnapshot.key,
                        ...data,
                    });
                }
            });

            // Sort by date (newest first)
            tasksList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setTasks(tasksList);
            setLoading(false);
            setRefreshing(false);
        });

        return () => off(tasksRef, 'value', unsubscribe);
    }, [employee]);

    const onRefresh = () => {
        setRefreshing(true);
    };

    const handleAccept = async (task: Task) => {
        Alert.alert(
            'Accept Task',
            `Do you want to accept "${task.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    onPress: async () => {
                        try {
                            await updateTaskStatus(task.id, 'accepted');
                            Alert.alert('Success', 'Task accepted successfully!');
                        } catch (error) {
                            Alert.alert('Error', 'Could not accept task.');
                        }
                    }
                }
            ]
        );
    };

    const handleReject = (task: Task) => {
        setSelectedTask(task);
        setActionType('reject');
        setReasonModalVisible(true);
    };

    const handleComplete = async (task: Task) => {
        Alert.alert(
            'Mark as Completed',
            `Mark "${task.title}" as completed?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Completed',
                    onPress: async () => {
                        try {
                            await updateTaskStatus(task.id, 'completed');
                            Alert.alert('Success', 'Task marked as completed!');
                        } catch (error) {
                            Alert.alert('Error', 'Could not update task.');
                        }
                    }
                },
                {
                    text: 'Not Completed',
                    style: 'destructive',
                    onPress: () => {
                        setSelectedTask(task);
                        setActionType('not_completed');
                        setReasonModalVisible(true);
                    }
                }
            ]
        );
    };

    const submitReason = async () => {
        if (!selectedTask || !actionType) return;

        if (!reason.trim()) {
            Alert.alert('Required', 'Please enter a reason.');
            return;
        }

        try {
            await updateTaskStatus(selectedTask.id, actionType, reason.trim());
            Alert.alert('Success', `Task ${actionType === 'reject' ? 'rejected' : 'marked as not completed'} successfully!`);
            setReasonModalVisible(false);
            setReason('');
            setSelectedTask(null);
            setActionType(null);
        } catch (error) {
            Alert.alert('Error', 'Could not update task.');
        }
    };

    const getPriorityColor = (priority?: string) => {
        if (!priority) return '#999';
        switch (priority.toLowerCase()) {
            case 'high': return '#f44336';
            case 'medium': return '#FF9800';
            case 'low': return '#4CAF50';
            default: return '#999';
        }
    };

    const getStatusColor = (status?: string) => {
        if (!status) return '#999';
        switch (status.toLowerCase()) {
            case 'pending': return '#FF9800';
            case 'accepted': return '#2196F3';
            case 'rejected': return '#f44336';
            case 'completed': return '#4CAF50';
            case 'not_completed': return '#f44336';
            default: return '#999';
        }
    };

    const getStatusIcon = (status?: string) => {
        if (!status) return 'help';
        switch (status.toLowerCase()) {
            case 'pending': return 'schedule';
            case 'accepted': return 'check-circle';
            case 'rejected': return 'cancel';
            case 'completed': return 'task-alt';
            case 'not_completed': return 'error';
            default: return 'help';
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'No date';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return 'Invalid date';
        }
    };

    const isOverdue = (dueDate?: string, status?: string) => {
        if (!dueDate || !status || status === 'completed') return false;
        try {
            const due = new Date(dueDate);
            const now = new Date();
            return due < now;
        } catch {
            return false;
        }
    };

    const renderTask = (task: Task) => {
        if (!task) return null;
        
        const overdue = isOverdue(task.dueDate, task.status);
        const priority = task.priority || 'medium';
        const status = task.status || 'pending';
        const title = task.title || 'Untitled Task';
        const description = task.description || 'No description';

        return (
            <View key={task.id} style={[styles.taskCard, overdue && styles.overdueCard]}>
                {/* Header */}
                <View style={styles.taskHeader}>
                    <View style={styles.taskTitleRow}>
                        <Text style={styles.taskTitle}>{title}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(priority) }]}>
                            <Text style={styles.priorityText}>{priority.toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20', borderColor: getStatusColor(status) }]}>
                        <MaterialIcons name={getStatusIcon(status) as any} size={16} color={getStatusColor(status)} />
                        <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                            {status.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Description */}
                <Text style={styles.taskDescription}>{description}</Text>

                {/* Due Date */}
                <View style={styles.taskMeta}>
                    <MaterialIcons name="event" size={16} color="#666" />
                    <Text style={[styles.metaText, overdue && styles.overdueText]}>
                        Due: {formatDate(task.dueDate)}
                        {overdue && ' (OVERDUE)'}
                    </Text>
                </View>

                {/* Reasons */}
                {task.rejectionReason && (
                    <View style={styles.reasonBox}>
                        <Text style={styles.reasonLabel}>Rejection Reason:</Text>
                        <Text style={styles.reasonText}>{task.rejectionReason}</Text>
                    </View>
                )}
                {task.notCompletedReason && (
                    <View style={styles.reasonBox}>
                        <Text style={styles.reasonLabel}>Not Completed Reason:</Text>
                        <Text style={styles.reasonText}>{task.notCompletedReason}</Text>
                    </View>
                )}

                {/* Actions */}
                {task.status === 'pending' && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleAccept(task)}
                        >
                            <MaterialIcons name="check" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleReject(task)}
                        >
                            <MaterialIcons name="close" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {task.status === 'accepted' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={() => handleComplete(task)}
                    >
                        <MaterialIcons name="task-alt" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Mark as Complete</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const pendingTasks = tasks.filter(t => t && t.status === 'pending');
    const acceptedTasks = tasks.filter(t => t && t.status === 'accepted');
    const completedTasks = tasks.filter(t => t && (t.status === 'completed' || t.status === 'not_completed' || t.status === 'rejected'));

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }
                ]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.header}>
                    <MaterialIcons name="assignment" size={40} color="#2196F3" />
                    <Text style={styles.title}>My Tasks</Text>
                </View>
                <Text style={styles.subtitle}>Daily tasks assigned by admin</Text>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: '#fff3e0' }]}>
                        <Text style={styles.summaryNumber}>{pendingTasks.length}</Text>
                        <Text style={styles.summaryLabel}>Pending</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: '#e3f2fd' }]}>
                        <Text style={styles.summaryNumber}>{acceptedTasks.length}</Text>
                        <Text style={styles.summaryLabel}>In Progress</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
                        <Text style={styles.summaryNumber}>{completedTasks.length}</Text>
                        <Text style={styles.summaryLabel}>Completed</Text>
                    </View>
                </View>

                {/* Pending Tasks */}
                {pendingTasks.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Pending Tasks</Text>
                        {pendingTasks.map(renderTask)}
                    </>
                )}

                {/* Accepted Tasks */}
                {acceptedTasks.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>In Progress</Text>
                        {acceptedTasks.map(renderTask)}
                    </>
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Completed / Closed</Text>
                        {completedTasks.map(renderTask)}
                    </>
                )}

                {tasks.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="assignment" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No tasks assigned yet</Text>
                    </View>
                )}
            </ScrollView>

            {/* Reason Modal */}
            <Modal
                visible={reasonModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setReasonModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {actionType === 'reject' ? 'Rejection Reason' : 'Why Not Completed?'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            Please provide a reason for {actionType === 'reject' ? 'rejecting' : 'not completing'} this task
                        </Text>

                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Enter reason..."
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setReasonModalVisible(false);
                                    setReason('');
                                    setSelectedTask(null);
                                    setActionType(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={submitReason}
                            >
                                <Text style={styles.submitButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flex: 1,
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
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
    },
    summaryNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 10,
        marginBottom: 15,
    },
    taskCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    overdueCard: {
        borderColor: '#f44336',
        borderWidth: 2,
    },
    taskHeader: {
        marginBottom: 10,
    },
    taskTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    taskTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        flex: 1,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 10,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        gap: 5,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    taskDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 10,
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 10,
    },
    metaText: {
        fontSize: 13,
        color: '#666',
    },
    overdueText: {
        color: '#f44336',
        fontWeight: 'bold',
    },
    reasonBox: {
        backgroundColor: '#fff3e0',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#FF9800',
    },
    reasonLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 5,
    },
    reasonText: {
        fontSize: 13,
        color: '#000',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        gap: 5,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#f44336',
    },
    completeButton: {
        backgroundColor: '#2196F3',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 5,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    reasonInput: {
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        color: '#000',
        height: 120,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    modalButton: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    submitButton: {
        backgroundColor: '#2196F3',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});
