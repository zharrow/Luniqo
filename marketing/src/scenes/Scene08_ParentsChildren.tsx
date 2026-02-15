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
 * Scene 08 - Parents & Children Management
 * Gestion des familles: enfants, allergies, contacts d'urgence
 * Texte: "Informations centralisées. Familles rassurées."
 */

interface ChildCardProps {
  name: string;
  age: string;
  room: string;
  photo: string;
  allergies: string[];
  parents: { name: string; phone: string }[];
  delay: number;
}

const ChildCard: React.FC<ChildCardProps> = ({
  name,
  age,
  room,
  photo,
  allergies,
  parents,
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

  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        boxShadow: shadows.sm,
        border: `1px solid ${colors.border}`,
        opacity,
        transform: `scale(${Math.max(0.95, scale)})`,
      }}
    >
      {/* Header with photo */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: colors.secondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
          }}
        >
          {photo}
        </div>
        <div style={{ flex: 1 }}>
          <h4
            style={{
              fontSize: 18,
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
              fontSize: 13,
              color: `${colors.foreground}60`,
              fontFamily: "system-ui, sans-serif",
              margin: "4px 0 0 0",
            }}
          >
            {age} • {room}
          </p>
        </div>
        <Badge variant="success">Présent</Badge>
      </div>

      {/* Allergies */}
      {allergies.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: `${colors.foreground}60`,
              fontFamily: "system-ui, sans-serif",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            ⚠️ Allergies
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {allergies.map((allergy) => (
              <Badge key={allergy} variant="danger" size="sm">
                {allergy}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Parents */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: `${colors.foreground}60`,
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          👨‍👩‍👧 Contacts
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {parents.map((parent) => (
            <div
              key={parent.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                backgroundColor: colors.background,
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: colors.foreground,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {parent.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: colors.primary,
                  fontFamily: "monospace",
                }}
              >
                {parent.phone}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const QuickStatCard: React.FC<{
  icon: string;
  value: string;
  label: string;
  color: string;
  delay: number;
}> = ({ icon, value, label, color, delay }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [delay, delay + 20], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        flex: 1,
        textAlign: "center",
        boxShadow: shadows.sm,
        border: `1px solid ${colors.border}`,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: color,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: `${colors.foreground}60`,
          fontFamily: "system-ui, sans-serif",
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Scene08_ParentsChildren: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delays
  const sidebarDelay = 0;
  const headerDelay = 15;
  const statsDelay = 30;
  const child1Delay = 70;
  const child2Delay = 100;
  const child3Delay = 130;
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

  const children = [
    {
      name: "Lucas Martin",
      age: "2 ans 3 mois",
      room: "Papillons",
      photo: "👦",
      allergies: ["Arachides", "Fruits à coque"],
      parents: [
        { name: "Sophie Martin", phone: "06 12 34 56 78" },
        { name: "Pierre Martin", phone: "06 98 76 54 32" },
      ],
    },
    {
      name: "Emma Dubois",
      age: "1 an 8 mois",
      room: "Coccinelles",
      photo: "👧",
      allergies: [],
      parents: [
        { name: "Claire Dubois", phone: "06 11 22 33 44" },
      ],
    },
    {
      name: "Noah Bernard",
      age: "2 ans 1 mois",
      room: "Papillons",
      photo: "👦",
      allergies: ["Lactose"],
      parents: [
        { name: "Marie Bernard", phone: "06 55 66 77 88" },
        { name: "Thomas Bernard", phone: "06 99 88 77 66" },
      ],
    },
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
        <BrowserFrame width={1600} height={900} url="app.luniqo.com/haccp/children">
          <div style={{ display: "flex", height: "100%" }}>
            {/* Sidebar */}
            <div
              style={{
                opacity: getOpacity(sidebarDelay),
                transform: `translateX(${interpolate(frame, [sidebarDelay, sidebarDelay + 30], [-260, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}
            >
              <Sidebar activeIndex={1} />
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
                    <span>👶</span> Enfants & Familles
                  </h1>
                  <p
                    style={{
                      fontSize: 14,
                      color: `${colors.foreground}70`,
                      fontFamily: "system-ui, sans-serif",
                      margin: "4px 0 0 0",
                    }}
                  >
                    Gestion des inscriptions et informations médicales
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
                  <span>+</span> Nouvel enfant
                </button>
              </div>

              {/* Quick stats */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  opacity: getOpacity(statsDelay),
                }}
              >
                <QuickStatCard icon="👶" value="24" label="Enfants inscrits" color={colors.primary} delay={statsDelay} />
                <QuickStatCard icon="✅" value="22" label="Présents aujourd'hui" color={colors.success} delay={statsDelay + 10} />
                <QuickStatCard icon="⚠️" value="5" label="Allergies signalées" color="#f59e0b" delay={statsDelay + 20} />
                <QuickStatCard icon="👨‍👩‍👧" value="42" label="Parents enregistrés" color={colors.secondary} delay={statsDelay + 30} />
              </div>

              {/* Children grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 20,
                  flex: 1,
                }}
              >
                {children.map((child, index) => (
                  <ChildCard
                    key={child.name}
                    {...child}
                    delay={[child1Delay, child2Delay, child3Delay][index]}
                  />
                ))}
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
          fontSize={36}
          fontWeight={600}
          color={colors.foreground}
          direction="left"
          float={false}
        >
          Informations centralisées.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 40}
          fontSize={36}
          fontWeight={700}
          color={colors.secondary}
          direction="right"
          impact
          glow
          glowColor={colors.secondary}
        >
          Familles rassurées.
        </KineticWord>
      </div>
    </AbsoluteFill>
  );
};
