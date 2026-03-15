import { MaterialIcons } from '@expo/vector-icons';
import { off, onValue, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../components/SessionContext';
import { db } from '../../firebase';

interface PastSession {
    id: string;
    startTime: Date;
    endTime: Date | null;
    totalWorkTimeMs: number;
    totalBreakTimeMs: number;
    workType?: string;
    status: string;
}

interface PastVisit {
    id: string;
    customerName: string;
    purpose: string;
    timestamp: Date;
    sessionId: string;
}

interface CompletedTask {
    id: string;
    title: string;
    description?: string;
    completionDescription?: string;
    completedAt: string;
    taskType?: 'field' | 'enquiry';
    priority?: 'high' | 'medium' | 'low';
    contactNumber?: string;
    callDuration?: number;
}

interface DailySummary {
    dateStr: string;
    sessions: PastSession[];
    visits: PastVisit[];
    tasks: CompletedTask[];
    totalWorkMs: number;
    totalBreakMs: number;
}

export default function CalendarScreen() {
    const { employee } = useSession();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<DailySummary[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const isOfficeStaff = employee?.role === 'office_staff';

    const fetchData = async () => {
        if (!employee) return;
        setLoading(true);

        try {
            if (isOfficeStaff) {
                // For office staff, show completed tasks
                const tasksRef = ref(db, 'tasks');
                
                onValue(tasksRef, (tasksSnap) => {
                    const completedTasks: CompletedTask[] = [];
                    
                    if (tasksSnap.exists()) {
                        tasksSnap.forEach((childSnapshot) => {
                            const data = childSnapshot.val();
                            if (data.assignedTo === employee.employeeId && data.status === 'completed') {
                                // Check if it's an enquiry task with multiple contacts
                                if (data.taskType === 'enquiry' && data.completionDescription && data.completionDescription.startsWith('{')) {
                                    try {
                                        const contactCompletions = JSON.parse(data.completionDescription);
                                        // Create separate task entry for each completed contact
                                        Object.keys(contactCompletions).forEach(contactNumber => {
                                            const completion = contactCompletions[contactNumber];
                                            completedTasks.push({
                                                id: `${childSnapshot.key}_${contactNumber}`,
                                                title: data.title,
                                                description: data.description,
                                                completionDescription: completion.description,
                                                completedAt: completion.completedAt,
                                                taskType: data.taskType,
                                                priority: data.priority,
                                                contactNumber: contactNumber,
                                                callDuration: completion.callDuration,
                                            });
                                        });
                                    } catch (e) {
                                        console.error('Error parsing contact completions:', e);
                                    }
                                } else {
                                    // Regular completed task
                                    completedTasks.push({
                                        id: childSnapshot.key || '',
                                        title: data.title,
                                        description: data.description,
                                        completionDescription: data.completionDescription,
                                        completedAt: data.completedAt,
                                        taskType: data.taskType,
                                        priority: data.priority,
                                    });
                                }
                            }
                        });
                    }

                    completedTasks.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

                    // Group by Date String
                    const grouped = new Map<string, DailySummary>();

                    completedTasks.forEach(task => {
                        const dateObj = new Date(task.completedAt);
                        const dStr = dateObj.toISOString().split('T')[0];
                        if (!grouped.has(dStr)) {
                            grouped.set(dStr, { dateStr: dStr, sessions: [], visits: [], tasks: [], totalWorkMs: 0, totalBreakMs: 0 });
                        }
                        const summary = grouped.get(dStr)!;
                        summary.tasks.push(task);
                    });

                    const result = Array.from(grouped.values()).sort((a, b) => {
                        return new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime();
                    });

                    setHistory(result);
                    setLoading(false);
                    setRefreshing(false);
                }, (error) => {
                    console.error('Error fetching tasks', error);
                    setLoading(false);
                    setRefreshing(false);
                });
            } else {
                // For field staff, show sessions and visits
                const sessionsRef = ref(db, 'sessions');
                const visitsRef = ref(db, 'visits');

            const sessionsUnsubscribe = onValue(sessionsRef, (sessionsSnap) => {
                const sessions: PastSession[] = [];
                
                if (sessionsSnap.exists()) {
                    sessionsSnap.forEach((childSnapshot) => {
                        const data = childSnapshot.val();
                        if (data.employeeId === employee.employeeId) {
                            sessions.push({
                                id: childSnapshot.key || '',
                                startTime: new Date(data.startTime),
                                endTime: data.endTime ? new Date(data.endTime) : null,
                                totalWorkTimeMs: data.totalWorkTimeMs || 0,
                                totalBreakTimeMs: data.totalBreakTimeMs || 0,
                                workType: data.workType || 'UNKNOWN',
                                status: data.status
                            });
                        }
                    });
                }

                sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

                // Fetch visits
                onValue(visitsRef, (visitsSnap) => {
                    const visits: PastVisit[] = [];
                    
                    if (visitsSnap.exists()) {
                        visitsSnap.forEach((childSnapshot) => {
                            const data = childSnapshot.val();
                            if (data.employeeId === employee.employeeId) {
                                visits.push({
                                    id: childSnapshot.key || '',
                                    customerName: data.leadName || 'Unknown',
                                    purpose: data.notes || '',
                                    timestamp: new Date(data.timestamp),
                                    sessionId: data.sessionId
                                });
                            }
                        });
                    }

                    visits.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                    // Group by Date String
                    const grouped = new Map<string, DailySummary>();

                    sessions.forEach(s => {
                        const dateObj = new Date(s.startTime);
                        const dStr = dateObj.toISOString().split('T')[0]; // Use YYYY-MM-DD format
                        if (!grouped.has(dStr)) {
                            grouped.set(dStr, { dateStr: dStr, sessions: [], visits: [], tasks: [], totalWorkMs: 0, totalBreakMs: 0 });
                        }
                        const summary = grouped.get(dStr)!;
                        summary.sessions.push(s);
                        summary.totalWorkMs += s.totalWorkTimeMs;
                        summary.totalBreakMs += s.totalBreakTimeMs;
                    });

                    visits.forEach(v => {
                        const dateObj = new Date(v.timestamp);
                        const dStr = dateObj.toISOString().split('T')[0]; // Use YYYY-MM-DD format
                        if (!grouped.has(dStr)) {
                            grouped.set(dStr, { dateStr: dStr, sessions: [], visits: [], tasks: [], totalWorkMs: 0, totalBreakMs: 0 });
                        }
                        const summary = grouped.get(dStr)!;
                        summary.visits.push(v);
                    });

                    // Convert to array and sort desc
                    const result = Array.from(grouped.values()).sort((a, b) => {
                        return new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime();
                    });

                    setHistory(result);
                    setLoading(false);
                    setRefreshing(false);
                }, (error) => {
                    console.error('Error fetching visits', error);
                    setLoading(false);
                    setRefreshing(false);
                });

            }, (error) => {
                console.error('Error fetching sessions', error);
                setLoading(false);
                setRefreshing(false);
            });
            }
        } catch (error) {
            console.error('Error fetching calendar data', error);
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!employee) return;

        fetchData();

        // Cleanup listeners on unmount
        return () => {
            if (isOfficeStaff) {
                const tasksRef = ref(db, 'tasks');
                off(tasksRef);
            } else {
                const sessionsRef = ref(db, 'sessions');
                const visitsRef = ref(db, 'visits');
                off(sessionsRef);
                off(visitsRef);
            }
        };
    }, [employee, isOfficeStaff]);

    const formatDuration = (ms: number) => {
        const totalMinutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    };

    const formatCallDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const toggleTaskExpand = (taskId: string) => {
        setExpandedTask(expandedTask === taskId ? null : taskId);
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading History...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={[
                styles.contentContainer,
                { paddingTop: Math.max(insets.top, 50), paddingBottom: Math.max(insets.bottom, 50) }
            ]}
        >
            <View style={styles.header}>
                <MaterialIcons name="date-range" size={40} color="#fbb115" />
                <Text style={styles.title}>History</Text>
            </View>
            <Text style={styles.subtitle}>Your work calendar and reports</Text>

            {history.length > 0 && (
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Overall Summary</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <MaterialIcons name="event" size={24} color="#fbb115" />
                            <Text style={styles.summaryValue}>{history.length}</Text>
                            <Text style={styles.summaryLabel}>Days Tracked</Text>
                        </View>
                        {isOfficeStaff ? (
                            <>
                                <View style={styles.summaryItem}>
                                    <MaterialIcons name="assignment-turned-in" size={24} color="#4ade80" />
                                    <Text style={styles.summaryValue}>
                                        {history.reduce((sum, day) => sum + (day.tasks?.length || 0), 0)}
                                    </Text>
                                    <Text style={styles.summaryLabel}>Completed Tasks</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <MaterialIcons name="phone" size={24} color="#3b82f6" />
                                    <Text style={styles.summaryValue}>
                                        {history.reduce((sum, day) => sum + (day.tasks?.filter(t => t.taskType === 'enquiry').length || 0), 0)}
                                    </Text>
                                    <Text style={styles.summaryLabel}>Enquiries</Text>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.summaryItem}>
                                    <MaterialIcons name="work" size={24} color="#4ade80" />
                                    <Text style={styles.summaryValue}>
                                        {history.reduce((sum, day) => sum + day.sessions.length, 0)}
                                    </Text>
                                    <Text style={styles.summaryLabel}>Total Sessions</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <MaterialIcons name="handshake" size={24} color="#3b82f6" />
                                    <Text style={styles.summaryValue}>
                                        {history.reduce((sum, day) => sum + day.visits.length, 0)}
                                    </Text>
                                    <Text style={styles.summaryLabel}>Total Visits</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            )}

            {history.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="fact-check" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>No past history found.</Text>
                </View>
            ) : (
                history.map((day, ix) => (
                    <View key={ix} style={styles.dayCard}>
                        <View style={styles.dayHeader}>
                            <Text style={styles.dateText}>
                                {new Date(day.dateStr + 'T00:00:00').toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </Text>
                        </View>

                        {isOfficeStaff ? (
                            <>
                                <View style={styles.metricsRow}>
                                    <View style={styles.metricBox}>
                                        <Text style={styles.metricValue}>{day.tasks?.length || 0}</Text>
                                        <Text style={styles.metricLabel}>Tasks</Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text style={styles.metricValue}>{day.tasks?.filter(t => t.taskType === 'enquiry').length || 0}</Text>
                                        <Text style={styles.metricLabel}>Enquiries</Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text style={styles.metricValue}>{day.tasks?.filter(t => t.callDuration && t.callDuration > 0).length || 0}</Text>
                                        <Text style={styles.metricLabel}>Calls Made</Text>
                                    </View>
                                </View>

                                {day.tasks && day.tasks.length > 0 && (
                                    <View style={styles.listSection}>
                                        <Text style={styles.listHeader}>Completed Tasks</Text>
                                        {day.tasks.map((task, idx) => {
                                            const isExpanded = expandedTask === task.id;
                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={styles.taskCard}
                                                    onPress={() => toggleTaskExpand(task.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.taskHeader}>
                                                        <View style={styles.taskIconContainer}>
                                                            <MaterialIcons 
                                                                name={task.taskType === 'enquiry' ? "phone" : "assignment"} 
                                                                size={20} 
                                                                color="#4CAF50" 
                                                            />
                                                        </View>
                                                        <View style={styles.taskInfo}>
                                                            {task.contactNumber ? (
                                                                <>
                                                                    <Text style={styles.taskTitle}>{task.contactNumber}</Text>
                                                                    <Text style={styles.taskSubtitle}>{task.title}</Text>
                                                                </>
                                                            ) : (
                                                                <Text style={styles.taskTitle}>{task.title}</Text>
                                                            )}
                                                            <Text style={styles.taskTime}>
                                                                {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </Text>
                                                            {task.priority && (
                                                                <View style={[
                                                                    styles.priorityBadge,
                                                                    task.priority === 'high' && styles.priorityHigh,
                                                                    task.priority === 'medium' && styles.priorityMedium,
                                                                    task.priority === 'low' && styles.priorityLow,
                                                                ]}>
                                                                    <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <MaterialIcons 
                                                            name={isExpanded ? "expand-less" : "expand-more"} 
                                                            size={24} 
                                                            color="#666" 
                                                        />
                                                    </View>

                                                    {isExpanded && (
                                                        <View style={styles.taskDetails}>
                                                            {task.completionDescription && (
                                                                <View style={styles.completionBox}>
                                                                    <Text style={styles.completionLabel}>Completion Notes:</Text>
                                                                    <Text style={styles.completionText}>{task.completionDescription}</Text>
                                                                </View>
                                                            )}
                                                            
                                                            {task.callDuration && task.callDuration > 0 && (
                                                                <View style={styles.callDurationBox}>
                                                                    <MaterialIcons name="timer" size={18} color="#4CAF50" />
                                                                    <Text style={styles.callDurationText}>
                                                                        Call Duration: {formatCallDuration(task.callDuration)}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            
                                                            <View style={styles.timestampBox}>
                                                                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                                                                <Text style={styles.timestampText}>
                                                                    Completed at {new Date(task.completedAt).toLocaleString()}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </>
                        ) : (
                            <>
                                <View style={styles.metricsRow}>
                                    <View style={styles.metricBox}>
                                        <Text style={styles.metricValue}>{formatDuration(day.totalWorkMs)}</Text>
                                        <Text style={styles.metricLabel}>Work</Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text style={styles.metricValue}>{formatDuration(day.totalBreakMs)}</Text>
                                        <Text style={styles.metricLabel}>Break</Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text style={styles.metricValue}>{day.visits.length}</Text>
                                        <Text style={styles.metricLabel}>Visits</Text>
                                    </View>
                                </View>

                        {day.sessions.length > 0 && (
                            <View style={styles.listSection}>
                                <Text style={styles.listHeader}>Sessions</Text>
                                {day.sessions.map((s, idx) => (
                                    <View key={idx} style={styles.sessionCard}>
                                        <View style={styles.sessionHeader}>
                                            <View style={styles.sessionTitleRow}>
                                                <MaterialIcons name="work" size={20} color="#fbb115" />
                                                <Text style={styles.sessionTitle}>{s.workType}</Text>
                                                <View style={[styles.statusBadge, s.status === 'CLOSED' ? styles.statusClosed : styles.statusActive]}>
                                                    <Text style={styles.statusText}>{s.status}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.sessionDetails}>
                                            <View style={styles.detailRow}>
                                                <MaterialIcons name="access-time" size={16} color="#666" />
                                                <Text style={styles.detailLabel}>Time:</Text>
                                                <Text style={styles.detailValue}>
                                                    {s.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {s.endTime ? s.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                                </Text>
                                            </View>
                                            
                                            <View style={styles.detailRow}>
                                                <MaterialIcons name="timer" size={16} color="#4ade80" />
                                                <Text style={styles.detailLabel}>Work:</Text>
                                                <Text style={[styles.detailValue, styles.workTime]}>{formatDuration(s.totalWorkTimeMs)}</Text>
                                            </View>
                                            
                                            <View style={styles.detailRow}>
                                                <MaterialIcons name="coffee" size={16} color="#fbb115" />
                                                <Text style={styles.detailLabel}>Break:</Text>
                                                <Text style={[styles.detailValue, styles.breakTime]}>{formatDuration(s.totalBreakTimeMs)}</Text>
                                            </View>
                                            
                                            {s.endTime && (
                                                <View style={styles.detailRow}>
                                                    <MaterialIcons name="schedule" size={16} color="#666" />
                                                    <Text style={styles.detailLabel}>Total Duration:</Text>
                                                    <Text style={styles.detailValue}>
                                                        {formatDuration(s.endTime.getTime() - s.startTime.getTime())}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {day.visits.length > 0 && (
                            <View style={styles.listSection}>
                                <Text style={styles.listHeader}>Site Visits</Text>
                                {day.visits.map((v, idx) => (
                                    <View key={idx} style={styles.listItem}>
                                        <MaterialIcons name="place" size={20} color="#666" />
                                        <Text style={styles.listText}>
                                            {v.customerName} ({v.purpose})
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                            </>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: 32,
        fontWeight: 'bold',
        marginLeft: 10,
        color: '#000',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 15,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        color: '#999',
        fontSize: 18,
        marginTop: 10,
    },
    dayCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dayHeader: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
        paddingBottom: 15,
        marginBottom: 15,
    },
    dateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    metricBox: {
        alignItems: 'center',
        flex: 1,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fbb115',
    },
    metricLabel: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
        marginTop: 4,
    },
    listSection: {
        marginTop: 15,
    },
    listHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#999',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    listText: {
        fontSize: 14,
        color: '#333',
    },
    sessionCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    sessionHeader: {
        marginBottom: 12,
    },
    sessionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sessionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusClosed: {
        backgroundColor: '#e8f5e9',
    },
    statusActive: {
        backgroundColor: '#fff3e0',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        textTransform: 'uppercase',
    },
    sessionDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
        minWidth: 80,
    },
    detailValue: {
        fontSize: 13,
        color: '#333',
        fontWeight: '600',
        flex: 1,
    },
    workTime: {
        color: '#4ade80',
    },
    breakTime: {
        color: '#fbb115',
    },
    taskCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        overflow: 'hidden',
    },
    taskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    taskIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    taskSubtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    taskTime: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
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
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
    },
    taskDetails: {
        padding: 15,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
    },
    completionBox: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    completionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 6,
    },
    completionText: {
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
    },
    callDurationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        gap: 6,
    },
    callDurationText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4CAF50',
    },
    timestampBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timestampText: {
        fontSize: 12,
        color: '#999',
    }
});
