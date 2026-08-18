import { Stack } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { API_URL } from "../utils/config";
import { AuthProvider, useAuth } from "../utils/auth";

function ServerUnreachable() {
  const { retry, signOut } = useAuth();

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Can&apos;t reach the server</Text>
      <Text style={styles.message}>
        You&apos;re still signed in, but we couldn&apos;t connect. Check your
        internet connection and try again.
      </Text>

      {__DEV__ ? <Text style={styles.debug}>{API_URL}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={retry}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut}>
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
        <ActivityIndicator size="large" />
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
    <Stack>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="templates" options={{ headerShown: false }} />
        <Stack.Screen name="create-template" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
        <Stack.Screen name="template/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="template/[id]/add-exercise"
          options={{ headerShown: false }}
        />
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
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  debug: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "stretch",
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
});
