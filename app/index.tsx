import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, consumeAuthNotice, NETWORK_ERROR_MESSAGE } from "../utils/api";
import { useAuth } from "../utils/auth";
import { colors, PLACEHOLDER, radius, shared, spacing } from "../utils/theme";

export default function Index() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Explains why we're back here, e.g. an expired session. Read once on mount.
  const [error, setError] = useState(() => consumeAuthNotice() ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email: trimmedEmail,
        password: trimmedPassword,
      });
      // The route guard swaps in the protected screens once this resolves.
      await signIn(response.data.token, response.data.refreshToken);
    } catch (err: any) {
      const message = err?.response
        ? err.response.data?.error || "Invalid email or password"
        : NETWORK_ERROR_MESSAGE;
      setError(message);
      Alert.alert("Login failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={shared.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Ionicons name="barbell" size={26} color={colors.accentInk} />
        </View>

        <Text style={styles.title}>Workout Tracker</Text>
        <Text style={styles.subtitle}>Log every set. Watch it add up.</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.danger}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={PLACEHOLDER}
          keyboardAppearance="dark"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError("");
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={PLACEHOLDER}
          keyboardAppearance="dark"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) setError("");
          }}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.primary, isSubmitting && shared.disabled]}
          onPress={handleLogin}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>
            {isSubmitting ? "Logging in..." : "Log In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/signup")}
          hitSlop={8}
          style={styles.linkRow}
        >
          <Text style={styles.linkMuted}>Don&apos;t have an account? </Text>
          <Text style={styles.link}>Sign up</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xxl,
  },
  brand: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    ...shared.title,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...shared.mutedText,
    marginBottom: spacing.xxxl,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...shared.errorText,
    flex: 1,
  },
  input: {
    ...shared.input,
    marginBottom: spacing.md,
  },
  primary: {
    ...shared.primaryButton,
    marginTop: spacing.sm,
  },
  primaryText: shared.primaryButtonText,
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xxl,
  },
  linkMuted: {
    color: colors.textMuted,
    fontSize: 15,
  },
  link: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
});
