import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, getErrorMessage } from "../../utils/api";

export default function Session() {
  const { id } = useLocalSearchParams();
  const [exercises, setExercises] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const response = await api.get(`/api/sessions/${id}`);
      setExercises(response.data.exercises);
      setSets(response.data.sets);
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to fetch session");
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const getSetsForExercise = (exerciseId: number) => {
    return sets.filter((set) => set.template_exercise_id === exerciseId);
  };

  const updateSetValue = (setId: number, field: string, value: string) => {
    setSets((prev) =>
      prev.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
    );
  };

  const saveSet = async (setId: number, weightOverride?: string) => {
    const set = sets.find((s) => s.id === setId);
    if (!set) return;

    const rawWeight =
      weightOverride ?? (set.weight == null ? "" : String(set.weight).trim());
    const rawReps = set.reps == null ? "" : String(set.reps).trim();

    // Leaving the weight field to go fill in reps fires onEndEditing while the
    // row is still half-entered. That's the normal way to type a set, not a
    // mistake, so say nothing until the reps are in.
    if (!rawReps) return;

    // Reps are in but the weight is blank. That's either an oversight or a
    // bodyweight exercise, and only the user knows which.
    if (!rawWeight) {
      Alert.alert(
        "No weight entered",
        "Add a weight, or record this as a bodyweight set and we'll save it as 0.",
        [
          { text: "Add weight", style: "cancel" },
          {
            text: "Bodyweight",
            onPress: () => {
              updateSetValue(setId, "weight", "0");
              // Passed explicitly: the state update above has not landed yet,
              // so re-reading `sets` here would still see it blank.
              saveSet(setId, "0");
            },
          },
        ],
      );
      return;
    }

    const weight = Number(rawWeight);
    const reps = Number(rawReps);

    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight < 0 || reps <= 0) {
      Alert.alert("Invalid set", "Weight and reps must be valid numbers, and reps must be greater than zero.");
      return;
    }

    try {
      await api.put(`/api/sets/${setId}`, {
        weight,
        reps,
        completed: true,
      });
      // Record that this row is safely stored, so flushPendingSets below can
      // tell what still needs sending.
      setSets((prev) =>
        prev.map((s) =>
          s.id === setId ? { ...s, weight, reps, completed: true } : s,
        ),
      );
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to save set");
      Alert.alert("Error", message);
    }
  };

  /**
   * Saving only ever happened on blur, via onEndEditing. Every field except the
   * very last one gets blurred when the user taps the next field -- but the last
   * field on the screen has nothing after it. The user types into it and taps
   * Finish, so it never loses focus, onEndEditing never fires, and the value
   * never leaves the device. The number pads have no return key either, so there
   * is no other way to end editing.
   *
   * That is why the final set of the final exercise was always null. Rather than
   * depend on focus at all, persist anything outstanding before leaving.
   *
   * Returns how many rows were skipped for having reps but no weight, since
   * those are ambiguous (bodyweight or an oversight) and cannot be resolved
   * without asking.
   */
  const flushPendingSets = useCallback(async () => {
    const outstanding = sets.filter((set) => !set.completed);

    const complete = outstanding.filter((set) => {
      const w = set.weight == null ? "" : String(set.weight).trim();
      const r = set.reps == null ? "" : String(set.reps).trim();
      if (!w || !r) return false;
      return (
        Number.isFinite(Number(w)) &&
        Number.isFinite(Number(r)) &&
        Number(w) >= 0 &&
        Number(r) > 0
      );
    });

    const repsWithoutWeight = outstanding.filter(
      (set) =>
        (set.reps == null ? "" : String(set.reps).trim()) &&
        !(set.weight == null ? "" : String(set.weight).trim()),
    ).length;

    await Promise.all(
      complete.map((set) =>
        api
          .put(`/api/sets/${set.id}`, {
            weight: Number(set.weight),
            reps: Number(set.reps),
            completed: true,
          })
          .catch((err) => {
            console.warn("[session] Could not save set", set.id, err);
          }),
      ),
    );

    return { saved: complete.length, repsWithoutWeight };
  }, [sets]);

  const handleLeave = () => {
    Alert.alert(
      "Leave workout?",
      "Sets you've already entered are saved. The workout stays in progress, so you can come back to it.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            await flushPendingSets();
            router.back();
          },
        },
      ],
    );
  };

  const handleFinish = async () => {
    Keyboard.dismiss();

    try {
      // Must happen before the session is marked complete, so the last set the
      // user typed is not left behind.
      const { repsWithoutWeight } = await flushPendingSets();

      await api.put(`/api/sessions/${id}`, {});

      const note =
        repsWithoutWeight > 0
          ? `\n\n${repsWithoutWeight} set${repsWithoutWeight === 1 ? "" : "s"} had reps but no weight, so ${repsWithoutWeight === 1 ? "it was" : "they were"} not saved. Enter 0 for bodyweight.`
          : "";

      Alert.alert("Workout Complete!", `Great job!${note}`, [
        // dismissTo pops back to the existing templates screen. replace() would
        // swap this screen for a second copy of it, leaving the finished
        // workout's template still sitting behind it in the stack.
        { text: "OK", onPress: () => router.dismissTo("/templates") },
      ]);
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to complete workout");
      Alert.alert("Error", message);
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
      <TouchableOpacity onPress={handleLeave}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Active Workout</Text>

      <FlatList
        data={exercises}
        keyExtractor={(item) => `exercise-${item.id}`}
        renderItem={({ item }) => (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{item.exercise_name}</Text>

            <View style={styles.setHeader}>
              <Text style={[styles.setHeaderText, { flex: 0.5 }]}>Set</Text>
              <Text style={styles.setHeaderText}>Weight (lbs)</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
            </View>

            {getSetsForExercise(item.id).map((set, index) => (
              <View key={`set-${set.id}`} style={styles.setRow}>
                <Text style={[styles.setNumber, { flex: 0.5 }]}>
                  {index + 1}
                </Text>
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  value={set.weight !== null && set.weight !== undefined ? String(set.weight) : ""}
                  onChangeText={(val) => updateSetValue(set.id, "weight", val)}
                  onEndEditing={() => saveSet(set.id)}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  value={set.reps !== null && set.reps !== undefined ? String(set.reps) : ""}
                  onChangeText={(val) => updateSetValue(set.id, "reps", val)}
                  onEndEditing={() => saveSet(set.id)}
                  keyboardType="number-pad"
                />
              </View>
            ))}
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </TouchableOpacity>
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
  backButton: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  setHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  setHeaderText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  setNumber: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
  },
  setInput: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 6,
    padding: 8,
    textAlign: "center",
    marginHorizontal: 4,
    fontSize: 16,
  },
  finishButton: {
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40,
  },
  finishButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
