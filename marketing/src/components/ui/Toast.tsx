import React from "react";
import { interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { colors, shadows } from "../../colors";

interface ToastProps {
  message: string;
  type?: "success" | "info" | "warning" | "error";
  showAt?: number;
  duration?: number;
  style?: React.CSSProperties;
}

const toastIcons = {
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={colors.success} />
      <path
        d="M8 12L11 15L16 9"
        stroke={colors.card}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={colors.primary} />
      <path
        d="M12 16V12M12 8H12.01"
        stroke={colors.card}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L22 20H2L12 2Z"
        fill="#f59e0b"
        strokeLinejoin="round"
      />
      <path
        d="M12 10V14M12 17H12.01"
        stroke={colors.card}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={colors.destructive} />
      <path
        d="M15 9L9 15M9 9L15 15"
        stroke={colors.card}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const toastColors = {
  success: { bg: "#ecfdf5", border: colors.success },
  info: { bg: "#eff6ff", border: colors.primary },
  warning: { bg: "#fffbeb", border: "#f59e0b" },
  error: { bg: "#fef2f2", border: colors.destructive },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  showAt = 0,
  duration = 90, // frames (3 seconds at 30fps)
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide in animation
  const slideIn = spring({
    frame: frame - showAt,
    fps,
    config: { damping: 20, stiffness: 120 },
  });

  // Slide out animation
  const slideOut = spring({
    frame: frame - (showAt + duration),
    fps,
    config: { damping: 20, stiffness: 120 },
  });

  // Opacity
  const opacity = interpolate(
    frame,
    [showAt, showAt + 10, showAt + duration, showAt + duration + 10],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Y position
  const translateY = frame < showAt + duration
    ? interpolate(slideIn, [0, 1], [20, 0], { extrapolateRight: "clamp" })
    : interpolate(slideOut, [0, 1], [0, -20], { extrapolateRight: "clamp" });

  const { bg, border } = toastColors[type];

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: shadows.md,
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {toastIcons[type]}
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: colors.foreground,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {message}
      </span>
    </div>
  );
};
