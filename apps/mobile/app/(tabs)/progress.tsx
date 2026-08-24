import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { SkillRadar, type SkillScore } from "@/components/SkillRadar";
import { Heatmap } from "@/components/Heatmap";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

export default function ProgressScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streakData, setStreakData] = useState<{
    currentStreak: number;
    longestStreak: number;
    totalAnswered: number;
  }>({ currentStreak: 0, longestStreak: 0, totalAnswered: 0 });
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [skills, setSkills] = useState<SkillScore[]>([
    { label: "DSA", value: 7 },
    { label: "Sys Design", value: 8 },
    { label: "DBMS", value: 6 },
    { label: "OS", value: 7.5 },
    { label: "Behavioral", value: 9 },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch streak & user analytics data from API
      const streakRes = await api.streak().catch(() => null);
      if (streakRes?.streak) {
        setStreakData({
          currentStreak: streakRes.streak.current ?? 0,
          longestStreak: streakRes.streak.longest ?? 0,
          totalAnswered: streakRes.streak.current ?? 0,
        });
      }

      // Fetch history to populate heatmap
      const historyRes = await api.history(undefined, 100).catch(() => null);
      if (historyRes?.answers) {
        const map: Record<string, number> = {};
        historyRes.answers.forEach((ans) => {
          if (ans.date && ans.score !== null) {
            map[ans.date] = ans.score;
          }
        });
        setHeatmapData(map);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load progress data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent2} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Progress">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        {/* ── Summary Cards ── */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>
              {streakData.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textDim }]}>CURRENT STREAK</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.statNumber, { color: colors.accent2 }]}>
              {streakData.longestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textDim }]}>LONGEST STREAK</Text>
          </View>
        </View>

        {/* ── Skill Radar ── */}
        <Card>
          <Eyebrow variant="teal">Skill Radar</Eyebrow>
          <Text style={[styles.sectionDesc, { color: colors.textDim }]}>
            Performance metrics across key domain dimensions (scale 1–10).
          </Text>
          <View style={styles.radarWrapper}>
            <SkillRadar skills={skills} size={220} />
          </View>
        </Card>

        {/* ── Activity Heatmap ── */}
        <Card>
          <Eyebrow variant="teal">Activity Heatmap</Eyebrow>
          <Text style={[styles.sectionDesc, { color: colors.textDim }]}>
            Daily activity over the last 18 weeks. Cell intensity reflects score.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.heatmapScroll}>
            <Heatmap data={heatmapData} weeks={18} />
          </ScrollView>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.body, fontSize: 14, marginBottom: 12 },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 4,
  },
  sectionDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  radarWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  heatmapScroll: {
    marginTop: 4,
    paddingBottom: 4,
  },
});
