import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

  const saveSet = async (setId: number) => {
    const set = sets.find((s) => s.id === setId);
    if (!set) return;

    const weight = Number(set.weight);
    const reps = Number(set.reps);

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
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to save set");
      Alert.alert("Error", message);
    }
  };

  const handleFinish = async () => {
    try {
      await api.put(`/api/sessions/${id}`, {});
      Alert.alert("Workout Complete!", "Great job!", [
        { text: "OK", onPress: () => router.replace("/templates") },
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
