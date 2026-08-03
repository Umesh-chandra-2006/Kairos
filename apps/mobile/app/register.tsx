import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { registerPasswordHint, validateRegisterForm, type RegisterFormErrors } from "@kairos/shared";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";

function errorsFromApi(err: unknown): RegisterFormErrors {
  if (err instanceof ApiError) {
    const mapped: RegisterFormErrors = {};
    for (const d of err.details ?? []) {
      const field = d.path[0];
      if (field === "name" || field === "email" || field === "password") mapped[field] = d.message;
    }
    return mapped;
  }
  return {};
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const errors = validateRegisterForm({ name, email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        const apiErrors = errorsFromApi(err);
        if (Object.keys(apiErrors).length > 0) {
          setFieldErrors(apiErrors);
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create account</Text>

          <View style={styles.form}>
            <Field label="Name" value={name} onChangeText={setName} error={fieldErrors.name} autoComplete="name" />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={fieldErrors.email}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              error={fieldErrors.password}
              helper={registerPasswordHint()}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Create account" onPress={onSubmit} loading={submitting} />
          </View>

          <Text style={styles.footer}>
            Already have an account?{" "}
            <Link href="/login" style={styles.footerLink}>
              Sign in
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 24, color: colors.text },
  form: { marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 12, textAlign: "center" },
  footer: { textAlign: "center", color: colors.muted, fontSize: 14 },
  footerLink: { color: colors.text, fontWeight: "600" },
});
