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
import { api, NETWORK_ERROR_MESSAGE } from "../utils/api";
import { useAuth } from "../utils/auth";
import { colors, PLACEHOLDER, radius, shared, spacing } from "../utils/theme";

// Mirrors the backend's checks so the form can fail fast without a round trip.
// The backend still enforces all of these -- this is convenience, not security.
const MIN_USERNAME_LENGTH = 2;
const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 6;

// bcrypt on the backend only reads the first 72 bytes of a password and ignores
// the rest, so anything longer gives a false sense of security. Counted in
// bytes because one emoji costs four.
const MAX_PASSWORD_BYTES = 72;

const utf8ByteLength = (value: string) => {
  let bytes = 0;
  // for...of iterates code points, so surrogate pairs are counted once.
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
};

// Intentionally loose: catches honest typos like a missing @, without rejecting
// unusual but valid addresses. Only sending mail proves an address really works.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedUsername || !trimmedPassword) {
      setError("Please fill in every field.");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (
      trimmedUsername.length < MIN_USERNAME_LENGTH ||
      trimmedUsername.length > MAX_USERNAME_LENGTH
    ) {
      setError(
        `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters.`,
      );
      return;
    }

    if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (utf8ByteLength(trimmedPassword) > MAX_PASSWORD_BYTES) {
      setError(
        `Password is too long. Please use ${MAX_PASSWORD_BYTES} characters or fewer.`,
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await api.post("/auth/register", {
        email: trimmedEmail,
        username: trimmedUsername,
        password: trimmedPassword,
      });
      // The route guard swaps in the protected screens once this resolves.
      await signIn(response.data.token, response.data.refreshToken);
    } catch (err: any) {
      const message = err?.response
        ? err.response.data?.error || "Could not create account"
        : NETWORK_ERROR_MESSAGE;
      setError(message);
      Alert.alert("Sign up failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => {
    if (error) setError("");
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Takes a few seconds. Start logging today.
        </Text>

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
            clearError();
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={PLACEHOLDER}
          keyboardAppearance="dark"
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            clearError();
          }}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={PLACEHOLDER}
          keyboardAppearance="dark"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearError();
          }}
          secureTextEntry
        />
        <Text style={styles.hint}>
          At least {MIN_PASSWORD_LENGTH} characters.
        </Text>

        <TouchableOpacity
          style={[styles.primary, isSubmitting && shared.disabled]}
          onPress={handleSignup}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/")}
          hitSlop={8}
          style={styles.linkRow}
        >
          <Text style={styles.linkMuted}>Already have an account? </Text>
          <Text style={styles.link}>Log in</Text>
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
  hint: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: -spacing.xs,
    marginBottom: spacing.lg,
  },
  primary: shared.primaryButton,
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
