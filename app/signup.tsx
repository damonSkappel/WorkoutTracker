import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, NETWORK_ERROR_MESSAGE } from "../utils/api";
import { useAuth } from "../utils/auth";

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
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearError();
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Username"
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
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearError();
        }}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#8aa9d6",
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    color: "#007AFF",
    fontSize: 16,
    textAlign: "center",
    marginTop: 24,
  },
  error: {
    color: "red",
    marginBottom: 16,
    textAlign: "center",
  },
});
