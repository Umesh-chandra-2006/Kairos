// Kairos Mobile — Design Token System
// Source of truth: docs/ui/v0-fable5-design-doc.md + approved web palette

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
  bg: "#0A0A0A",
  surface: "#121212",
  surface2: "#1F1B12",
  text: "#F5F1E6",
  textDim: "#8A8378",
  line: "#1F1B12",
  accent: "#E3B341",       // warm amber — doing today's thing
  accentInk: "#241C08",    // near-black text on amber buttons
  accent2: "#E3B341",      // AI evaluation / analytics (same warm accent)
  danger: "#C0433B",
  shadow: "rgba(0,0,0,0.5)",
};

export const lightColors: ColorPalette = {
  bg: "#F7F4EC",
  surface: "#FBF8F0",
  surface2: "#F1EDE0",
  text: "#1C1811",
  textDim: "#6B6355",
  line: "#E4DDC9",
  accent: "#8A6415",       // warm amber (brown-amber on cream paper)
  accentInk: "#FBF4E1",
  accent2: "#8A6415",
  danger: "#C0433B",
  shadow: "rgba(28,24,17,0.12)",
};

// Typography families — loaded via expo-font in _layout.tsx.
// Every value is the exact registered family name required by React Native.
export const fonts = {
  // Playfair Display — premium serif for titles/headings (marks usability + luxury)
  display: "PlayfairDisplay_500Medium",
  displayMedium: "PlayfairDisplay_500Medium",
  displaySemiBold: "PlayfairDisplay_600SemiBold",
  displayBold: "PlayfairDisplay_700Bold",
  displayItalic: "PlayfairDisplay_500Medium_Italic",
  // Inter — body, labels, buttons
  body: "Inter_400Regular",
  bodyMedium: "Inter_400Regular",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  sans: "Inter_400Regular",
  // IBM Plex Mono — numbers, scores, timers, micro-caps labels
  mono: "IBMPlexMono_400Regular",
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
  sm: 7,     // buttons, small controls
  md: 12,    // cards
  lg: 16,    // screen containers, sheets
  full: 999, // pills
} as const;

// Ring (signature element) constants
export const ring = {
  strokeWidth: 9,
  amberColor: darkColors.accent,
  tealColor: darkColors.accent2,
} as const;
