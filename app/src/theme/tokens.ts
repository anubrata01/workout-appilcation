// Design tokens — single source of truth for the app's light theme.
// Components should never hardcode a hex value or font name directly.

export const colors = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceElevated: "#FBFAF7",
  track: "#EDEAE2",
  border: "#E3DFD3",
  borderSubtle: "#EEEBE3",

  accent: "#FF4519",
  accentWarm: "#FF6B4A",

  chalk: "#211F1A",
  muted: "#6B6759",
  dim: "#8A8578",
  faint: "#B5B0A0",

  success: "#1E9E70",
  error: "#E8432E",
  warning: "#B8791A",
} as const;

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
