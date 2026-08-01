import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { colors } from "../theme";

interface ScreenProps {
  children: ReactNode;
  title?: string;
}

export function Screen({ children, title }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
});
