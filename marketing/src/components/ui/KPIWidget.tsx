import React from "react";
import { colors, shadows } from "../../colors";

interface KPIWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  color?: string;
  style?: React.CSSProperties;
}

export const KPIWidget: React.FC<KPIWidgetProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = colors.primary,
  style,
}) => {
  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        boxShadow: shadows.sm,
        border: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 180,
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: `${colors.foreground}80`,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {title}
        </span>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: trend.positive ? "#059669" : colors.destructive,
              fontFamily: "system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <span
          style={{
            fontSize: 12,
            color: `${colors.foreground}60`,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
};
