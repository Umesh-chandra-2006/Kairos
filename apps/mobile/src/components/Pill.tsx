import { StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

interface PillProps {
  children: ReactNode;
  /** Leading icon or emoji */
  icon?: string;
}

/**
 * Pill / chip — surface-2 fill, line border, mono text.
 * Used for streaks, category tags, timers — small stateful facts.
 * Not for navigation.
 */
export function Pill({ children, icon }: PillProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: colors.surface2, borderColor: colors.line },
      ]}
    >
      {icon ? <Text style={[styles.text, { color: colors.textDim }]}>{icon} </Text> : null}
      <Text style={[styles.text, { color: colors.textDim }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    fontWeight: "600",
  },
});
