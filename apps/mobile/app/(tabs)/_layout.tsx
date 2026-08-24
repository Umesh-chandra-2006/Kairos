import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import Svg, { Circle, Path } from "react-native-svg";

// Inline SVG icons (avoids a heavy icon library dependency)
function IconToday({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function IconPractice({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16M4 12h10M4 18h7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="19" cy="16" r="3" stroke={color} strokeWidth="1.8" />
      <Path d="M19 13v3l2 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function IconProgress({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l5-5 4 4 5-6 4 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconHistory({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8v4l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M3.05 11A9 9 0 1 0 4 7.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M3 4v4h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconProfile({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 68,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontFamily: "IBMPlexMono_600SemiBold",
          fontSize: 9,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginTop: 2,
        },
        tabBarIcon: ({ color }) => {
          const c = String(color);
          if (route.name === "today") return <IconToday color={c} />;
          if (route.name === "practice") return <IconPractice color={c} />;
          if (route.name === "progress") return <IconProgress color={c} />;
          if (route.name === "history") return <IconHistory color={c} />;
          if (route.name === "profile") return <IconProfile color={c} />;
          return null;
        },
      })}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="practice" options={{ title: "Practice" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

