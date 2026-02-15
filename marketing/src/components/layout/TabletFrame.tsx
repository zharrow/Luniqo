import React from "react";
import { colors, shadows } from "../../colors";

interface TabletFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  landscape?: boolean;
  style?: React.CSSProperties;
}

export const TabletFrame: React.FC<TabletFrameProps> = ({
  children,
  width = 1024,
  height = 768,
  landscape = true,
  style,
}) => {
  const frameWidth = landscape ? width : height;
  const frameHeight = landscape ? height : width;

  return (
    <div
      style={{
        width: frameWidth + 32,
        height: frameHeight + 32,
        backgroundColor: "#2a2a2a",
        borderRadius: 24,
        padding: 16,
        boxShadow: shadows.lg,
        position: "relative",
        ...style,
      }}
    >
      {/* Camera */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 8,
          transform: "translateY(-50%)",
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#444",
        }}
      />

      {/* Screen */}
      <div
        style={{
          width: frameWidth,
          height: frameHeight,
          backgroundColor: colors.background,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};
