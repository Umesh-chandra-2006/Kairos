import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii, spacing, typescale } from "@/theme";
import Svg, { Path } from "react-native-svg";

interface ScreenProps {
  children: ReactNode;
  /** Space Grotesk 700 H1 displayed at the top */
  title?: string;
  /** Show back arrow button in header */
  back?: boolean;
  /** Optional scrollable — set false for screens that manage their own scroll */
  scrollable?: boolean;
  /** Pad bottom to avoid tab bar overlap */
  withTabBar?: boolean;
}

/**
 * Base screen wrapper — SafeAreaView + bg token + optional title/back button.
 * All screens should use this as their root.
 */
export function Screen({
  children,
  title,
  back = false,
  scrollable = true,
  withTabBar = true,
}: ScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const content = (
    <View
      style={[
        styles.content,
        withTabBar && styles.withTabBarPadding,
      ]}
    >
      {(title || back) && (
        <View style={styles.header}>
          {back ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 18l-6-6 6-6"
                  stroke={colors.text}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          ) : null}
          {title ? (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          ) : null}
        </View>
      )}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  withTabBarPadding: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    paddingRight: 4,
  },
  title: {
    fontSize: typescale.h1.fontSize,
    lineHeight: typescale.h1.lineHeight,
    fontFamily: fonts.displayBold,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});

