import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors, shadows, springConfig } from "../colors";
import { BrowserFrame } from "../components/layout/BrowserFrame";
import { Sidebar } from "../components/ui/Sidebar";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { KineticWord } from "../components/ui/KineticText";

/**
 * Scene 07 - Employee Management
 * Gestion des employés: liste, accès aux salles, rôles
 * Texte: "Équipe organisée. Accès contrôlés."
 */

interface EmployeeRowProps {
  name: string;
  initials: string;
  role: string;
  rooms: string[];
  status: "active" | "away" | "offline";
  delay: number;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  name,
  initials,
  role,
  rooms,
  status,
  delay,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = interpolate(frame, [delay, delay + 20], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const statusColors = {
    active: colors.success,
    away: "#f59e0b",
    offline: colors.border,
  };

  const statusLabels = {
    active: "En service",
    away: "Pause",
    offline: "Absent",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px 20px",
        backgroundColor: colors.card,
        borderRadius: 14,
        gap: 16,
        opacity,
        transform: `translateX(${translateX}px)`,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Avatar */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: colors.secondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {initials}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: statusColors[status],
            border: `2px solid ${colors.card}`,
          }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: `${colors.foreground}60`,
            fontFamily: "system-ui, sans-serif",
            marginTop: 2,
          }}
        >
          {role}
        </div>
      </div>

      {/* Rooms access */}
      <div style={{ display: "flex", gap: 6 }}>
        {rooms.map((room) => (
          <Badge key={room} variant="default" size="sm">
            {room}
          </Badge>
        ))}
      </div>

      {/* Status */}
      <Badge
        variant={status === "active" ? "success" : status === "away" ? "warning" : "default"}
      >
        {statusLabels[status]}
      </Badge>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.foreground} strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: string;
  color: string;
  delay: number;
}> = ({ label, value, icon, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = spring({
    frame: frame - delay,
    fps,
    config: springConfig.smooth,
  });

  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        flex: 1,
        boxShadow: shadows.sm,
        border: `1px solid ${colors.border}`,
        opacity,
        transform: `scale(${Math.max(0.95, scale)})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          {icon}
        </div>
        <div
          style={{
            fontSize: 12,
            color: `${colors.foreground}60`,
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: colors.foreground,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {value}
      </div>
    </div>
  );
};

export const Scene07_EmployeeManagement: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delays
  const sidebarDelay = 0;
  const headerDelay = 15;
  const statsDelay = 30;
  const employee1Delay = 70;
  const employee2Delay = 90;
  const employee3Delay = 110;
  const employee4Delay = 130;
  const textDelay = 180;

  // Animation helpers
  const getOpacity = (delay: number) => interpolate(
    frame,
    [delay, delay + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const getTranslateY = (delay: number) => interpolate(
    frame,
    [delay, delay + 25],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  // Scene exit
  const fadeOut = interpolate(frame, [280, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // UI shrink when text appears
  const uiShrinkStart = textDelay - 20;
  const uiScale = interpolate(frame, [uiShrinkStart, uiShrinkStart + 40], [1, 0.75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const uiTranslateY = interpolate(frame, [uiShrinkStart, uiShrinkStart + 40], [0, -60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const employees = [
    { name: "Marie Dupont", initials: "MD", role: "Éducatrice de jeunes enfants", rooms: ["Papillons", "Coccinelles"], status: "active" as const },
    { name: "Sophie Laurent", initials: "SL", role: "Auxiliaire puéricultrice", rooms: ["Papillons"], status: "active" as const },
    { name: "Thomas Bernard", initials: "TB", role: "Agent d'entretien", rooms: ["Cuisine", "Sanitaires"], status: "away" as const },
    { name: "Emma Martin", initials: "EM", role: "Auxiliaire puéricultrice", rooms: ["Coccinelles"], status: "offline" as const },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Browser frame */}
      <div
        style={{
          transform: `scale(${uiScale}) translateY(${uiTranslateY}px)`,
          transformOrigin: "center top",
        }}
      >
        <BrowserFrame width={1600} height={900} url="app.luniqo.com/users">
          <div style={{ display: "flex", height: "100%" }}>
            {/* Sidebar */}
            <div
              style={{
                opacity: getOpacity(sidebarDelay),
                transform: `translateX(${interpolate(frame, [sidebarDelay, sidebarDelay + 30], [-260, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}
            >
              <Sidebar activeIndex={3} />
            </div>

            {/* Main content */}
            <div
              style={{
                flex: 1,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                gap: 24,
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: getOpacity(headerDelay),
                  transform: `translateY(${getTranslateY(headerDelay)}px)`,
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: colors.foreground,
                      fontFamily: "system-ui, sans-serif",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span>👥</span> Gestion des employés
                  </h1>
                  <p
                    style={{
                      fontSize: 14,
                      color: `${colors.foreground}70`,
                      fontFamily: "system-ui, sans-serif",
                      margin: "4px 0 0 0",
                    }}
                  >
                    Équipe de la crèche Les Petits Pas
                  </p>
                </div>
                <button
                  style={{
                    padding: "12px 24px",
                    backgroundColor: colors.primary,
                    color: colors.card,
                    border: "none",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "system-ui, sans-serif",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>+</span> Nouvel employé
                </button>
              </div>

              {/* Stats */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  opacity: getOpacity(statsDelay),
                  transform: `translateY(${getTranslateY(statsDelay)}px)`,
                }}
              >
                <StatCard label="Total employés" value="8" icon="👤" color={colors.primary} delay={statsDelay} />
                <StatCard label="En service" value="5" icon="✅" color={colors.success} delay={statsDelay + 10} />
                <StatCard label="En pause" value="2" icon="☕" color="#f59e0b" delay={statsDelay + 20} />
                <StatCard label="Absents" value="1" icon="🏠" color={colors.border} delay={statsDelay + 30} />
              </div>

              {/* Employees list */}
              <Card style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: colors.foreground,
                      fontFamily: "system-ui, sans-serif",
                      margin: 0,
                    }}
                  >
                    Liste des employés
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      backgroundColor: colors.background,
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`${colors.foreground}60`} strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span
                      style={{
                        fontSize: 13,
                        color: `${colors.foreground}60`,
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      Rechercher...
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {employees.map((employee, index) => (
                    <EmployeeRow
                      key={employee.name}
                      {...employee}
                      delay={[employee1Delay, employee2Delay, employee3Delay, employee4Delay][index]}
                    />
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </BrowserFrame>
      </div>

      {/* Bottom kinetic text */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          gap: 40,
        }}
      >
        <KineticWord
          startFrame={textDelay}
          fontSize={36}
          fontWeight={600}
          color={colors.foreground}
          direction="left"
          float={false}
        >
          Équipe organisée.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 35}
          fontSize={36}
          fontWeight={700}
          color={colors.primary}
          direction="right"
          impact
          glow
          glowColor={colors.primary}
        >
          Accès contrôlés.
        </KineticWord>
      </div>
    </AbsoluteFill>
  );
};
