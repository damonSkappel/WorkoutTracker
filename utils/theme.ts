/**
 * The app's design tokens, in one place.
 *
 * Every screen imports from here rather than hardcoding hex values, so a change
 * lands everywhere at once. When the light/dark toggle arrives, this file grows
 * a second palette and a hook to pick between them -- nothing else has to move.
 *
 * Contrast ratios below are measured against `bg`. WCAG AA wants 4.5:1 for body
 * text and 3:1 for large text and non-text indicators.
 */
export const colors = {
  /** Charcoal, not pure black: true black kills card edges and is harsh on OLED. */
  bg: "#0B0D10",
  /** Cards and inputs sit one step up from the background. */
  surface: "#16191F",
  /** For something that needs to sit above a card, e.g. an input inside one. */
  surfaceRaised: "#1D212A",
  border: "#252A35",

  text: "#F2F4F7", // 17.7:1
  textMuted: "#8B93A1", // 6.3:1
  textFaint: "#5C6472", // 3.3:1 -- decorative and large text only

  /** One accent, used sparingly. Overuse is what makes an accent stop meaning anything. */
  accent: "#D7FF3E",
  /** Text and icons drawn on top of `accent`. */
  accentInk: "#0B0D10",
  accentSoft: "rgba(215,255,62,0.10)",

  danger: "#FF6B6B", // 6.0:1
  dangerSoft: "rgba(255,107,107,0.12)",

  /** Completed / success, e.g. a finished workout. */
  success: "#4ADE80",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 999,
} as const;

/**
 * Options for the native stack header, so the back arrow and its bar match the
 * screens underneath instead of staying light.
 */
export const darkHeader = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
} as const;

/** Shared pieces that every screen was otherwise redefining identically. */
export const shared = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.6,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  primaryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  primaryButtonText: {
    color: colors.accentInk,
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
  },
  ghostButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  ghostButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  disabled: {
    opacity: 0.45,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
} as const;

/** Placeholder text is invisible on dark unless it is set explicitly. */
export const PLACEHOLDER = colors.textFaint;
