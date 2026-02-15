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
import { PhoneFrame } from "../components/layout/PhoneFrame";
import { Badge } from "../components/ui/Badge";
import { KineticWord } from "../components/ui/KineticText";

/**
 * Scene 09 - Parent PWA Mobile View
 * Application mobile PWA pour les parents
 * Notifications, planning, repas, communication
 * Texte: "Parents connectés. Sérénité assurée."
 */

interface DayScheduleItemProps {
  time: string;
  activity: string;
  icon: string;
  delay: number;
}

const DayScheduleItem: React.FC<DayScheduleItemProps> = ({ time, activity, icon, delay }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = interpolate(frame, [delay, delay + 15], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        backgroundColor: colors.card,
        borderRadius: 12,
        opacity,
        transform: `translateX(${translateX}px)`,
        boxShadow: shadows.sm,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${colors.primary}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        {icon}
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
          {activity}
        </div>
        <div
          style={{
            fontSize: 11,
            color: `${colors.foreground}60`,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {time}
        </div>
      </div>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: colors.success,
        }}
      />
    </div>
  );
};

const NotificationBadge: React.FC<{ count: number; delay: number }> = ({ count, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 10, stiffness: 200 },
  });

  if (frame < delay) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: "50%",
        backgroundColor: colors.destructive,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        color: colors.card,
        fontFamily: "system-ui, sans-serif",
        transform: `scale(${Math.min(1.2, scale)})`,
        boxShadow: `0 2px 8px ${colors.destructive}60`,
      }}
    >
      {count}
    </div>
  );
};

export const Scene09_ParentPWA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delays
  const phoneDelay = 0;
  const headerDelay = 20;
  const childCardDelay = 40;
  const notifDelay = 60;
  const scheduleDelay = 80;
  const mealDelay = 140;
  const navDelay = 170;
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

  const phoneScale = spring({
    frame: frame - phoneDelay,
    fps,
    config: springConfig.smooth,
  });

  // Scene exit
  const fadeOut = interpolate(frame, [280, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scheduleItems = [
    { time: "08:30", activity: "Arrivée à la crèche", icon: "🏠" },
    { time: "09:00", activity: "Activité créative", icon: "🎨" },
    { time: "10:30", activity: "Collation", icon: "🍎" },
    { time: "12:00", activity: "Déjeuner", icon: "🍽️" },
    { time: "13:00", activity: "Sieste", icon: "😴" },
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
      {/* Phone frame */}
      <div
        style={{
          transform: `scale(${Math.max(0.95, phoneScale)})`,
          opacity: getOpacity(phoneDelay),
        }}
      >
        <PhoneFrame width={380} height={780}>
          <div
            style={{
              height: "100%",
              backgroundColor: colors.background,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                backgroundColor: colors.primary,
                opacity: getOpacity(headerDelay),
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: `${colors.card}90`,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Bonjour Sophie 👋
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: colors.card,
                      fontFamily: "system-ui, sans-serif",
                      marginTop: 2,
                    }}
                  >
                    Les Petits Pas
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: `${colors.card}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.card} strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <NotificationBadge count={2} delay={notifDelay} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
              {/* Child card */}
              <div
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: shadows.sm,
                  opacity: getOpacity(childCardDelay),
                  transform: `translateY(${getTranslateY(childCardDelay)}px)`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: colors.secondary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                  }}
                >
                  👦
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: colors.foreground,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Lucas Martin
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: `${colors.foreground}60`,
                      fontFamily: "system-ui, sans-serif",
                      marginTop: 2,
                    }}
                  >
                    Salle Papillons • 2 ans 3 mois
                  </div>
                </div>
                <Badge variant="success" size="sm">Présent</Badge>
              </div>

              {/* Today's schedule */}
              <div
                style={{
                  opacity: getOpacity(scheduleDelay),
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: colors.foreground,
                    fontFamily: "system-ui, sans-serif",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  📅 Aujourd'hui
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {scheduleItems.map((item, index) => (
                    <DayScheduleItem
                      key={item.time}
                      {...item}
                      delay={scheduleDelay + 15 + index * 12}
                    />
                  ))}
                </div>
              </div>

              {/* Meal info */}
              <div
                style={{
                  backgroundColor: `${colors.success}15`,
                  borderRadius: 14,
                  padding: 14,
                  opacity: getOpacity(mealDelay),
                  transform: `translateY(${getTranslateY(mealDelay)}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.foreground,
                    fontFamily: "system-ui, sans-serif",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  🍽️ Menu du jour
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: `${colors.foreground}80`,
                    fontFamily: "system-ui, sans-serif",
                    lineHeight: 1.5,
                  }}
                >
                  Purée de carottes, Poulet grillé, Compote de pommes
                </div>
                <Badge variant="success" size="sm" style={{ marginTop: 8 }}>
                  ✓ Compatible allergies Lucas
                </Badge>
              </div>
            </div>

            {/* Bottom navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                padding: "12px 20px 24px",
                backgroundColor: colors.card,
                borderTop: `1px solid ${colors.border}`,
                opacity: getOpacity(navDelay),
              }}
            >
              {[
                { icon: "🏠", label: "Accueil", active: true },
                { icon: "📅", label: "Planning", active: false },
                { icon: "💬", label: "Messages", active: false },
                { icon: "👤", label: "Profil", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    opacity: item.active ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: item.active ? colors.primary : colors.foreground,
                      fontWeight: item.active ? 600 : 400,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PhoneFrame>
      </div>

      {/* Bottom kinetic text */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          gap: 50,
        }}
      >
        <KineticWord
          startFrame={textDelay}
          fontSize={32}
          fontWeight={600}
          color={colors.foreground}
          direction="left"
          float={false}
        >
          Parents connectés.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 30}
          fontSize={32}
          fontWeight={700}
          color={colors.success}
          direction="right"
          impact
          glow
          glowColor={colors.success}
        >
          Sérénité assurée.
        </KineticWord>
      </div>
    </AbsoluteFill>
  );
};
