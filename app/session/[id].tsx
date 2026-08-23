import { Ionicons } from "@expo/vector-icons";
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
import {
  colors,
  PLACEHOLDER,
  radius,
  shared,
  spacing,
} from "../../utils/theme";

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

    // Anything still unfilled will not be recorded at all. Silently dropping it
    // looks identical to the app losing the data, so confirm it was deliberate.
    // Leaving a set out is legitimate -- you may have stopped early -- hence a
    // "Finish anyway" rather than a hard block.
    const missingReps = current.filter(
      (set) => !set.completed && raw(set.weight) && !raw(set.reps),
    );
    const untouched = current.filter(
      (set) => !set.completed && !raw(set.weight) && !raw(set.reps),
    );

    if (missingReps.length > 0 || untouched.length > 0) {
      const parts: string[] = [];
      if (missingReps.length > 0) {
        parts.push(
          missingReps.length === 1
            ? "1 set has a weight but no reps"
            : `${missingReps.length} sets have a weight but no reps`,
        );
      }
      if (untouched.length > 0) {
        parts.push(
          untouched.length === 1
            ? "1 set is empty"
            : `${untouched.length} sets are empty`,
        );
      }

      alertOnce(
        "Some sets aren't filled in",
        `${parts.join(" and ")}. ${
          missingReps.length + untouched.length === 1 ? "It won't" : "They won't"
        } be recorded. Go back and fill ${
          missingReps.length + untouched.length === 1 ? "it" : "them"
        } in, or finish without ${
          missingReps.length + untouched.length === 1 ? "it" : "them"
        }.`,
        [
          { text: "Go back", style: "cancel" },
          { text: "Finish anyway", onPress: () => completeWorkout() },
        ],
      );
      return;
    }

    await completeWorkout();
  };

  if (loading) {
    return (
      <View style={shared.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const doneCount = sets.filter((s) => s.completed).length;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleLeave}
          style={styles.backButton}
          hitSlop={10}
          accessibilityLabel="Leave workout"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>In progress</Text>
          </View>
          <Text style={styles.title}>Active Workout</Text>
        </View>
      </View>

      {/* A quiet progress bar rather than a number to chase: it answers "how
          much is left" at a glance without pulling attention off the set. */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: sets.length
                  ? `${Math.round((doneCount / sets.length) * 100)}%`
                  : "0%",
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {doneCount} / {sets.length} sets
        </Text>
      </View>

      <FlatList
        data={exercises}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => `exercise-${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{item.exercise_name}</Text>

            <View style={styles.setHeader}>
              <Text style={[styles.setHeaderText, styles.colSet]}>Set</Text>
              <Text style={[styles.setHeaderText, styles.colField]}>
                Weight
              </Text>
              <Text style={[styles.setHeaderText, styles.colField]}>Reps</Text>
              <View style={styles.colStatus} />
            </View>

            {getSetsForExercise(item.id).map((set, index) => (
              <View key={`set-${set.id}`} style={styles.setRow}>
                <Text style={[styles.setNumber, styles.colSet]}>
                  {index + 1}
                </Text>

                <TextInput
                  style={[styles.setInput, styles.colField]}
                  placeholder="0"
                  placeholderTextColor={PLACEHOLDER}
                  keyboardAppearance="dark"
                  selectionColor={colors.accent}
                  value={
                    set.weight !== null && set.weight !== undefined
                      ? String(set.weight)
                      : ""
                  }
                  onChangeText={(val) => updateSetValue(set.id, "weight", val)}
                  onEndEditing={() => saveSet(set.id)}
                  keyboardType="decimal-pad"
                />

                <TextInput
                  style={[styles.setInput, styles.colField]}
                  placeholder="0"
                  placeholderTextColor={PLACEHOLDER}
                  keyboardAppearance="dark"
                  selectionColor={colors.accent}
                  value={
                    set.reps !== null && set.reps !== undefined
                      ? String(set.reps)
                      : ""
                  }
                  onChangeText={(val) => updateSetValue(set.id, "reps", val)}
                  onEndEditing={() => saveSet(set.id)}
                  keyboardType="number-pad"
                />

                {/* Confirms the row reached the server. Given sets have gone
                    missing before, showing that state is worth the space. */}
                <View style={styles.colStatus}>
                  {set.completed ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.success}
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.finish}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={20} color={colors.accentInk} />
          <Text style={styles.finishText}>Finish Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: shared.screen,

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  liveLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  exerciseCard: {
    ...shared.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },

  colSet: {
    width: 28,
  },
  colField: {
    flex: 1,
  },
  colStatus: {
    width: 24,
    alignItems: "center",
  },

  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  setHeaderText: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  setNumber: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  setInput: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  finish: shared.primaryButton,
  finishText: shared.primaryButtonText,
});
