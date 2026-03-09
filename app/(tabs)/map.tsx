import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import { useSession } from "../../components/SessionContext";
import { getVisitsByEmployee } from "../../firebaseHelpers";

const mapStyle = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e3f2fd" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
];

interface LeadMark {
  id: string;
  customerName: string;
  purpose: string;
  notes: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export default function LeadsMapScreen() {
  const { employee } = useSession();
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [leads, setLeads] = useState<LeadMark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    requestPermissionAndFetchLeads();
  }, [employee]);

  const requestPermissionAndFetchLeads = async () => {
    setIsLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === "granted") {
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(current.coords);
      } catch (e) {
        console.log("Could not get initial location map", e);
      }
    }

    if (employee) {
      try {
        const visitsData = await getVisitsByEmployee(employee.employeeId);
        const loadedLeads: LeadMark[] = [];

        visitsData.forEach(visit => {
          if (visit.latitude && visit.longitude) {
            loadedLeads.push({
              id: visit.id,
              customerName: visit.leadName || 'Unknown Customer',
              purpose: visit.notes || '',
              notes: visit.notes || '',
              latitude: visit.latitude,
              longitude: visit.longitude,
              timestamp: new Date(visit.timestamp),
            });
          }
        });
        setLeads(loadedLeads);
      } catch (error) {
        console.error("Error fetching leads logic:", error);
      }
    }

    setIsLoading(false);
  };

  if (isLoading || !location) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingCard}>
          <MaterialIcons name="map" size={60} color="#fbb115" />
          <Text style={styles.loadingText}>Loading Leads Map...</Text>
          <Text style={styles.loadingSubtext}>Retrieving CRM Data</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapStyle}
        showsUserLocation={true}
      >
        {/* Render each CRM Lead / Visit as a pin */}
        {leads.map(lead => (
          <Marker
            key={lead.id}
            coordinate={{
              latitude: lead.latitude,
              longitude: lead.longitude
            }}
          >
            <View style={styles.leadPin}>
              <MaterialIcons name="store" size={24} color="#fff" />
            </View>
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{lead.customerName}</Text>
                <Text style={styles.calloutSubtitle}>{lead.purpose}</Text>
                {lead.notes ? <Text style={styles.calloutNotes}>{lead.notes}</Text> : null}
                <Text style={styles.calloutDate}>{lead.timestamp.toLocaleDateString()}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <MaterialIcons name="people" size={24} color="#fbb115" />
          <View style={styles.infoDetails}>
            <Text style={styles.infoLabel}>CRM Funnel Database</Text>
            <Text style={styles.infoValue}>
              {leads.length} Geo-Referenced Leads
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.centerButton} onPress={requestPermissionAndFetchLeads} activeOpacity={0.8}>
        <MaterialIcons name="refresh" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 40,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  loadingText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  leadPin: {
    backgroundColor: '#fbb115',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  calloutContainer: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  calloutNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  calloutDate: {
    fontSize: 10,
    color: '#999',
  },
  infoCard: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  infoDetails: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  centerButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
