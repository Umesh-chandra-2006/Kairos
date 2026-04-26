import { Tabs } from "expo-router";
import { View, StyleSheet, Text } from "react-native";
import { Colors } from "../../constants/Colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarLabel: "Today",
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🏠" color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: "History",
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="📋" color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="👤" color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <View style={styles.iconContainer}>
      <View style={{ opacity: color === Colors.accentLight ? 1 : 0.5 }}>
        {/* Using text emoji as icon to avoid extra icon library dependency */}
        <View>
          <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line react-native/no-raw-text */}
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.surfaceBorder,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
