import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, getErrorMessage } from "../../../utils/api";

// Kept in sync with the backend, which rejects anything outside this range.
const MIN_SETS = 1;
const MAX_SETS = 10;
const DEFAULT_SETS = 3;

export default function AddExercise() {
  // exerciseId is only present when editing, and that is what puts this screen
  // into edit mode. Adding and editing are the same form, so they share it.
  const { id, exerciseId } = useLocalSearchParams<{
    id: string;
    exerciseId?: string;
  }>();
  const isEditing = !!exerciseId;

  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState(DEFAULT_SETS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  const loadExercise = useCallback(async () => {
    if (!isEditing) return;

    try {
      const response = await api.get(`/api/templates/${id}/exercises`);
      const existing = response.data.find(
        (item: any) => String(item.id) === String(exerciseId),
      );

      if (!existing) {
        Alert.alert("Not found", "That exercise no longer exists.");
        router.back();
        return;
      }

      setExerciseName(existing.exercise_name);
      setSets(existing.default_sets ?? DEFAULT_SETS);
    } catch (err: any) {
      Alert.alert("Error", getErrorMessage(err, "Failed to load exercise"));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, exerciseId, isEditing]);

  useEffect(() => {
    loadExercise();
  }, [loadExercise]);

  const adjustSets = (delta: number) => {
    setSets((current) =>
      Math.min(MAX_SETS, Math.max(MIN_SETS, current + delta)),
    );
  };

  const handleSave = async () => {
    const trimmedName = exerciseName.trim();

    if (!trimmedName) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/api/templates/${id}/exercises/${exerciseId}`, {
          exercise_name: trimmedName,
          default_sets: sets,
        });
      } else {
        await api.post(`/api/templates/${id}/exercises`, {
          exercise_name: trimmedName,
          default_sets: sets,
          order_index: 1,
        });
      }
      router.back();
    } catch (err: any) {
      const message = getErrorMessage(
        err,
        isEditing ? "Failed to save exercise" : "Failed to add exercise",
      );
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
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
      <Text style={styles.title}>
        {isEditing ? "Edit Exercise" : "Add Exercise"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Exercise name (e.g. Bench Press)"
        value={exerciseName}
        onChangeText={setExerciseName}
      />

      <Text style={styles.label}>Sets</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[
            styles.stepperButton,
            sets <= MIN_SETS && styles.stepperButtonDisabled,
          ]}
          onPress={() => adjustSets(-1)}
          disabled={sets <= MIN_SETS}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </TouchableOpacity>

        <Text style={styles.stepperValue}>{sets}</Text>

        <TouchableOpacity
          style={[
            styles.stepperButton,
            sets >= MAX_SETS && styles.stepperButtonDisabled,
          ]}
          onPress={() => adjustSets(1)}
          disabled={sets >= MAX_SETS}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        {MIN_SETS}–{MAX_SETS} sets. This is how many rows you&apos;ll get when
        you start a workout.
      </Text>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving
            ? isEditing
              ? "Saving..."
              : "Adding..."
            : isEditing
              ? "Save Changes"
              : "Add Exercise"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: {
    backgroundColor: "#c7d6ea",
  },
  stepperButtonText: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 32,
  },
  stepperValue: {
    fontSize: 34,
    fontWeight: "bold",
    minWidth: 90,
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 32,
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
