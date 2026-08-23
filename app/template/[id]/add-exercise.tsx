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
import {
  colors,
  PLACEHOLDER,
  radius,
  shared,
  spacing,
} from "../../../utils/theme";

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
        // No order_index: the server appends to the end of the template. The
        // client used to send a hardcoded 1 for every exercise, which left them
        // all tied and unordered.
        await api.post(`/api/templates/${id}/exercises`, {
          exercise_name: trimmedName,
          default_sets: sets,
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
      <View style={shared.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
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
        placeholderTextColor={PLACEHOLDER}
        keyboardAppearance="dark"
        value={exerciseName}
        onChangeText={setExerciseName}
        autoFocus={!isEditing}
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
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  centered: shared.centered,
  title: {
    ...shared.title,
    marginBottom: spacing.xxxl,
  },
  input: {
    ...shared.input,
    marginBottom: spacing.xxl,
  },
  label: {
    ...shared.sectionLabel,
    marginBottom: spacing.lg,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stepperButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: {
    opacity: 0.35,
  },
  stepperButtonText: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "600",
    lineHeight: 30,
  },
  stepperValue: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
    minWidth: 90,
    textAlign: "center",
  },
  hint: {
    color: colors.textFaint,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.xxxl,
  },
  button: shared.primaryButton,
  buttonDisabled: shared.disabled,
  buttonText: shared.primaryButtonText,
});
