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
 * Scene 05 - Cleaning Module
 * Présentation du module nettoyage: salles, tâches, sessions
 * Texte: "Organisation simplifiée. Traçabilité complète."
 */

interface RoomCardProps {
  name: string;
  emoji: string;
  tasks: number;
  completedTasks: number;
  status: "pending" | "in_progress" | "completed";
  delay: number;
}

const RoomCard: React.FC<RoomCardProps> = ({
  name,
  emoji,
  tasks,
  completedTasks,
  status,
  delay,
}) => {
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

  const statusColors = {
    pending: { bg: colors.background, border: colors.border, text: "En attente" },
    in_progress: { bg: `${colors.primary}15`, border: colors.primary, text: "En cours" },
    completed: { bg: `${colors.success}15`, border: colors.success, text: "Terminé" },
  };

  const statusStyle = statusColors[status];
  const progress = (completedTasks / tasks) * 100;

  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        boxShadow: shadows.sm,
        border: `2px solid ${statusStyle.border}`,
        opacity,
        transform: `scale(${Math.max(0.95, scale)})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: statusStyle.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            {emoji}
          </div>
          <div>
            <h4
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: colors.foreground,
                fontFamily: "system-ui, sans-serif",
                margin: 0,
              }}
            >
              {name}
            </h4>
            <p
              style={{
                fontSize: 12,
                color: `${colors.foreground}60`,
                fontFamily: "system-ui, sans-serif",
                margin: "2px 0 0 0",
              }}
            >
              {completedTasks}/{tasks} tâches
            </p>
          </div>
        </div>
        <Badge variant={status === "completed" ? "success" : status === "in_progress" ? "primary" : "default"}>
          {statusStyle.text}
        </Badge>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          backgroundColor: colors.background,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: status === "completed" ? colors.success : colors.primary,
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};

interface TaskTemplateProps {
  name: string;
  frequency: string;
  category: string;
  delay: number;
}

const TaskTemplate: React.FC<TaskTemplateProps> = ({ name, frequency, category, delay }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = interpolate(frame, [delay, delay + 20], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 16px",
        backgroundColor: colors.background,
        borderRadius: 10,
        gap: 12,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: colors.primary,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: colors.foreground,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {name}
      </span>
      <Badge variant="default" size="sm">{category}</Badge>
      <span
        style={{
          fontSize: 11,
          color: `${colors.foreground}60`,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {frequency}
      </span>
    </div>
  );
};

export const Scene05_Cleaning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delays
  const sidebarDelay = 0;
  const headerDelay = 15;
  const roomsDelay = 30;
  const room1Delay = 50;
  const room2Delay = 70;
  const room3Delay = 90;
  const tasksDelay = 120;
  const textDelay = 200;

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
  const fadeOut = interpolate(frame, [320, 360], [1, 0], {
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

  const rooms = [
    { name: "Salle Papillons", emoji: "🦋", tasks: 8, completedTasks: 8, status: "completed" as const },
    { name: "Salle Coccinelles", emoji: "🐞", tasks: 6, completedTasks: 4, status: "in_progress" as const },
    { name: "Cuisine", emoji: "🍳", tasks: 10, completedTasks: 0, status: "pending" as const },
  ];

  const taskTemplates = [
    { name: "Nettoyage des sols", frequency: "Quotidien", category: "Hygiène" },
    { name: "Désinfection des jouets", frequency: "Quotidien", category: "Hygiène" },
    { name: "Nettoyage des sanitaires", frequency: "2x/jour", category: "Sanitaire" },
    { name: "Aération des locaux", frequency: "3x/jour", category: "Bien-être" },
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
        <BrowserFrame width={1600} height={900} url="app.luniqo.com/sessions">
          <div style={{ display: "flex", height: "100%" }}>
            {/* Sidebar */}
            <div
              style={{
                opacity: getOpacity(sidebarDelay),
                transform: `translateX(${interpolate(frame, [sidebarDelay, sidebarDelay + 30], [-260, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}
            >
              <Sidebar activeIndex={0} />
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
                    <span>🧹</span> Sessions de nettoyage
                  </h1>
                  <p
                    style={{
                      fontSize: 14,
                      color: `${colors.foreground}70`,
                      fontFamily: "system-ui, sans-serif",
                      margin: "4px 0 0 0",
                    }}
                  >
                    Jeudi 13 février 2025 • Session du matin
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <Badge variant="primary">3 salles</Badge>
                  <Badge variant="success">12/24 tâches</Badge>
                </div>
              </div>

              {/* Content grid */}
              <div style={{ display: "flex", gap: 24, flex: 1 }}>
                {/* Rooms column */}
                <div
                  style={{
                    flex: 1.2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    opacity: getOpacity(roomsDelay),
                  }}
                >
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: `${colors.foreground}80`,
                      fontFamily: "system-ui, sans-serif",
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Salles à nettoyer
                  </h3>
                  <RoomCard {...rooms[0]} delay={room1Delay} />
                  <RoomCard {...rooms[1]} delay={room2Delay} />
                  <RoomCard {...rooms[2]} delay={room3Delay} />
                </div>

                {/* Tasks templates column */}
                <div
                  style={{
                    flex: 1,
                    opacity: getOpacity(tasksDelay),
                    transform: `translateY(${getTranslateY(tasksDelay)}px)`,
                  }}
                >
                  <Card style={{ height: "100%" }}>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: colors.foreground,
                        fontFamily: "system-ui, sans-serif",
                        margin: "0 0 16px 0",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>📋</span> Tâches standards
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {taskTemplates.map((task, index) => (
                        <TaskTemplate
                          key={task.name}
                          {...task}
                          delay={tasksDelay + 20 + index * 15}
                        />
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
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
          fontSize={38}
          fontWeight={600}
          color={colors.foreground}
          direction="left"
          float={false}
        >
          Organisation simplifiée.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 40}
          fontSize={38}
          fontWeight={700}
          color={colors.primary}
          direction="right"
          impact
          glow
          glowColor={colors.primary}
        >
          Traçabilité complète.
        </KineticWord>
      </div>
    </AbsoluteFill>
  );
};
