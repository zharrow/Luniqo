import React from "react";
import { colors, shadows } from "../../colors";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  data?: number[];
  style?: React.CSSProperties;
}

// Simple bar chart visualization
const BarChart: React.FC<{ data: number[] }> = ({ data }) => {
  const max = Math.max(...data);
  const barWidth = 40;
  const gap = 16;
  const height = 160;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap,
        height,
        padding: "20px 0",
      }}
    >
      {data.map((value, index) => {
        const barHeight = (value / max) * (height - 40);
        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: barWidth,
                height: barHeight,
                backgroundColor: index === data.length - 1 ? colors.primary : `${colors.primary}40`,
                borderRadius: 8,
                transition: "height 0.3s ease",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: `${colors.foreground}60`,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {["Lun", "Mar", "Mer", "Jeu", "Ven"][index] || `J${index + 1}`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Simple line chart visualization
const LineChart: React.FC<{ data: number[] }> = ({ data }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 280;
  const height = 120;
  const padding = 20;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg width={width} height={height} style={{ marginTop: 10 }}>
      {/* Area fill */}
      <path d={areaD} fill={`${colors.primary}15`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" />
      {/* Points */}
      {data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - min) / range) * (height - padding * 2);
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="4"
            fill={colors.card}
            stroke={colors.primary}
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
};

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  data = [75, 82, 68, 90, 85],
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
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
            margin: 0,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: 12,
              color: `${colors.foreground}60`,
              fontFamily: "system-ui, sans-serif",
              margin: "4px 0 0 0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Chart or custom content */}
      {children || <LineChart data={data} />}
    </div>
  );
};

export { BarChart, LineChart };
