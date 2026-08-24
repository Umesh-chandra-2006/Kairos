// Kairos Mobile — Design Token System
// Source of truth: design.md

export interface ColorPalette {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textDim: string;
  line: string;
  accent: string;
  accentInk: string;
  accent2: string;
  danger: string;
  shadow: string;
}

export const darkColors: ColorPalette = {
  bg: "#0A0E13",
  surface: "#141A22",
  surface2: "#1B222C",
  text: "#ECEFF3",
  textDim: "#8A93A1",
  line: "#232B35",
  accent: "#E8B84B",       // amber — doing today's thing
  accentInk: "#2A1F05",    // near-black text on amber buttons
  accent2: "#4FC2B8",      // teal — AI evaluation / analytics
  danger: "#E8735F",
  shadow: "rgba(0,0,0,0.5)",
};

export const lightColors: ColorPalette = {
  bg: "#F1F1EE",
  surface: "#FFFFFF",
  surface2: "#F7F6F2",
  text: "#181C22",
  textDim: "#6B7280",
  line: "#E3E2DC",
  accent: "#C6862A",
  accentInk: "#FFF7E6",
  accent2: "#2E8F86",
  danger: "#C6482F",
  shadow: "rgba(20,20,10,0.12)",
};

// Typography families — loaded via expo-font in _layout.tsx
export const fonts = {
  display: "SpaceGrotesk",        // Space Grotesk — screen titles, headings
  displayMedium: "SpaceGrotesk_500Medium",
  displaySemiBold: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
  body: "Inter",                  // Inter — body, labels, buttons
  bodyMedium: "Inter_400Regular",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  sans: "Inter",                  // Alias for body
  mono: "IBMPlexMono",            // IBM Plex Mono — numbers, scores, timers
  monoRegular: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
  monoSemiBold: "IBMPlexMono_600SemiBold",
} as const;

// Type scale (mobile)
export const typescale = {
  h1: { fontSize: 25, lineHeight: 30 },       // Screen title
  h2: { fontSize: 17, lineHeight: 22 },       // Section heading
  eyebrow: { fontSize: 10.5, letterSpacing: 1.5 }, // mono, uppercase
  body: { fontSize: 14, lineHeight: 21 },     // Body text
  caption: { fontSize: 11.5, lineHeight: 17 }, // Muted captions
} as const;

// Spacing — 4px base unit
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Border radii
export const radii = {
  sm: 10,    // buttons, small controls
  md: 16,    // cards
  lg: 26,    // screen containers, sheets
  full: 999, // pills
} as const;

// Ring (signature element) constants
export const ring = {
  strokeWidth: 9,
  amberColor: darkColors.accent,
  tealColor: darkColors.accent2,
} as const;
