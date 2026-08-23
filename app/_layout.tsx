import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../utils/auth";
import { API_URL } from "../utils/config";
import { colors, darkHeader, shared, spacing } from "../utils/theme";

// Pushed screens get a real back arrow from the navigator, which also enables
// the swipe-back gesture. The title is left empty because each screen already
// renders its own heading.
const pushedScreen = {
  headerShown: true,
  title: "",
  headerBackTitle: "Back",
  ...darkHeader,
};

function ServerUnreachable() {
  const { retry, signOut } = useAuth();

  return (
    <View style={styles.centered}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.textMuted} />
      </View>

      <Text style={styles.heading}>Can&apos;t reach the server</Text>
      <Text style={styles.message}>
        You&apos;re still signed in, but we couldn&apos;t connect. Check your
        internet connection and try again.
      </Text>

      {__DEV__ ? <Text style={styles.debug}>{API_URL}</Text> : null}

      <TouchableOpacity
        style={styles.primary}
        onPress={retry}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryText}>Try Again</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut} hitSlop={8}>
        <Text style={styles.link}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

function RootNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (status === "unreachable") {
    return <ServerUnreachable />;
  }

  const isAuthenticated = status === "authenticated";

  // Screens outside the matching guard are removed from the navigation state,
  // so a signed-out user can never land on a protected route at all, rather
  // than rendering it and getting bounced once a request comes back 401.
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated}>
        {/* Root of the signed-in area: nothing to go back to. */}
        <Stack.Screen name="templates" options={{ headerShown: false }} />

        <Stack.Screen name="create-template" options={pushedScreen} />
        <Stack.Screen name="history" options={pushedScreen} />
        <Stack.Screen name="template/[id]" options={pushedScreen} />
        <Stack.Screen name="template/[id]/add-exercise" options={pushedScreen} />

        {/*
          The workout screen keeps its own back control so leaving mid-workout
          can confirm first, which a plain header arrow would bypass.
        */}
        <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Mirrors what expo-router's default navigator did before this file existed,
  // so screens keep the same safe-area inset and no native headers.
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* Set once here rather than per screen: the whole app is dark. */}
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <RootNavigator />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // The safe-area inset sits outside every screen, so a screen cannot paint
    // into it. Without a colour here the strip beside the notch stays white.
    backgroundColor: colors.bg,
  },
  centered: {
    ...shared.centered,
    padding: spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  message: {
    ...shared.mutedText,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  debug: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  primary: {
    ...shared.primaryButton,
    alignSelf: "stretch",
  },
  primaryText: shared.primaryButtonText,
  link: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: spacing.xxl,
  },
});
