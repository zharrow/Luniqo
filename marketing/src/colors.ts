// Luniqo Design System Colors
export const colors = {
  // Main palette
  primary: "#5a9dc9",      // Blue - Cleanliness, serenity
  secondary: "#f4c2c2",    // Pink - Warmth, childcare
  accent: "#e6e6fa",       // Lavender - hover/focus
  success: "#b5ead7",      // Mint - HACCP compliance
  destructive: "#dc2626",  // Red - accessible destructive

  // Fundamentals
  background: "#fafafa",   // Light gray (per script)
  foreground: "#2d2d3d",   // Dark text
  card: "#ffffff",         // White cards
  border: "#e0e0e8",       // Subtle borders

  // Legacy (for compatibility)
  text: "#2d2d3d",         // Same as foreground
  white: "#ffffff",
};

// Shadow system
export const shadows = {
  sm: "0 2px 4px rgba(0,0,0,0.05)",
  DEFAULT: "0 4px 6px rgba(0,0,0,0.06)",
  md: "0 6px 10px rgba(0,0,0,0.08)",
  lg: "0 10px 15px rgba(0,0,0,0.08)",
};

// Animation config
export const springConfig = {
  smooth: { damping: 25, stiffness: 120 },     // High damping, no bounce
  gentle: { damping: 30, stiffness: 100 },     // Very smooth
  snappy: { damping: 20, stiffness: 150 },     // Quick but controlled
};
