import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, getErrorMessage } from "../utils/api";

export default function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await api.get("/api/sessions/history");
      setHistory(response.data);
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to fetch history");
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [fetchHistory]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Workouts</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => `template-${item.template_id}`}
        renderItem={({ item }) => (
          <View style={styles.templateGroup}>
            <Text style={styles.templateName}>{item.template_name}</Text>
            {item.sessions.map((session: any) => (
              <View key={`session-${session.session_id}`} style={styles.sessionRow}>
                <Text style={styles.sessionDate}>
                  {new Date(session.date).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No completed workouts yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  templateGroup: {
    marginBottom: 24,
  },
  templateName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  sessionRow: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    marginLeft: 12,
  },
  sessionDate: {
    fontSize: 16,
    color: "#555",
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
});
