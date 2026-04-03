import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { API_URL } from "../../utils/config";

export default function Session() {
  const { id } = useLocalSearchParams();
  const [exercises, setExercises] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExercises(response.data.exercises);
      setSets(response.data.sets);
    } catch (err) {
      Alert.alert("Error fetching session:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSetsForExercise = (exerciseId) => {
    return sets.filter((set) => set.template_exercise_id === exerciseId);
  };

  const updateSetValue = (setId, field, value) => {
    setSets((prev) =>
      prev.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
    );
  };

  const saveSet = async (setId) => {
    const set = sets.find((s) => s.id === setId);
    if (!set.weight || !set.reps) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/sets/${setId}`,
        {
          weight: parseFloat(set.weight),
          reps: parseInt(set.reps),
          completed: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (err) {
      Alert.alert("Error saving set:", err.message);
    }
  };

  const handleFinish = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/sessions/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Alert.alert("Workout Complete!", "Great job!", [
        { text: "OK", onPress: () => router.replace("/templates") },
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to complete workout");
      console.log(err.message);
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
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{item.exercise_name}</Text>

            <View style={styles.setHeader}>
              <Text style={[styles.setHeaderText, { flex: 0.5 }]}>Set</Text>
              <Text style={styles.setHeaderText}>Weight (lbs)</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
            </View>

            {getSetsForExercise(item.id).map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={[styles.setNumber, { flex: 0.5 }]}>
                  {index + 1}
                </Text>
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  value={set.weight ? set.weight.toString() : ""}
                  onChangeText={(val) => updateSetValue(set.id, "weight", val)}
                  onEndEditing={() => saveSet(set.id)}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  value={set.reps ? set.reps.toString() : ""}
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
