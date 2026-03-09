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

      <Tabs.Screen
        name="session"
        options={{
          title: "S2C",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="timer"
              size={focused ? 30 : 26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="employees"
        options={{
          title: "Employees",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="people"
              size={focused ? 30 : 26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="map"
              size={focused ? 30 : 26}
              color={color}
            />
          ),
        }}
      />

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
