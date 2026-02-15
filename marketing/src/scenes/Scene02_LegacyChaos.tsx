import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors } from "../colors";

/**
 * Scene 02 - Legacy Chaos (8-16s) - VERSION KINETIC
 *
 * Approche "Focus Typography":
 * - Texte kinétique au centre qui capte l'attention
 * - Chaos desktop en fond flou pour contexte
 * - Animation séquentielle claire: un élément à la fois
 * - Typographie grande et impactante
 */

// ============================================
// KINETIC TEXT COMPONENT
// ============================================

interface KineticWordProps {
  word: string;
  startFrame: number;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  direction?: "left" | "right" | "up" | "down";
  impact?: boolean;
}

const KineticWord: React.FC<KineticWordProps> = ({
  word,
  startFrame,
  color = "#1f2937",
  fontSize = 72,
  fontWeight = 600,
  direction = "up",
  impact = false,
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
    left: { x: -100, y: 0 },
    right: { x: 100, y: 0 },
    up: { x: 0, y: 50 },
    down: { x: 0, y: -50 },
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

  const scale = interpolate(impactScale, [0, 1], [1.3, 1], {
    extrapolateRight: "clamp",
  });

  // Continuous subtle float after entry (keeps scene alive)
  const floatY = Math.sin((frame - startFrame) * 0.04) * 3;
  const floatX = Math.cos((frame - startFrame) * 0.03) * 2;

  // Danger pulse for impact words - more intense over time
  const pulseIntensity = impact
    ? interpolate(frame, [startFrame, startFrame + 100], [0.02, 0.06], { extrapolateRight: "clamp" })
    : 0;
  const pulse = impact
    ? 1 + Math.sin((frame - startFrame) * 0.2) * pulseIntensity
    : 1;

  // Increasing shake for tension (after all text appears)
  const shakeIntensity = interpolate(frame, [140, 200], [0, 4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeX = Math.sin(frame * 0.8) * shakeIntensity * (impact ? 1.5 : 0.5);
  const shakeY = Math.cos(frame * 0.6) * shakeIntensity * (impact ? 1 : 0.3);

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity,
        transform: `translate(${translateX + floatX + shakeX}px, ${translateY + floatY + shakeY}px) scale(${scale * pulse})`,
        fontSize,
        fontWeight,
        color,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        letterSpacing: "-0.03em",
        textShadow: impact
          ? `0 0 ${40 + shakeIntensity * 5}px ${color}40, 0 4px 20px rgba(0,0,0,0.15)`
          : "0 4px 20px rgba(0,0,0,0.1)",
        whiteSpace: "nowrap",
      }}
    >
      {word}
    </div>
  );
};

// ============================================
// CHAOS BACKGROUND (SIMPLIFIED & BLURRED)
// ============================================

const ChaosBackground: React.FC = () => {
  const frame = useCurrentFrame();

  // Simplified window representations - just shapes suggesting chaos
  const windows = [
    { x: 80, y: 100, w: 380, h: 280, rotation: -4, color: "#217346", delay: 0 },
    { x: 420, y: 320, w: 360, h: 260, rotation: 3, color: "#0078d4", delay: 5 },
    { x: 820, y: 80, w: 320, h: 240, rotation: 5, color: "#2563eb", delay: 10 },
    { x: 160, y: 460, w: 300, h: 240, rotation: -3, color: "#34c759", delay: 15 },
    { x: 850, y: 400, w: 340, h: 220, rotation: 6, color: "#f59e0b", delay: 20 },
    { x: 560, y: 180, w: 280, h: 180, rotation: -2, color: "#dc2626", delay: 25 },
  ];

  // Error indicators
  const errorBadges = [
    { x: 200, y: 320, delay: 30 },
    { x: 680, y: 360, delay: 45 },
    { x: 1050, y: 280, delay: 60 },
    { x: 380, y: 640, delay: 75 },
  ];

  // Overall blur increases over time to focus on text
  const bgBlur = interpolate(frame, [0, 60, 120], [2, 4, 8], {
    extrapolateRight: "clamp",
  });

  const bgOpacity = interpolate(frame, [0, 60, 120], [0.6, 0.45, 0.3], {
    extrapolateRight: "clamp",
  });

  // Red tint increases with tension
  const redTint = interpolate(frame, [140, 200], [0, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background shake
  const bgShake = interpolate(frame, [140, 200], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bgShakeX = Math.sin(frame * 0.5) * bgShake;
  const bgShakeY = Math.cos(frame * 0.4) * bgShake;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        filter: `blur(${bgBlur}px)`,
        opacity: bgOpacity,
        transform: `translate(${bgShakeX}px, ${bgShakeY}px)`,
      }}
    >
      {/* Desktop gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B8DD6 100%)",
          opacity: 0.15,
        }}
      />

      {/* Red danger tint overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#dc2626",
          opacity: redTint,
          pointerEvents: "none",
        }}
      />

      {/* Simplified windows */}
      {windows.map((win, i) => {
        const entryOpacity = interpolate(frame, [win.delay, win.delay + 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const floatY = Math.sin((frame + i * 20) * 0.03) * 5;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: win.x,
              top: win.y + floatY,
              width: win.w,
              height: win.h,
              borderRadius: 12,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              transform: `rotate(${win.rotation}deg)`,
              opacity: entryOpacity,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
          >
            {/* Window header */}
            <div
              style={{
                height: 32,
                backgroundColor: "#f6f6f6",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                alignItems: "center",
                paddingLeft: 12,
                gap: 6,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#febc2e" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }} />
            </div>

            {/* Colored content hint */}
            <div
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ height: 8, width: "70%", backgroundColor: win.color, borderRadius: 4, opacity: 0.3 }} />
              <div style={{ height: 6, width: "90%", backgroundColor: "#e5e7eb", borderRadius: 3 }} />
              <div style={{ height: 6, width: "60%", backgroundColor: "#e5e7eb", borderRadius: 3 }} />
              <div style={{ height: 6, width: "80%", backgroundColor: "#e5e7eb", borderRadius: 3 }} />
            </div>
          </div>
        );
      })}

      {/* Error indicators floating */}
      {errorBadges.map((badge, i) => {
        const entryOpacity = interpolate(frame, [badge.delay, badge.delay + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const pulse = Math.sin(frame * 0.15 + i) * 0.2 + 1;
        const floatY = Math.sin((frame + i * 30) * 0.04) * 8;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: badge.x,
              top: badge.y + floatY,
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#dc2626",
              opacity: entryOpacity,
              transform: `scale(${pulse})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(220, 38, 38, 0.4)",
            }}
          >
            <span style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>!</span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// MAIN SCENE
// ============================================

export const Scene02_LegacyChaos: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene fade out
  const fadeOut = interpolate(frame, [210, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Center text container animation
  const containerOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Vignette for focus
  const vignetteIntensity = interpolate(frame, [60, 150], [0.1, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow zoom in for tension
  const zoom = interpolate(frame, [100, 210], [1, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#e8eaed",
        opacity: fadeOut,
      }}
    >
      {/* Chaos background */}
      <ChaosBackground />


      {/* Vignette for focus on center */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 60% at center, transparent 20%, rgba(0, 0, 0, ${vignetteIntensity}) 100%)`,
          pointerEvents: "none",
          zIndex: 40,
        }}
      />

      {/* Central kinetic text */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          zIndex: 100,
          opacity: containerOpacity,
          transform: `scale(${zoom})`,
        }}
      >
        {/* First phrase */}
        <KineticWord
          word="Données dispersées."
          startFrame={50}
          fontSize={64}
          fontWeight={500}
          color="#374151"
          direction="left"
        />

        {/* Second phrase */}
        <KineticWord
          word="Suivi manuel."
          startFrame={80}
          fontSize={64}
          fontWeight={500}
          color="#374151"
          direction="right"
        />

        {/* Third phrase - IMPACT */}
        <KineticWord
          word="Risque d'erreur."
          startFrame={110}
          fontSize={80}
          fontWeight={700}
          color={colors.destructive}
          direction="up"
          impact
        />
      </div>

    </AbsoluteFill>
  );
};

