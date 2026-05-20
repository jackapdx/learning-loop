/**
 * 🎬 Maha Animation Tokens
 */

export const mahaAnimations = {
  durations: {
    fast: "100ms",
    normal: "150ms",
    slow: "250ms",
  },
  easings: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  classes: {
    fadeIn: "animate-maha-fade-in",
    slideUp: "animate-maha-slide-up",
    slideDown: "animate-maha-slide-down",
    scaleIn: "animate-maha-scale-in",
  },
} as const;
