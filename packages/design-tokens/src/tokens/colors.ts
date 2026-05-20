/**
 * Intelligent Growth Color Tokens
 * JS-side color values for use in components.
 */

export const mahaColors = {
  /** Brand palette (Emerald Green — technical precision + natural vitality) */
  maha: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },
  surface: {
    50: "#F8F9FF",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    850: "#1E293B",
    900: "#0F172A",
    950: "#020617",
  },
} as const;

/**
 * Semantic colors for dark/light mode
 */
export const semanticColors = {
  light: {
    bg: mahaColors.surface[50],
    surface: "#FFFFFF",
    surfaceAlt: mahaColors.surface[100],
    border: mahaColors.surface[200],
    textPrimary: mahaColors.surface[900],
    textSecondary: mahaColors.surface[700],
    textMuted: mahaColors.surface[500],
  },
  dark: {
    bg: mahaColors.surface[950],
    surface: mahaColors.surface[850],
    surfaceAlt: mahaColors.surface[800],
    border: mahaColors.surface[700],
    textPrimary: mahaColors.surface[100],
    textSecondary: mahaColors.surface[300],
    textMuted: mahaColors.surface[400],
  },
} as const;

export type MahaColorKey = keyof typeof mahaColors.maha;
export type SurfaceColorKey = keyof typeof mahaColors.surface;
