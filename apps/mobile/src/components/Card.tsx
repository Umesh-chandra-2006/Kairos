import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme/ThemeContext";
import { radii } from "@/theme";

interface CardProps {
  children: ReactNode;
  style?: object;
  /** Center all content horizontally */
  center?: boolean;
}

/** Surface card — bg token, 1px line border, 16px radius, 16px padding. No shadow. */
export function Card({ children, style, center }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
        center && styles.center,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  center: {
    alignItems: "center",
  },
});
