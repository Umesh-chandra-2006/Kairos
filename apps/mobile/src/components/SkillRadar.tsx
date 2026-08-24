import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

export interface SkillScore {
  label: string;
  /** 1–10 */
  value: number;
}

interface SkillRadarProps {
  skills: SkillScore[];
  /** Diameter of the chart area in px. Default 240. */
  size?: number;
}

const MAX = 10;
const NUM_RINGS = 4;

/**
 * Pentagonal radar / spider chart for the 5 core skills.
 * Uses react-native-svg polygon geometry.
 * Axes are always equal, scale 1–10.
 */
export function SkillRadar({ skills, size = 240 }: SkillRadarProps) {
  const { colors } = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.78; // max radius in px

  const n = skills.length || 5;

  /** Convert polar (angle, radius) → {x, y} */
  const polar = (angle: number, radius: number) => ({
    x: cx + radius * Math.sin(angle),
    y: cy - radius * Math.cos(angle),
  });

  const axes = useMemo(
    () =>
      skills.map((_, i) => {
        const angle = (2 * Math.PI * i) / n;
        return polar(angle, r);
      }),
    [skills, n, r, cx, cy]
  );

  /** Ring grid lines */
  const ringPolygons = useMemo(
    () =>
      Array.from({ length: NUM_RINGS }, (_, ri) => {
        const fraction = (ri + 1) / NUM_RINGS;
        return skills
          .map((_, i) => {
            const angle = (2 * Math.PI * i) / n;
            const p = polar(angle, r * fraction);
            return `${p.x},${p.y}`;
          })
          .join(" ");
      }),
    [skills, n, r, cx, cy]
  );

  /** Data polygon */
  const dataPoints = useMemo(
    () =>
      skills
        .map((s, i) => {
          const fraction = Math.max(0, Math.min(s.value, MAX)) / MAX;
          const angle = (2 * Math.PI * i) / n;
          const p = polar(angle, r * fraction);
          return `${p.x},${p.y}`;
        })
        .join(" "),
    [skills, n, r, cx, cy]
  );

  const getLabelPos = (i: number, label: string) => {
    const angle = (2 * Math.PI * i) / n;
    const labelR = r + 20;
    const x = cx + labelR * Math.sin(angle);
    const y = cy - labelR * Math.cos(angle);
    // Text-anchor
    const anchor: "middle" | "end" | "start" =
      Math.abs(Math.sin(angle)) < 0.15 ? "middle" : x < cx ? "end" : "start";
    return { x, y, anchor };
  };

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size + 60} height={size + 40}>
        {/* Grid rings */}
        {ringPolygons.map((pts, ri) => (
          <Polygon
            key={`ring-${ri}`}
            points={pts}
            fill="none"
            stroke={colors.line}
            strokeWidth={1}
          />
        ))}

        {/* Axis spokes */}
        {axes.map((pt, i) => (
          <Line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={pt.x}
            y2={pt.y}
            stroke={colors.line}
            strokeWidth={1}
          />
        ))}

        {/* Data polygon fill */}
        <Polygon
          points={dataPoints}
          fill={`${colors.accent2}28`}
          stroke={colors.accent2}
          strokeWidth={2}
        />

        {/* Data dot handles */}
        {skills.map((s, i) => {
          const fraction = Math.max(0, Math.min(s.value, MAX)) / MAX;
          const angle = (2 * Math.PI * i) / n;
          const p = polar(angle, r * fraction);
          return (
            <Circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={colors.accent2}
            />
          );
        })}

        {/* Axis labels */}
        {skills.map((s, i) => {
          const { x, y, anchor } = getLabelPos(i, s.label);
          return (
            <SvgText
              key={`label-${i}`}
              x={x + (skills.length > 1 ? 30 : 0)}
              y={y + 5}
              textAnchor={anchor}
              fontSize={10}
              fontFamily={fonts.monoSemiBold}
              fill={colors.textDim}
            >
              {s.label.toUpperCase()}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({});
