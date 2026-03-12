import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get("http://localhost:3000/api/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplates(response.data);
    } catch (err) {
      console.log("Error fetching templates:", err.message);
    } finally {
      setLoading(false);
    }
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
      <Text style={styles.title}>My Templates</Text>

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
        keyExtractor={(item) => item.id.toString()}
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
    marginBottom: 24,
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
});
