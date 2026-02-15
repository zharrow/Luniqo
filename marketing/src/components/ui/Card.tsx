import React from "react";
import { colors, shadows } from "../../colors";

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 24,
  style,
}) => {
  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding,
        boxShadow: shadows.DEFAULT,
        border: `1px solid ${colors.border}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
