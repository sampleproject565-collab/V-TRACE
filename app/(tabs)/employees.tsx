import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CRMModule from '../../components/CRMModule';
import CropDiseaseModule from '../../components/CropDiseaseModule';
import FieldMeasurementModule from '../../components/FieldMeasurementModule';
import { useSession } from '../../components/SessionContext';
import TasksModule from '../../components/TasksModule';
import TravelExpenseModule from '../../components/TravelExpenseModule';
import VisitModule from '../../components/VisitModule';

type ModuleType = 'visit' | 'expense' | 'crm' | 'crop' | 'measure' | 'tasks' | 'enquiry' | null;

export default function EmployeesScreen() {
    const { employee } = useSession();
    const insets = useSafeAreaInsets();
    const [activeModule, setActiveModule] = useState<ModuleType>(null);

    // Determine if user is office staff
    const isOfficeStaff = employee?.role === 'office_staff';

    // Office Staff modules
    const officeStaffModules = [
        { 
            id: 'enquiry', 
            name: 'Contact Enquiry', 
            icon: 'phone-in-talk',
            description: 'Call assigned contacts and log enquiry details',
            color: '#fbb115',
        },
        { 
            id: 'tasks', 
            name: 'My Tasks', 
            icon: 'assignment',
            description: 'View and manage daily tasks from admin',
            color: '#2196F3',
        },
    ];

    // Field Staff modules
    const fieldStaffModules = [
        { 
            id: 'tasks', 
            name: 'My Tasks', 
            icon: 'assignment',
            description: 'View and manage daily tasks from admin',
            color: '#2196F3',
        },
        { 
            id: 'visit', 
            name: 'Visit', 
            icon: 'handshake',
            description: 'Log customer visits and site interactions',
            color: '#4CAF50',
        },
        { 
            id: 'expense', 
            name: 'Travel Expense', 
            icon: 'directions-car',
            description: 'Track distance and calculate TA reimbursement',
            color: '#2196F3',
        },
        { 
            id: 'crm', 
            name: 'Dynamic CRM', 
            icon: 'people-outline',
            description: 'Add customers with smart form fields',
            color: '#9C27B0',
        },
        { 
            id: 'crop', 
            name: 'Crop Disease', 
            icon: 'bug-report',
            description: 'Document crop health and disease issues',
            color: '#FF5722',
        },
        { 
            id: 'measure', 
            name: 'Field Measurement', 
            icon: 'square-foot',
            description: 'Measure farm land using GPS polygon',
            color: '#00BCD4',
        },
    ];

    const modules = isOfficeStaff ? officeStaffModules : fieldStaffModules;

    const renderModuleContent = () => {
        switch (activeModule) {
            case 'enquiry':
                return <OfficeStaffEnquiryModule />;
            case 'tasks':
                return <TasksModule />;
            case 'visit':
                return <VisitModule />;
            case 'expense':
                return <TravelExpenseModule />;
            case 'crm':
                return <CRMModule />;
            case 'crop':
                return <CropDiseaseModule />;
            case 'measure':
                return <FieldMeasurementModule />;
            default:
                return null;
        }
    };

    const getModuleName = () => {
        const module = modules.find(m => m.id === activeModule);
        return module ? module.name : '';
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                <MaterialIcons name="people" size={36} color="#fbb115" />
                <Text style={styles.headerTitle}>
                    {isOfficeStaff ? 'Office Staff' : 'Field Staff'}
                </Text>
            </View>

            {/* Module Grid */}
            <ScrollView 
                style={styles.scrollContainer}
                contentContainerStyle={[
                    styles.moduleGrid,
                    { paddingBottom: Math.max(insets.bottom, 20) + 20 }
                ]}
            >
                {modules.map((module) => (
                    <TouchableOpacity
                        key={module.id}
                        style={[styles.moduleCard, { borderLeftColor: module.color }]}
                        onPress={() => setActiveModule(module.id as ModuleType)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: module.color + '20' }]}>
                            <MaterialIcons
                                name={module.icon as any}
                                size={48}
                                color={module.color}
                            />
                        </View>
                        <View style={styles.moduleInfo}>
                            <Text style={styles.moduleName}>{module.name}</Text>
                            <Text style={styles.moduleDescription}>{module.description}</Text>
                        </View>
                        <MaterialIcons name="arrow-forward-ios" size={24} color="#ccc" />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Module Modal */}
            <Modal
                visible={activeModule !== null}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setActiveModule(null)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setActiveModule(null)}
                        >
                            <MaterialIcons name="arrow-back" size={28} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{getModuleName()}</Text>
                        <View style={{ width: 28 }} />
                    </View>
                    {renderModuleContent()}
                </View>
            </Modal>
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
    moduleGrid: {
        padding: 20,
        gap: 15,
    },
    moduleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderLeftWidth: 6,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        gap: 15,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleInfo: {
        flex: 1,
        gap: 5,
    },
    moduleName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    moduleDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    backButton: {
        padding: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
});
