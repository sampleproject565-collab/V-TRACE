import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { useSession } from "@/components/SessionContext";
import { MaterialIcons } from "@expo/vector-icons";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { employee } = useSession();

  if (!employee) {
    return <Redirect href="/auth" />;
  }

  const isOfficeStaff = employee?.role === 'office_staff';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#fbb115",
        tabBarInactiveTintColor: "#666",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e5e5",
          height: Platform.OS === "ios" ? 85 + insets.bottom : 70,
          paddingBottom: Platform.OS === "ios" ? insets.bottom : Math.max(insets.bottom, 15),
          paddingTop: 10,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="dashboard"
              size={focused ? 30 : 26}
              color={color}
            />
          ),
        }}
      />

      {/* S2C Tab - Only for Field Staff */}
      <Tabs.Screen
        name="session"
        options={{
          title: "S2C",
          href: isOfficeStaff ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="timer"
              size={focused ? 30 : 26}
              color={color}
            />
          ),
        }}
      />

      {/* Enquiry Tab - Only for Office Staff */}
      <Tabs.Screen
        name="enquiry"
        options={{
          title: "Enquiry",
          href: isOfficeStaff ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="phone-in-talk"
              size={focused ? 30 : 26}
              color={color}
            />
          ),
        }}
      />

      {/* Employees Tab - Only for Field Staff */}
      <Tabs.Screen
        name="employees"
        options={{
          title: "Employees",
          href: isOfficeStaff ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="people"
              size={focused ? 30 : 26}
              color={color}
            />
          ),
        }}
      />

      {/* Map Tab - Only for Field Staff */}
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          href: isOfficeStaff ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="map"
              size={focused ? 30 : 26}
              color={color}
            />
          ),
        }}
      />

      {/* History Tab - For Both */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <MaterialIcons name="date-range" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
