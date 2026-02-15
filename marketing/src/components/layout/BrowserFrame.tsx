import React from "react";
import { colors, shadows } from "../../colors";

interface BrowserFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  url?: string;
  style?: React.CSSProperties;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  children,
  width = 1400,
  height = 800,
  url = "app.luniqo.com",
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: colors.card,
        borderRadius: 16,
        boxShadow: shadows.lg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: 48,
          backgroundColor: "#f5f5f5",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ff5f57",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#febc2e",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#28c840",
            }}
          />
        </div>

        {/* URL bar */}
        <div
          style={{
            flex: 1,
            maxWidth: 500,
            height: 32,
            backgroundColor: colors.card,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            marginLeft: 20,
          }}
        >
          {/* Lock icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            style={{ marginRight: 8 }}
          >
            <path
              d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
              stroke="#28c840"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
              stroke="#28c840"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: 13,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {url}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          backgroundColor: colors.background,
        }}
      >
        {children}
      </div>
    </div>
  );
};
