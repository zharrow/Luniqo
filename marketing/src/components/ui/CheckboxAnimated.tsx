import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../../colors";

interface CheckboxAnimatedProps {
  label: string;
  checked: boolean;
  animateAt?: number; // Frame at which to animate the check
  style?: React.CSSProperties;
}

export const CheckboxAnimated: React.FC<CheckboxAnimatedProps> = ({
  label,
  checked,
  animateAt = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  // Animation progress for the checkmark
  const checkProgress = checked
    ? interpolate(frame, [animateAt, animateAt + 15], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Scale bounce effect
  const scale = checked
    ? interpolate(frame, [animateAt, animateAt + 8, animateAt + 15], [1, 1.15, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Strikethrough for label
  const strikeWidth = checked
    ? interpolate(frame, [animateAt + 5, animateAt + 20], [0, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        ...style,
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: `2px solid ${checked ? colors.success : colors.border}`,
          backgroundColor: checked ? colors.success : colors.card,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
          transition: "border-color 0.2s, background-color 0.2s",
        }}
      >
        {/* Checkmark SVG */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          style={{ opacity: checkProgress }}
        >
          <path
            d="M5 13L9 17L19 7"
            stroke={colors.card}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="20"
            strokeDashoffset={20 - 20 * checkProgress}
          />
        </svg>
      </div>

      {/* Label with strikethrough */}
      <div style={{ position: "relative" }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: checked ? `${colors.foreground}60` : colors.foreground,
            fontFamily: "system-ui, sans-serif",
            transition: "color 0.2s",
          }}
        >
          {label}
        </span>
        {/* Strikethrough line */}
        {checked && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: `${strikeWidth}%`,
              height: 2,
              backgroundColor: `${colors.foreground}40`,
              borderRadius: 1,
            }}
          />
        )}
      </div>
    </div>
  );
};

// Task list component using animated checkboxes
interface TaskItem {
  label: string;
  checked: boolean;
  animateAt: number;
}

interface TaskListProps {
  tasks: TaskItem[];
  style?: React.CSSProperties;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, style }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
    >
      {tasks.map((task, index) => (
        <CheckboxAnimated
          key={index}
          label={task.label}
          checked={task.checked}
          animateAt={task.animateAt}
        />
      ))}
    </div>
  );
};
