import { StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

interface EyebrowProps {
  children: string;
  /** Defaults to accent (amber). Pass "teal" for evaluation/analytics screens. */
  variant?: "amber" | "teal" | "dim";
}

/**
 * Mono uppercase label — the eyebrow used above section titles.
 * 10.5px, IBM Plex Mono, letter-spacing 0.14em, accent color.
 */
export function Eyebrow({ children, variant = "amber" }: EyebrowProps) {
  const { colors } = useTheme();
  const color =
    variant === "teal"
      ? colors.accent2
      : variant === "dim"
      ? colors.textDim
      : colors.accent;

  return (
    <Text style={[styles.eyebrow, { color }]}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10.5,
    letterSpacing: 1.47, // ~0.14em at 10.5px
    marginBottom: 6,
  },
});
