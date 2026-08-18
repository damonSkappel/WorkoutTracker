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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleStartWorkout = async () => {
    if (!exercises.length) {
      Alert.alert("No exercises", "Add at least one exercise before starting a workout.");
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

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Exercises</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push(`/template/${id}/add-exercise`)}
      >
        <Text style={styles.addButtonText}>+ Add Exercise</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.startButton, startingWorkout && styles.startButtonDisabled]}
        onPress={handleStartWorkout}
        disabled={startingWorkout}
      >
        <Text style={styles.startButtonText}>
          {startingWorkout ? "Starting..." : "Start Workout"}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={exercises}
        keyExtractor={(item) => `exercise-${item.id}`}
        renderItem={({ item }) => (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{item.exercise_name}</Text>
            <Text style={styles.exerciseSets}>{item.default_sets} sets</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No exercises yet.</Text>}
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
  exerciseCard: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
  },
  exerciseSets: {
    fontSize: 14,
    color: "#666",
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  startButton: {
    backgroundColor: "#34C759",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  startButtonDisabled: {
    backgroundColor: "#8dd9a4",
  },
  startButtonText: {
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
