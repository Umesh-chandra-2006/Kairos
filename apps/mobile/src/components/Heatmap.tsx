import { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

interface HeatmapProps {
  /** Map of ISO date string → score (1–10), e.g. { "2025-01-15": 8 } */
  data: Record<string, number>;
  /** Number of weeks to show. Default 18. */
  weeks?: number;
}

const CELL = 13;
const GAP = 3;
const DAY_LABELS = ["M", "", "W", "", "F", "", "S"];

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function scoreToOpacity(score: number | undefined): number {
  if (!score) return 0;
  if (score >= 9) return 1;
  if (score >= 7) return 0.75;
  if (score >= 5) return 0.5;
  return 0.28;
}

/**
 * GitHub-style activity heatmap.
 * Each cell is the teal accent at varying opacity based on the day's score.
 * Empty cells = transparent with a line-border.
 */
export function Heatmap({ data, weeks = 18 }: HeatmapProps) {
  const { colors } = useTheme();

  // Build grid: `weeks` columns × 7 rows (Mon–Sun)
  const grid = useMemo(() => {
    const today = new Date();
    // Align to Monday of this week
    const dow = (today.getDay() + 6) % 7; // 0=Mon
    const start = new Date(today);
    start.setDate(today.getDate() - dow - (weeks - 1) * 7);

    const cols: Array<Array<{ key: string; score?: number }>> = [];
    for (let w = 0; w < weeks; w++) {
      const col: Array<{ key: string; score?: number }> = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = dateKey(date);
        col.push({ key, score: data[key] });
      }
      cols.push(col);
    }
    return cols;
  }, [data, weeks]);

  return (
    <View style={styles.wrapper}>
      {/* Day labels column */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((l, i) => (
          <Text
            key={i}
            style={[styles.dayLabel, { color: colors.textDim }]}
          >
            {l}
          </Text>
        ))}
      </View>

      {/* Week columns */}
      <View style={styles.grid}>
        {grid.map((col, wi) => (
          <View key={wi} style={styles.col}>
            {col.map(({ key, score }) => {
              const opacity = scoreToOpacity(score);
              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    opacity > 0
                      ? {
                          backgroundColor: colors.accent2,
                          opacity,
                          borderColor: "transparent",
                        }
                      : {
                          backgroundColor: "transparent",
                          borderColor: colors.line,
                        },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dayLabels: {
    marginRight: 4,
    marginTop: 1,
  },
  dayLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    height: CELL + GAP,
    lineHeight: CELL + GAP,
    textAlign: "right",
    width: 10,
  },
  grid: {
    flexDirection: "row",
  },
  col: {
    marginRight: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    marginBottom: GAP,
    borderWidth: 1,
  },
});
