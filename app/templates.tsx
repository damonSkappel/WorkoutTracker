import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, getErrorMessage } from "../utils/api";
import { useAuth } from "../utils/auth";
import { colors, shared } from "../utils/theme";

/**
 * "4 exercises · 12 sets", or a nudge when the template is empty. An empty
 * template cannot start a workout, so saying so here is more useful than
 * printing two zeros.
 */
const describeTemplate = (exercises: number, sets: number) => {
  if (!exercises) return "No exercises yet";
  const ex = `${exercises} exercise${exercises === 1 ? "" : "s"}`;
  const st = `${sets} set${sets === 1 ? "" : "s"}`;
  return `${ex}  ·  ${st}`;
};

export default function Templates() {
  const { signOut } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get("/api/templates");
      setTemplates(response.data);
    } catch (err: any) {
      Alert.alert("Error", getErrorMessage(err, "Failed to fetch templates"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTemplates();
    }, [fetchTemplates]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTemplates();
  }, [fetchTemplates]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.title}>My Templates</Text>
        </View>
        <TouchableOpacity
          onPress={signOut}
          style={styles.iconButton}
          hitSlop={12}
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          Routines
          {templates.length > 0 ? `  ·  ${templates.length}` : ""}
        </Text>
        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push("/history")}
          hitSlop={8}
        >
          <Ionicons name="time-outline" size={15} color={colors.textMuted} />
          <Text style={styles.historyLinkText}>History</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => `template-${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textMuted}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/template/${item.id}`)}
          >
            {/* A monogram gives each row an anchor, so the list reads as
                distinct items rather than a wall of similar text. */}
            <View style={styles.monogram}>
              <Text style={styles.monogramText}>
                {String(item.name).trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text
                style={[
                  styles.cardMeta,
                  item.exercise_count === 0 && styles.cardMetaEmpty,
                ]}
              >
                {describeTemplate(item.exercise_count, item.set_count)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="barbell-outline" size={26} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptyBody}>
              Build a template once, then start it whenever you train.
            </Text>
          </View>
        }
      />

      {/* Anchored to the bottom: the primary action sits where the thumb
          already is, rather than at the top where it has to be reached for. */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primary}
          activeOpacity={0.85}
          onPress={() => router.push("/create-template")}
        >
          <Ionicons name="add" size={20} color={colors.accentInk} />
          <Text style={styles.primaryText}>New Template</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: shared.screen,
  loading: shared.centered,

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  date: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  title: shared.title,
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionLabel: shared.sectionLabel,
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  historyLinkText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexGrow: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  monogram: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  monogramText: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "700",
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  cardMetaEmpty: {
    color: colors.accent,
    opacity: 0.75,
  },

  empty: {
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 32,
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
    marginBottom: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  primary: shared.primaryButton,
  primaryText: shared.primaryButtonText,
});
