import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

/**
 * KineticText - Composant de typographie animée réutilisable
 *
 * Utilisé pour créer des effets de texte dynamiques et impactants
 * à travers toutes les scènes de la vidéo.
 */

// ============================================
// KINETIC WORD - Single animated word/phrase
// ============================================

export interface KineticWordProps {
  children: React.ReactNode;
  startFrame: number;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  direction?: "left" | "right" | "up" | "down" | "scale" | "none";
  impact?: boolean;
  delay?: number;
  // Additional effects
  float?: boolean;
  shake?: boolean;
  shakeStartFrame?: number;
  pulse?: boolean;
  glow?: boolean;
  glowColor?: string;
}

export const KineticWord: React.FC<KineticWordProps> = ({
  children,
  startFrame,
  color = "#1f2937",
  fontSize = 72,
  fontWeight = 600,
  direction = "up",
  impact = false,
  float = true,
  shake = false,
  shakeStartFrame = 140,
  pulse = false,
  glow = false,
  glowColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry animation
  const entryProgress = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: impact ? 18 : 25,
      stiffness: impact ? 200 : 150,
      mass: impact ? 0.8 : 1,
    },
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Direction-based entry offset
  const offsets = {
    left: { x: -100, y: 0, scale: 1 },
    right: { x: 100, y: 0, scale: 1 },
    up: { x: 0, y: 50, scale: 1 },
    down: { x: 0, y: -50, scale: 1 },
    scale: { x: 0, y: 0, scale: 0.5 },
    none: { x: 0, y: 0, scale: 1 },
  };

  const translateX = interpolate(entryProgress, [0, 1], [offsets[direction].x, 0]);
  const translateY = interpolate(entryProgress, [0, 1], [offsets[direction].y, 0]);

  // Impact effect - scale bounce
  const impactScale = impact
    ? spring({
        frame: frame - startFrame,
        fps,
        config: { damping: 12, stiffness: 300 },
      })
    : 1;

  const baseScale = direction === "scale"
    ? interpolate(entryProgress, [0, 1], [offsets.scale.scale, 1])
    : interpolate(impactScale, [0, 1], [1.3, 1], { extrapolateRight: "clamp" });

  // Continuous subtle float after entry
  const floatY = float ? Math.sin((frame - startFrame) * 0.04) * 3 : 0;
  const floatX = float ? Math.cos((frame - startFrame) * 0.03) * 2 : 0;

  // Pulse effect
  const pulseIntensity = (pulse || impact)
    ? interpolate(frame, [startFrame, startFrame + 100], [0.02, 0.06], { extrapolateRight: "clamp" })
    : 0;
  const pulseScale = (pulse || impact)
    ? 1 + Math.sin((frame - startFrame) * 0.2) * pulseIntensity
    : 1;

  // Shake effect for tension
  const shakeIntensity = shake
    ? interpolate(frame, [shakeStartFrame, shakeStartFrame + 60], [0, 4], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const shakeX = shake ? Math.sin(frame * 0.8) * shakeIntensity * (impact ? 1.5 : 0.5) : 0;
  const shakeY = shake ? Math.cos(frame * 0.6) * shakeIntensity * (impact ? 1 : 0.3) : 0;

  // Glow effect
  const glowAmount = glow ? 40 + shakeIntensity * 5 : 0;
  const effectiveGlowColor = glowColor || color;

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity,
        transform: `translate(${translateX + floatX + shakeX}px, ${translateY + floatY + shakeY}px) scale(${baseScale * pulseScale})`,
        fontSize,
        fontWeight,
        color,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        letterSpacing: "-0.03em",
        textShadow: glow
          ? `0 0 ${glowAmount}px ${effectiveGlowColor}40, 0 4px 20px rgba(0,0,0,0.15)`
          : "0 4px 20px rgba(0,0,0,0.1)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

// ============================================
// KINETIC LINE - Animated text line with stagger
// ============================================

export interface KineticLineProps {
  words: string[];
  startFrame: number;
  stagger?: number; // frames between each word
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  direction?: "left" | "right" | "up" | "down";
  highlightLast?: boolean;
  highlightColor?: string;
}

export const KineticLine: React.FC<KineticLineProps> = ({
  words,
  startFrame,
  stagger = 5,
  color = "#1f2937",
  fontSize = 48,
  fontWeight = 500,
  direction = "up",
  highlightLast = false,
  highlightColor = "#5a9dc9",
}) => {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
      {words.map((word, index) => (
        <KineticWord
          key={index}
          startFrame={startFrame + index * stagger}
          color={highlightLast && index === words.length - 1 ? highlightColor : color}
          fontSize={fontSize}
          fontWeight={highlightLast && index === words.length - 1 ? 700 : fontWeight}
          direction={direction}
          impact={highlightLast && index === words.length - 1}
          float={false}
        >
          {word}
        </KineticWord>
      ))}
    </div>
  );
};

// ============================================
// KINETIC COUNTER - Animated number countup
// ============================================

export interface KineticCounterProps {
  from?: number;
  to: number;
  startFrame: number;
  duration?: number; // in frames
  suffix?: string;
  prefix?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  decimals?: number;
}

export const KineticCounter: React.FC<KineticCounterProps> = ({
  from = 0,
  to,
  startFrame,
  duration = 30,
  suffix = "",
  prefix = "",
  color = "#1f2937",
  fontSize = 48,
  fontWeight = 700,
  decimals = 0,
}) => {
  const frame = useCurrentFrame();

  const value = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [from, to],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [startFrame, startFrame + 15], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        fontSize,
        fontWeight,
        color,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        fontFeatureSettings: "'tnum'",
        letterSpacing: "-0.02em",
      }}
    >
      {prefix}{value.toFixed(decimals)}{suffix}
    </div>
  );
};

// ============================================
// KINETIC BADGE - Animated badge/label pop
// ============================================

export interface KineticBadgeProps {
  children: React.ReactNode;
  startFrame: number;
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
}

export const KineticBadge: React.FC<KineticBadgeProps> = ({
  children,
  startFrame,
  backgroundColor = "#b5ead7",
  color = "#166534",
  fontSize = 14,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 10, stiffness: 200 },
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rotation = interpolate(frame, [startFrame, startFrame + 20], [-8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${Math.max(0, scale)}) rotate(${rotation}deg)`,
        backgroundColor,
        color,
        fontSize,
        fontWeight: 600,
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        padding: "8px 16px",
        borderRadius: 20,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        boxShadow: `0 4px 20px ${backgroundColor}60`,
      }}
    >
      {children}
    </div>
  );
};

// ============================================
// KINETIC REVEAL - Text reveal with mask
// ============================================

export interface KineticRevealProps {
  children: React.ReactNode;
  startFrame: number;
  duration?: number;
  direction?: "left" | "right" | "up" | "down";
  color?: string;
  fontSize?: number;
  fontWeight?: number;
}

export const KineticReveal: React.FC<KineticRevealProps> = ({
  children,
  startFrame,
  duration = 20,
  direction = "left",
  color = "#1f2937",
  fontSize = 48,
  fontWeight = 600,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const clipPaths = {
    left: `inset(0 ${100 - progress}% 0 0)`,
    right: `inset(0 0 0 ${100 - progress}%)`,
    up: `inset(${100 - progress}% 0 0 0)`,
    down: `inset(0 0 ${100 - progress}% 0)`,
  };

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        letterSpacing: "-0.02em",
        clipPath: clipPaths[direction],
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};
