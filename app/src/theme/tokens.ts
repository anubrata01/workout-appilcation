// Design tokens carried over from the prototype's theme, unchanged in spirit
// (docs/04-UI-UX-DESIGN-BRIEF.md §1). Keep these as the single source of
// truth — components should never hardcode a hex value or font name directly.

export const colors = {
  bg: "#0B0B09",
  surface: "#1C1B17",
  surfaceElevated: "#181712",
  track: "#121210",
  border: "#2A2820",
  borderSubtle: "#201F19",

  accent: "#FF4519",
  accentWarm: "#FF6B4A",

  chalk: "#F3EFE6",
  muted: "#8A8578",
  dim: "#6B6759",
  faint: "#565344",

  success: "#6EE7B7",
  error: "#E8432E",
  warning: "#FFB020",
} as const;

export const tagColors = {
  push: "#FFB020",
  pull: "#34C6C6",
  legs: "#A78BFA",
  upper: "#FF6B4A",
  lower: "#6EE7B7",
  full: "#F3EFE6",
} as const;

export type TagId = keyof typeof tagColors;

// Same 6 colors as tagColors, as an array — used anywhere we need to cycle
// through distinct accents without a specific tag to key off (e.g. the tag
// split donut's segments, or a per-exercise accent dot on a PR card).
export const chartPalette = Object.values(tagColors);

export const fonts = {
  display: "BebasNeue_400Regular",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  data: "JetBrainsMono_400Regular",
  dataBold: "JetBrainsMono_700Bold",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
