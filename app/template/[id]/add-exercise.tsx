import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../../utils/config";

export default function AddExercise() {
  const { id } = useLocalSearchParams();
  const [exerciseName, setExerciseName] = useState("");
  const [defaultSets, setDefaultSets] = useState("3");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!exerciseName.trim()) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/templates/${id}/exercises`,
        {
          exercise_name: exerciseName,
          default_sets: parseInt(defaultSets),
          order_index: 1,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      router.back();
    } catch (err) {
      Alert.alert("Error", "Failed to add exercise");
      console.log(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Exercise</Text>

      <TextInput
        style={styles.input}
        placeholder="Exercise name (e.g. Bench Press)"
        value={exerciseName}
        onChangeText={setExerciseName}
      />

      <TextInput
        style={styles.input}
        placeholder="Default sets"
        value={defaultSets}
        onChangeText={setDefaultSets}
        keyboardType="number-pad"
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleAdd}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Adding..." : "Add Exercise"}
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
});
