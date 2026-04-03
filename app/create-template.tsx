import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
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
import { API_URL } from "../utils/config";

export default function CreateTemplate() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a template name");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/templates`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      router.back();
    } catch (err) {
      if (err.response?.status === 403) {
        await AsyncStorage.removeItem("token");
        router.replace("/");
        return;
      }
      Alert.alert("Error", "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Template</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Template name (e.g. Push Day)"
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Creating..." : "Create Template"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#aaa",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 16,
  },
});
