import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, getErrorMessage } from "../utils/api";
import { PLACEHOLDER, shared, spacing } from "../utils/theme";

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
    <KeyboardAvoidingView
      style={shared.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>New Template</Text>
        <Text style={styles.subtitle}>
          Give it a name you&apos;ll recognise at the gym.
        </Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Push Day"
          placeholderTextColor={PLACEHOLDER}
          keyboardAppearance="dark"
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        <View style={styles.spacer} />

        <TouchableOpacity
          style={[styles.primary, saving && shared.disabled]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>
            {saving ? "Creating..." : "Create Template"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  title: {
    ...shared.title,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...shared.mutedText,
    marginBottom: spacing.xxxl,
  },
  label: {
    ...shared.sectionLabel,
    marginBottom: spacing.md,
  },
  input: shared.input,
  spacer: {
    flex: 1,
  },
  primary: shared.primaryButton,
  primaryText: shared.primaryButtonText,
});
