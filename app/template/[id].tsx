import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
import { api, getErrorMessage } from "../../utils/api";
import { colors, radius, shared, spacing } from "../../utils/theme";

export default function TemplateDetail() {
  const { id } = useLocalSearchParams();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingWorkout, setStartingWorkout] = useState(false);

  const fetchExercises = useCallback(async () => {
    try {
      const response = await api.get(`/api/templates/${id}/exercises`);
      setExercises(response.data);
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to load exercises");
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchExercises();
    }, [fetchExercises]),
  );

  const handleStartWorkout = async () => {
    if (!exercises.length) {
      Alert.alert(
        "No exercises",
        "Add at least one exercise before starting a workout.",
      );
      return;
    }

    setStartingWorkout(true);

    try {
      const response = await api.post("/api/sessions", {
        template_id: id,
        date: new Date().toISOString().split("T")[0],
      });
      router.push(`/session/${response.data.id}`);
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to start workout");
      Alert.alert("Error", message);
    } finally {
      setStartingWorkout(false);
    }
  };

  if (loading) {
    return (
      <View style={shared.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const totalSets = exercises.reduce(
    (sum, item) => sum + (item.default_sets ?? 0),
    0,
  );
  const canStart = exercises.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercises</Text>
        <Text style={styles.subtitle}>
          {exercises.length === 0
            ? "Nothing here yet"
            : `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}  ·  ${totalSets} set${totalSets === 1 ? "" : "s"}`}
        </Text>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => `exercise-${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() =>
              router.push(`/template/${id}/add-exercise?exerciseId=${item.id}`)
            }
          >
            <View style={styles.position}>
              <Text style={styles.positionText}>{index + 1}</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.exercise_name}
              </Text>
              <Text style={styles.cardMeta}>
                {item.default_sets} {item.default_sets === 1 ? "set" : "sets"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textFaint}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="add" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptyBody}>
              Add at least one before you can start a workout.
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.ghost}
          onPress={() => router.push(`/template/${id}/add-exercise`)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={19} color={colors.text} />
          <Text style={styles.ghostText}>Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primary,
            (!canStart || startingWorkout) && shared.disabled,
          ]}
          onPress={handleStartWorkout}
          disabled={!canStart || startingWorkout}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={18} color={colors.accentInk} />
          <Text style={styles.primaryText}>
            {startingWorkout ? "Starting..." : "Start Workout"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: shared.screen,
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...shared.title,
    marginBottom: spacing.xs,
  },
  subtitle: shared.mutedText,

  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  card: {
    ...shared.card,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: spacing.sm + 2,
  },
  position: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  positionText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },

  empty: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: spacing.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...shared.mutedText,
    textAlign: "center",
  },

  footer: {
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  ghost: shared.ghostButton,
  ghostText: shared.ghostButtonText,
  primary: shared.primaryButton,
  primaryText: shared.primaryButtonText,
});
