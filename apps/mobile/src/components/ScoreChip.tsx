import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

interface ScoreChipProps {
  /** Score on 1–10 scale */
  score: number;
}

/**
 * Score chip — fixed 38×38 rounded square, mono number.
 * Color-coded: teal bg ≥7, amber bg ≥5, danger bg <5.
 * Used in History rows.
 */
export function ScoreChip({ score }: ScoreChipProps) {
  const { colors } = useTheme();

  // Determine background and text colors by score tier
  let bgColor: string;
  let textColor: string;

  if (score >= 7) {
    bgColor = `${colors.accent2}22`; // teal with low opacity
    textColor = colors.accent2;
  } else if (score >= 5) {
    bgColor = `${colors.accent}22`; // amber with low opacity
    textColor = colors.accent;
  } else {
    bgColor = `${colors.danger}22`; // danger with low opacity
    textColor = colors.danger;
  }

  return (
    <View style={[styles.chip, { backgroundColor: bgColor }]}>
      <Text style={[styles.number, { color: textColor }]}>
        {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  number: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 13,
    fontWeight: "700",
  },
});
