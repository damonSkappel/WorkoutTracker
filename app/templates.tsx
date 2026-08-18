import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, getErrorMessage } from "../utils/api";
import { useAuth } from "../utils/auth";

export default function Templates() {
  const { signOut } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get("/api/templates");
      setTemplates(response.data);
    } catch (err: any) {
      Alert.alert("Error", getErrorMessage(err, "Failed to fetch templates"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTemplates();
    }, [fetchTemplates]),
  );

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Templates</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/create-template")}
      >
        <Text style={styles.addButtonText}>+ New Template</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => router.push("/history")}
      >
        <Text style={styles.historyButtonText}>Past Workouts</Text>
      </TouchableOpacity>

      <FlatList
        data={templates}
        keyExtractor={(item) => `template-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.templateCard}
            onPress={() => router.push(`/template/${item.id}`)}
          >
            <Text style={styles.templateName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No templates yet. Create one!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  templateCard: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "600",
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },

  addButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  historyButton: {
    backgroundColor: "#e0e0e0",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  historyButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
  },
});
