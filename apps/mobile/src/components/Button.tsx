import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii, typescale } from "@/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** primary = amber filled CTA, secondary = outline, danger = danger outline */
  variant?: "primary" | "secondary" | "danger";
  fullWidth?: boolean;
}

/**
 * Design-system button.
 * - primary: accent (amber) fill, accent-ink text, 700 weight — one per screen
 * - secondary: line border, transparent fill — lower-priority pair action
 * - danger: danger color text, line border — destructive actions
 */
export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  fullWidth = true,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === "primary" ? colors.accent : "transparent";
  const borderColor =
    variant === "primary" ? colors.accent : colors.line;
  const textColor =
    variant === "primary"
      ? colors.accentInk
      : variant === "danger"
      ? colors.danger
      : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        { backgroundColor: bg, borderColor },
        pressed && !isDisabled && { opacity: 0.82 },
        isDisabled && { opacity: 0.45 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { color: textColor },
            variant === "primary" && styles.labelPrimary,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  fullWidth: {
    width: "100%",
  },
  label: {
    fontSize: typescale.body.fontSize,
    fontFamily: fonts.bodyMedium,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  labelPrimary: {
    fontFamily: fonts.bodyBold,
    fontWeight: "700",
  },
});
