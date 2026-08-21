import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

  // A mirror of `sets` that is always current. handleFinish runs right after a
  // field blur, and reading state from its closure there can miss the update
  // that blur just triggered.
  const setsRef = useRef<any[]>([]);
  useEffect(() => {
    setsRef.current = sets;
  }, [sets]);

  // React Native queues alerts, so two fired at once stack up and the user has
  // to dismiss both -- which is exactly what happened when tapping Finish blurred
  // a field and both the blur handler and Finish had something to say.
  const alertOpen = useRef(false);
  const alertOnce = (
    title: string,
    message: string,
    buttons: {
      text: string;
      style?: "cancel" | "destructive";
      onPress?: () => void;
    }[] = [{ text: "OK" }],
  ) => {
    if (alertOpen.current) return false;
    alertOpen.current = true;
    Alert.alert(
      title,
      message,
      buttons.map((button) => ({
        text: button.text,
        style: button.style,
        onPress: () => {
          alertOpen.current = false;
          button.onPress?.();
        },
      })),
    );
    return true;
  };

  const raw = (value: any) => (value == null ? "" : String(value).trim());

  // Blank means "not filled in yet", which is not the same as invalid.
  /** Reps are whole numbers: 1.5 reps is not a thing you can do. */
  const repsAreInvalid = (value: any) => {
    const text = raw(value);
    if (!text) return false;
    const reps = Number(text);
    return !Number.isInteger(reps) || reps < 1;
  };

  /** Weight may be fractional (22.5 is a real plate) but not negative. */
  const weightIsInvalid = (value: any) => {
    const text = raw(value);
    if (!text) return false;
    const weight = Number(text);
    return !Number.isFinite(weight) || weight < 0;
  };

  const saveSet = async (setId: number, weightOverride?: string) => {
    const set = setsRef.current.find((s) => s.id === setId);
    if (!set) return;

    const rawWeight = weightOverride ?? raw(set.weight);
    const rawReps = raw(set.reps);

    // A rejected value is wiped rather than left sitting in the box. Warning and
    // leaving it there let the user dismiss the alert and submit it anyway.
    if (repsAreInvalid(rawReps)) {
      updateSetValue(setId, "reps", "");
      alertOnce(
        "Reps must be a whole number",
        "You can't do part of a rep, so that entry was cleared. Enter a whole number like 8.",
      );
      return;
    }

    if (weightIsInvalid(rawWeight)) {
      updateSetValue(setId, "weight", "");
      alertOnce(
        "That weight isn't a number",
        "That entry was cleared. Enter a number like 135, or 0 for bodyweight.",
      );
      return;
    }

    // Leaving the weight field to fill in reps blurs a half-entered row. That is
    // the normal way to type a set, so say nothing until the reps are in.
    if (!rawReps) return;

    // Reps are in but the weight is blank: bodyweight, or an oversight.
    if (!rawWeight) {
      alertOnce(
        "No weight entered",
        "Add a weight, or record this as a bodyweight set and we'll save it as 0.",
        [
          { text: "Add weight", style: "cancel" },
          {
            text: "Bodyweight",
            onPress: () => {
              updateSetValue(setId, "weight", "0");
              // Passed explicitly: the state update above has not landed yet.
              saveSet(setId, "0");
            },
          },
        ],
      );
      return;
    }

    const weight = Number(rawWeight);
    const reps = Number(rawReps);

    try {
      await api.put(`/api/sets/${setId}`, { weight, reps, completed: true });
      // Record that this row is stored, so the flush below knows what is left.
      setSets((prev) =>
        prev.map((s) =>
          s.id === setId ? { ...s, weight, reps, completed: true } : s,
        ),
      );
    } catch (err: any) {
      alertOnce("Error", getErrorMessage(err, "Failed to save set"));
    }
  };

  /**
   * Saving only ever happened on blur, via onEndEditing. Every field except the
   * last gets blurred when the user taps the next one, but the last field on the
   * screen has nothing after it, so its value could be left behind. Rather than
   * depend on focus, persist anything outstanding before leaving.
   */
  const flushPendingSets = async () => {
    const complete = setsRef.current.filter(
      (set) =>
        !set.completed &&
        raw(set.weight) &&
        raw(set.reps) &&
        !weightIsInvalid(set.weight) &&
        !repsAreInvalid(set.reps),
    );

    await Promise.all(
      complete.map((set) =>
        api
          .put(`/api/sets/${set.id}`, {
            weight: Number(raw(set.weight)),
            reps: Number(raw(set.reps)),
            completed: true,
          })
          .catch((err) => {
            console.warn("[session] Could not save set", set.id, err);
          }),
      ),
    );

    return complete.length;
  };

  const handleLeave = () => {
    Keyboard.dismiss();
    alertOnce(
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

  const completeWorkout = async () => {
    try {
      await flushPendingSets();
      await api.put(`/api/sessions/${id}`, {});
      alertOnce("Workout Complete!", "Great job!", [
        // dismissTo pops back to the existing templates screen. replace() would
        // swap this screen for a second copy of it, leaving the finished
        // workout's template still sitting behind it in the stack.
        { text: "OK", onPress: () => router.dismissTo("/templates") },
      ]);
    } catch (err: any) {
      alertOnce("Error", getErrorMessage(err, "Failed to complete workout"));
    }
  };

  const handleFinish = async () => {
    Keyboard.dismiss();

    // Tapping Finish also blurs whatever field was focused, which can fire
    // saveSet. Let that settle before deciding anything.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // saveSet is already asking the user something. Do not stack a second alert
    // on top of it, and do not finish the workout behind their back.
    if (alertOpen.current) return;

    const current = setsRef.current;
    const badReps = current.filter((set) => repsAreInvalid(set.reps));
    const badWeight = current.filter((set) => weightIsInvalid(set.weight));
    const badCount = badReps.length + badWeight.length;

    // Catches the last field too: it may never have blurred, so this is the
    // first time anything has looked at what is in it.
    if (badCount > 0) {
      badReps.forEach((set) => updateSetValue(set.id, "reps", ""));
      badWeight.forEach((set) => updateSetValue(set.id, "weight", ""));
      alertOnce(
        "Check your sets",
        badCount === 1
          ? "One entry wasn't a valid number, so it was cleared. Fill it in and finish again."
          : `${badCount} entries weren't valid numbers, so they were cleared. Fill them in and finish again.`,
      );
      return;
    }

    const repsOnly = current.filter(
      (set) => !set.completed && raw(set.reps) && !raw(set.weight),
    );

    if (repsOnly.length > 0) {
      const n = repsOnly.length;
      alertOnce(
        "No weight entered",
        n === 1
          ? "One set has reps but no weight. Save it as a bodyweight set (0), or go back and add a weight."
          : `${n} sets have reps but no weight. Save them as bodyweight sets (0), or go back and add weights.`,
        [
          { text: "Go back", style: "cancel" },
          {
            text: "Bodyweight",
            onPress: async () => {
              await Promise.all(
                repsOnly.map((set) =>
                  api
                    .put(`/api/sets/${set.id}`, {
                      weight: 0,
                      reps: Number(raw(set.reps)),
                      completed: true,
                    })
                    .catch((err) => {
                      console.warn("[session] Could not save set", set.id, err);
                    }),
                ),
              );
              setSets((prev) =>
                prev.map((s) =>
                  repsOnly.some((p) => p.id === s.id)
                    ? { ...s, weight: 0, completed: true }
                    : s,
                ),
              );
              await completeWorkout();
            },
          },
        ],
      );
      return;
    }

    await completeWorkout();
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
        keyboardShouldPersistTaps="handled"
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
