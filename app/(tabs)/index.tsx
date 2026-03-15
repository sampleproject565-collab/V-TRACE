import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { off, onValue, ref } from "firebase/database";
import React from "react";
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSession } from "../../components/SessionContext";
import { db } from "../../firebase";

export default function HomeScreen() {
  const { employee, session, logout, locationCount, refreshUserRole } = useSession();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const isOfficeStaff = employee?.role === 'office_staff';

  const handleLogout = () => {
    logout();
  };

  const handleRefreshRole = async () => {
    setRefreshing(true);
    await refreshUserRole();
    setRefreshing(false);
    Alert.alert('Success', 'User role refreshed from database');
  };

  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [pastSessionsMs, setPastSessionsMs] = React.useState(0);

  // Real-time listener for sessions
  React.useEffect(() => {
    if (!employee) return;

    const sessionsRef = ref(db, 'sessions');
    
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPastSessionsMs(0);
        return;
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      let totalMs = 0;

      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data.employeeId === employee.employeeId && data.startTime) {
          const startTime = new Date(data.startTime);
          if (startTime >= startOfToday) {
            // Add up closed sessions from today, excluding the currently active one
            if (childSnapshot.key !== session.sessionId && data.status === 'CLOSED') {
              totalMs += (data.totalWorkTimeMs || 0);
            }
          }
        }
      });

      setPastSessionsMs(totalMs);
    }, (error) => {
      console.log('Error listening to sessions', error);
    });

    return () => off(sessionsRef, 'value', unsubscribe);
  }, [employee, session.sessionId]);

  React.useEffect(() => {
    let interval: any;
    const calculateTime = () => {
      if (!session.isActive) {
        setElapsedMs(0);
        return;
      }

      let currentWorkMs = session.totalWorkTimeMs;

      if (!session.isPaused && session.startTime) {
        const now = new Date();
        const sessionStart = new Date(session.startTime);
        let currentElapsed = now.getTime() - sessionStart.getTime();

        // subtract any break time
        let activeBreakTime = session.totalBreakTimeMs;
        currentWorkMs = currentElapsed - activeBreakTime;
      }

      setElapsedMs(currentWorkMs);
    };

    calculateTime(); // calculate immediately
    interval = setInterval(calculateTime, 1000); // update every 1 second

    return () => clearInterval(interval);
  }, [session]);

  const formatTime = (totalMs: number) => {
    if (totalMs <= 0) return "00:00:00";
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (!session.isActive) return "Not Started";
    if (session.isPaused) return "On Break";
    return "Active";
  };

  const getStatusColor = () => {
    if (!session.isActive) return "#ccc";
    if (session.isPaused) return "#fbb115";
    return "#4ade80";
  };

  return (
    <View style={styles.gradientContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView>
        <View style={styles.dashboardContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.dashboardTitle}>Dashboard</Text>
              <Text style={styles.employeeIdText}>
                {employee?.name} (ID: {employee?.employeeId})
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={[styles.employeeIdText, { color: employee?.role === 'office_staff' ? '#4CAF50' : '#2196F3', fontWeight: '600' }]}>
                  Role: {employee?.role === 'office_staff' ? 'Office Staff' : 'Field Staff'}
                </Text>
                <TouchableOpacity
                  onPress={handleRefreshRole}
                  disabled={refreshing}
                  style={{ opacity: refreshing ? 0.5 : 1 }}
                >
                  <MaterialIcons name="refresh" size={18} color="#fbb115" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <MaterialIcons name="logout" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {isOfficeStaff ? (
            // Office Staff Dashboard
            <>
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <MaterialIcons name="business" size={24} color="#4CAF50" />
                  <Text style={styles.statusText}>Office Staff Portal</Text>
                </View>
                <Text style={styles.welcomeText}>
                  Manage enquiries and customer interactions
                </Text>
              </View>

              <View style={styles.gridContainer}>
                <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(tabs)/enquiry')}>
                  <MaterialIcons name="assignment" size={40} color="#fbb115" />
                  <Text style={styles.gridItemText}>Enquiries</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(tabs)/calendar')}>
                  <MaterialIcons name="history" size={40} color="#fbb115" />
                  <Text style={styles.gridItemText}>History</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <MaterialIcons name="info" size={24} color="#fbb115" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Welcome to V Trace</Text>
                  <Text style={styles.infoText}>
                    Manage customer enquiries and track interactions from the office.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            // Field Staff Dashboard
            <>
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View style={[styles.statusDotActive, { backgroundColor: getStatusColor() }]} />
                  <Text style={styles.statusText}>Session: {getStatusText()}</Text>
                </View>

                <View style={styles.trackingInfo}>
                  <View style={styles.trackingRow}>
                    <MaterialIcons name="schedule" size={20} color="#fbb115" />
                    <View style={styles.trackingDetails}>
                      <Text style={styles.trackingLabel}>Active Session Time</Text>
                      <Text style={styles.trackingValue}>
                        {formatTime(elapsedMs)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.trackingRow}>
                    <MaterialIcons name="fact-check" size={20} color="#fbb115" />
                    <View style={styles.trackingDetails}>
                      <Text style={styles.trackingLabel}>Total Work Time Today</Text>
                      <Text style={styles.trackingValue}>
                        {formatTime(elapsedMs + pastSessionsMs)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.trackingRow}>
                    <MaterialIcons name="pin-drop" size={20} color="#fbb115" />
                    <View style={styles.trackingDetails}>
                      <Text style={styles.trackingLabel}>Locations Recorded</Text>
                      <Text style={styles.trackingValue}>{locationCount} updates</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.gridContainer}>
                <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(tabs)/session')}>
                  <MaterialIcons name="timer" size={40} color="#fbb115" />
                  <Text style={styles.gridItemText}>Start/Close</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(tabs)/visit')}>
                  <MaterialIcons name="handshake" size={40} color="#fbb115" />
                  <Text style={styles.gridItemText}>Log Visit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/(tabs)/map')}>
                  <MaterialIcons name="map" size={40} color="#fbb115" />
                  <Text style={styles.gridItemText}>Leads Map</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <MaterialIcons name="info" size={24} color="#fbb115" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Welcome to V Trace</Text>
                  <Text style={styles.infoText}>
                    Use the start/close module to begin your day. Background locations will automatically track once active.
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  dashboardContainer: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dashboardTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#000",
  },
  employeeIdText: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  logoutButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 25,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  statusDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4ade80",
  },
  statusText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  trackingInfo: {
    gap: 15,
  },
  trackingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 15,
    gap: 12,
  },
  trackingDetails: {
    flex: 1,
  },
  trackingLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  trackingValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  welcomeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    lineHeight: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  gridItemText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#fff5e6",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fbb115",
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});
