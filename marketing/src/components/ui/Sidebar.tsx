import React from "react";
import { colors, shadows } from "../../colors";
import { Img, staticFile } from "remotion";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
}

interface SidebarProps {
  items?: SidebarItem[];
  activeIndex?: number;
  width?: number;
  style?: React.CSSProperties;
}

// Simple icon components
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="2" />
    <line x1="15" y1="22" x2="15" y2="2" />
    <line x1="4" y1="7" x2="9" y2="7" />
    <line x1="15" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="9" y2="12" />
    <line x1="15" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="9" y2="17" />
    <line x1="15" y1="17" x2="20" y2="17" />
  </svg>
);

export const defaultSidebarItems: SidebarItem[] = [
  { icon: <DashboardIcon />, label: "Tableau de bord", active: true },
  { icon: <ShieldIcon />, label: "HACCP", badge: "3" },
  { icon: <UsersIcon />, label: "Enfants" },
  { icon: <CalendarIcon />, label: "Planning" },
  { icon: <BuildingIcon />, label: "Sites" },
];

export const Sidebar: React.FC<SidebarProps> = ({
  items = defaultSidebarItems,
  activeIndex = 0,
  width = 260,
  style,
}) => {
  return (
    <div
      style={{
        width,
        height: "100%",
        backgroundColor: colors.card,
        borderRight: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        ...style,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          marginBottom: 24,
        }}
      >
        <Img
          src={staticFile("luniqo.png")}
          style={{ width: 40, height: 40 }}
        />
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: colors.primary,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Luniqo
        </span>
      </div>

      {/* Navigation items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: isActive ? `${colors.primary}15` : "transparent",
                color: isActive ? colors.primary : colors.foreground,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {item.icon}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "system-ui, sans-serif",
                  flex: 1,
                }}
              >
                {item.label}
              </span>
              {item.badge && (
                <span
                  style={{
                    backgroundColor: colors.secondary,
                    color: colors.foreground,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderTop: `1px solid ${colors.border}`,
          marginTop: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: colors.secondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
            MD
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Marie Dupont
          </div>
          <div
            style={{
              fontSize: 11,
              color: `${colors.foreground}80`,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Directrice
          </div>
        </div>
      </div>
    </div>
  );
};
