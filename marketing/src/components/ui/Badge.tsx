import React from "react";
import { colors } from "../../colors";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

const variantStyles = {
  default: {
    backgroundColor: `${colors.border}`,
    color: colors.foreground,
  },
  success: {
    backgroundColor: `${colors.success}40`,
    color: "#059669",
  },
  warning: {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  danger: {
    backgroundColor: "#fee2e2",
    color: colors.destructive,
  },
  primary: {
    backgroundColor: `${colors.primary}20`,
    color: colors.primary,
  },
};

const sizeStyles = {
  sm: {
    fontSize: 11,
    padding: "4px 8px",
  },
  md: {
    fontSize: 13,
    padding: "6px 12px",
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  style,
}) => {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        borderRadius: 20,
        fontWeight: 600,
        fontFamily: "system-ui, sans-serif",
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {children}
    </span>
  );
};
