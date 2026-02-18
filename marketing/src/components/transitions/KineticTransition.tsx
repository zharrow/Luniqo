import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors } from "../../colors";

/**
 * KineticTransition - Transitions animées entre les scènes
 *
 * Différents styles de transitions avec texte kinétique
 * pour créer des "respirations" narratives entre les scènes.
 */

// ============================================
// TRANSITION STYLES
// ============================================

type TransitionStyle = "impact" | "reveal" | "split" | "zoom" | "minimal";

interface KineticTransitionProps {
  text: string;
  subtext?: string;
  style?: TransitionStyle;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

// ============================================
// IMPACT TRANSITION - Bold text slam
// ============================================

const ImpactTransition: React.FC<{
  text: string;
  subtext?: string;
  textColor: string;
  accentColor: string;
}> = ({ text, subtext, textColor, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main text animation
  const textScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const textOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Slam effect - starts big, settles
  const slamScale = interpolate(textScale, [0, 1], [1.5, 1], {
    extrapolateRight: "clamp",
  });

  // Subtle shake after slam
  const shakeIntensity = interpolate(frame, [15, 25], [3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeX = Math.sin(frame * 2) * shakeIntensity;

  // Subtext fade in
  const subtextOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtextY = interpolate(frame, [20, 40], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent line animation
  const lineWidth = interpolate(frame, [10, 30], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* Main text */}
      <div
        style={{
          opacity: textOpacity,
          transform: `scale(${slamScale}) translateX(${shakeX}px)`,
          fontSize: 96,
          fontWeight: 800,
          color: textColor,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          letterSpacing: "-0.04em",
          textAlign: "center",
        }}
      >
        {text}
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 4,
          backgroundColor: accentColor,
          marginTop: 24,
          borderRadius: 2,
        }}
      />

      {/* Subtext */}
      {subtext && (
        <div
          style={{
            opacity: subtextOpacity,
            transform: `translateY(${subtextY}px)`,
            fontSize: 28,
            fontWeight: 400,
            color: `${textColor}90`,
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            marginTop: 20,
            letterSpacing: "-0.01em",
          }}
        >
          {subtext}
        </div>
      )}
    </>
  );
};

// ============================================
// REVEAL TRANSITION - Wipe reveal
// ============================================

const RevealTransition: React.FC<{
  text: string;
  textColor: string;
  accentColor: string;
}> = ({ text, textColor, accentColor }) => {
  const frame = useCurrentFrame();

  // Wipe mask
  const wipeProgress = interpolate(frame, [0, 25], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text float
  const floatY = Math.sin(frame * 0.05) * 5;

  // Subtle glow pulse
  const glowPulse = Math.sin(frame * 0.1) * 10 + 30;

  return (
    <div
      style={{
        position: "relative",
        transform: `translateY(${floatY}px)`,
      }}
    >
      {/* Wipe bar */}
      <div
        style={{
          position: "absolute",
          left: `${wipeProgress}%`,
          top: "50%",
          transform: "translateY(-50%)",
          width: 4,
          height: 120,
          backgroundColor: accentColor,
          boxShadow: `0 0 30px ${accentColor}`,
          opacity: wipeProgress < 100 ? 1 : 0,
        }}
      />

      {/* Text with clip */}
      <div
        style={{
          fontSize: 80,
          fontWeight: 700,
          color: textColor,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          letterSpacing: "-0.03em",
          clipPath: `inset(0 ${100 - wipeProgress}% 0 0)`,
          textShadow: `0 0 ${glowPulse}px ${accentColor}30`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ============================================
// SPLIT TRANSITION - Split screen merge
// ============================================

const SplitTransition: React.FC<{
  text: string;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
}> = ({ text, textColor, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Split panels animation
  const splitProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const leftX = interpolate(splitProgress, [0, 1], [-50, 0]);
  const rightX = interpolate(splitProgress, [0, 1], [50, 0]);

  // Text fade
  const textOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textScale = interpolate(frame, [15, 35], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Split the text in half
  const halfLength = Math.ceil(text.length / 2);
  const leftText = text.slice(0, halfLength);
  const rightText = text.slice(halfLength);

  return (
    <>
      {/* Split panels background effect */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "50%",
          height: "100%",
          backgroundColor: accentColor,
          opacity: 0.1,
          transform: `translateX(${leftX}%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "50%",
          height: "100%",
          backgroundColor: accentColor,
          opacity: 0.05,
          transform: `translateX(${rightX}%)`,
        }}
      />

      {/* Text */}
      <div
        style={{
          display: "flex",
          opacity: textOpacity,
          transform: `scale(${textScale})`,
        }}
      >
        <span
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: textColor,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            letterSpacing: "-0.03em",
            transform: `translateX(${leftX}px)`,
          }}
        >
          {leftText}
        </span>
        <span
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: accentColor,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            letterSpacing: "-0.03em",
            transform: `translateX(${rightX}px)`,
          }}
        >
          {rightText}
        </span>
      </div>
    </>
  );
};

// ============================================
// ZOOM TRANSITION - Zoom from center
// ============================================

const ZoomTransition: React.FC<{
  text: string;
  textColor: string;
  accentColor: string;
}> = ({ text, textColor, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoomScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const scale = interpolate(zoomScale, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Rings expanding outward
  const ring1Scale = interpolate(frame, [5, 35], [0.5, 2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring1Opacity = interpolate(frame, [5, 35], [0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ring2Scale = interpolate(frame, [10, 40], [0.5, 2.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring2Opacity = interpolate(frame, [10, 40], [0.2, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* Expanding rings */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `3px solid ${accentColor}`,
          transform: `scale(${ring1Scale})`,
          opacity: ring1Opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `2px solid ${accentColor}`,
          transform: `scale(${ring2Scale})`,
          opacity: ring2Opacity,
        }}
      />

      {/* Text */}
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          fontSize: 88,
          fontWeight: 800,
          color: textColor,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          letterSpacing: "-0.04em",
          textShadow: `0 0 60px ${accentColor}40`,
          zIndex: 10,
        }}
      >
        {text}
      </div>
    </>
  );
};

// ============================================
// MINIMAL TRANSITION - Simple fade
// ============================================

const MinimalTransition: React.FC<{
  text: string;
  subtext?: string;
  textColor: string;
}> = ({ text, subtext, textColor }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: "clamp",
  });

  const subtextOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          fontSize: 64,
          fontWeight: 600,
          color: textColor,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          letterSpacing: "-0.02em",
          textAlign: "center",
        }}
      >
        {text}
      </div>

      {subtext && (
        <div
          style={{
            opacity: subtextOpacity,
            fontSize: 24,
            fontWeight: 400,
            color: `${textColor}70`,
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            marginTop: 16,
          }}
        >
          {subtext}
        </div>
      )}
    </>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const KineticTransition: React.FC<KineticTransitionProps> = ({
  text,
  subtext,
  style = "impact",
  backgroundColor = colors.background,
  textColor = colors.foreground,
  accentColor = colors.primary,
}) => {
  const frame = useCurrentFrame();

  // Fade in/out
  const fadeIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const renderTransition = () => {
    switch (style) {
      case "impact":
        return (
          <ImpactTransition
            text={text}
            subtext={subtext}
            textColor={textColor}
            accentColor={accentColor}
          />
        );
      case "reveal":
        return (
          <RevealTransition
            text={text}
            textColor={textColor}
            accentColor={accentColor}
          />
        );
      case "split":
        return (
          <SplitTransition
            text={text}
            textColor={textColor}
            accentColor={accentColor}
            backgroundColor={backgroundColor}
          />
        );
      case "zoom":
        return (
          <ZoomTransition
            text={text}
            textColor={textColor}
            accentColor={accentColor}
          />
        );
      case "minimal":
        return (
          <MinimalTransition
            text={text}
            subtext={subtext}
            textColor={textColor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        opacity: fadeIn,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {renderTransition()}
    </AbsoluteFill>
  );
};

// ============================================
// BEAT MOMENT - Full screen text overlay
// ============================================

interface BeatMomentProps {
  text: string;
  startFrame: number;
  duration?: number;
  color?: string;
  backgroundColor?: string;
  style?: "fade" | "slam" | "pulse";
}

export const BeatMoment: React.FC<BeatMomentProps> = ({
  text,
  startFrame,
  duration = 45,
  color = colors.foreground,
  backgroundColor = "rgba(255, 255, 255, 0.95)",
  style = "slam",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isActive = frame >= startFrame && frame < startFrame + duration;

  if (!isActive) return null;

  const localFrame = frame - startFrame;

  // Background fade
  const bgOpacity = interpolate(
    localFrame,
    [0, 10, duration - 10, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Text animations based on style
  let textOpacity = 1;
  let textScale = 1;
  let textY = 0;

  if (style === "slam") {
    const slamProgress = spring({
      frame: localFrame,
      fps,
      config: { damping: 12, stiffness: 180 },
    });
    textScale = interpolate(slamProgress, [0, 1], [1.5, 1]);
    textOpacity = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  } else if (style === "fade") {
    textOpacity = interpolate(
      localFrame,
      [0, 15, duration - 15, duration],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    textY = interpolate(localFrame, [0, 20], [30, 0], { extrapolateRight: "clamp" });
  } else if (style === "pulse") {
    textOpacity = interpolate(localFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    textScale = 1 + Math.sin(localFrame * 0.15) * 0.03;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor,
        opacity: bgOpacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          opacity: textOpacity,
          transform: `scale(${textScale}) translateY(${textY}px)`,
          fontSize: 72,
          fontWeight: 700,
          color,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          letterSpacing: "-0.03em",
          textAlign: "center",
          maxWidth: "80%",
        }}
      >
        {text}
      </div>
    </div>
  );
};
