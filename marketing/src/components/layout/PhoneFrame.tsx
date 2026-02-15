import React from "react";
import { colors, shadows } from "../../colors";

interface PhoneFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  width = 375,
  height = 812,
  style,
}) => {
  return (
    <div
      style={{
        width: width + 24, // Bezel padding
        height: height + 48,
        backgroundColor: "#1a1a1a",
        borderRadius: 50,
        padding: "24px 12px",
        boxShadow: shadows.lg,
        ...style,
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: 150,
          height: 30,
          backgroundColor: "#1a1a1a",
          borderRadius: "0 0 20px 20px",
          zIndex: 10,
        }}
      >
        {/* Camera */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 20,
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: "#333",
          }}
        />
      </div>

      {/* Screen */}
      <div
        style={{
          width,
          height,
          backgroundColor: colors.background,
          borderRadius: 38,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            height: 44,
            backgroundColor: colors.card,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            9:41
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Signal */}
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
              {[4, 6, 8, 10].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    backgroundColor: colors.foreground,
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
            {/* WiFi */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill={colors.foreground}>
              <path d="M8 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8 6c-2.21 0-4.21.89-5.66 2.34l1.42 1.42A6.004 6.004 0 018 8c1.65 0 3.15.67 4.24 1.76l1.42-1.42A7.963 7.963 0 008 6zM8 2C4.69 2 1.73 3.39 0 6l1.42 1.42C2.74 5.36 5.22 4 8 4s5.26 1.36 6.58 3.42L16 6c-1.73-2.61-4.69-4-8-4z" />
            </svg>
            {/* Battery */}
            <div
              style={{
                width: 25,
                height: 12,
                border: `2px solid ${colors.foreground}`,
                borderRadius: 3,
                padding: 2,
              }}
            >
              <div
                style={{
                  width: "80%",
                  height: "100%",
                  backgroundColor: colors.foreground,
                  borderRadius: 1,
                }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
      </div>

      {/* Home indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 134,
          height: 5,
          backgroundColor: "#fff",
          borderRadius: 3,
        }}
      />
    </div>
  );
};
