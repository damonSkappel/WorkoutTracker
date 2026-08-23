import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, getErrorMessage } from "../utils/api";
import { colors, radius, shared, spacing } from "../utils/theme";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export default function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await api.get("/api/sessions/history");
      setHistory(response.data);
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to fetch history");
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [fetchHistory]),
  );

  const totalSessions = history.reduce(
    (sum, group) => sum + group.sessions.length,
    0,
  );

  if (loading) {
    return (
      <View style={shared.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Past Workouts</Text>
        {totalSessions > 0 ? (
          <Text style={styles.subtitle}>
            {totalSessions} completed workout{totalSessions === 1 ? "" : "s"}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => `template-${item.template_id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName} numberOfLines={1}>
                {item.template_name}
              </Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>
                  {item.sessions.length}
                </Text>
              </View>
            </View>

            {item.sessions.map((session: any, index: number) => (
              <View
                key={`session-${session.session_id}`}
                style={[styles.row, index === 0 && styles.rowFirst]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color={colors.success}
                />
                <Text style={styles.rowDate}>{formatDate(session.date)}</Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={26}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>Nothing logged yet</Text>
            <Text style={styles.emptyBody}>
              Finish a workout and it&apos;ll show up here.
            </Text>
          </View>
        }
      />
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
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  group: {
    ...shared.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  groupName: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  countPill: {
    minWidth: 26,
    height: 26,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowFirst: {
    marginTop: spacing.md,
  },
  rowDate: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "500",
  },

  empty: {
    alignItems: "center",
    paddingTop: 56,
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
});
