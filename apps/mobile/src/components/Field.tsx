import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii, typescale } from "@/theme";

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  helper?: string;
}

/**
 * Design-system text input.
 * - Label: IBM Plex Mono, uppercase, accent color (eyebrow style)
 * - Input: surface fill, line border, radius-sm
 * - Error: danger color caption
 */
export function Field({ label, error, helper, style, ...props }: FieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.accent }]}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.line,
            color: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.textDim}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: colors.textDim }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: typescale.body.fontSize,
    fontFamily: fonts.bodyMedium,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: typescale.caption.fontSize,
    marginTop: 5,
  },
  helper: {
    fontFamily: fonts.bodyMedium,
    fontSize: typescale.caption.fontSize,
    marginTop: 5,
  },
});
