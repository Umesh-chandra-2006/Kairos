import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";
import { ring as ringConst } from "@/theme";

export interface MomentRingProps {
  /** 0–1 fill fraction */
  progress: number;
  /** Diameter of the ring in px */
  size?: number;
  /** "amber" for Home/ritual, "teal" for Evaluation/Progress */
  variant?: "amber" | "teal";
  /** Optional symbol/emoji string to render in center */
  symbol?: string;
  /** Answered status */
  answered?: boolean;
  /** Content rendered in the center */
  children?: React.ReactNode;
}

/**
 * The Kairos signature element — a circular progress ring.
 * Same stroke width (9px), round caps, used in three places:
 *  1. Home:       amber fill, time-remaining fraction
 *  2. Evaluation: teal fill, score fraction (score/10)
 *  3. Progress:   teal fill (radar uses a different component)
 */
export function MomentRing({
  progress,
  size = 170,
  variant = "amber",
  symbol,
  answered,
  children,
}: MomentRingProps) {
  const { colors } = useTheme();

  const strokeWidth = ringConst.strokeWidth;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp progress to [0, 1]
  const clamped = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - clamped);

  const strokeColor = variant === "amber" ? colors.accent : colors.accent2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      >
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={colors.surface2}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc — rotated -90deg so it starts at top */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      {/* Center content */}
      {(children || symbol) && (
        <View style={{ position: "absolute", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
          {symbol ? (
            <Text
              style={{
                fontFamily: "IBMPlexMono_600SemiBold",
                fontSize: size * 0.2,
                color: strokeColor,
              }}
            >
              {symbol}
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </View>
  );
}
