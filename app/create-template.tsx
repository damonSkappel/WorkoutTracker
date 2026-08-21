import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, getErrorMessage } from "../utils/api";

export default function CreateTemplate() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert("Error", "Please enter a template name");
      return;
    }

    setSaving(true);
    try {
      const response = await api.post("/api/templates", { name: trimmedName });
      const templateId = response.data?.id;

      // A brand new template is empty, and you can't start a workout without
      // exercises, so adding one is always the next step. replace() rather than
      // push() so Back from there returns to the templates list instead of this
      // form, where saving again would create a duplicate template.
      if (templateId) {
        router.replace(`/template/${templateId}/add-exercise`);
      } else {
        router.back();
      }
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to create template");
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Template</Text>

      <TextInput
        style={styles.input}
        placeholder="Template name (e.g. Push Day)"
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Creating..." : "Create Template"}
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
