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
import { TableMock } from "../components/ui/TableMock";
import { KineticWord } from "../components/ui/KineticText";
import { BeatMoment } from "../components/transitions";

/**
 * Scene 04 - HACCP Focus (32-48s)
 * HACCPCompliancePanel: Journal horodaté, Températures validées, Allergies signalées, Badge "Conforme"
 * Texte: "Traçabilité complète. Historique sécurisé. Contrôles simplifiés."
 */

// Temperature log entry
interface TempEntry {
  time: string;
  equipment: string;
  temp: string;
  status: "ok" | "warning";
}

const TemperatureLog: React.FC<{ entries: TempEntry[]; delay: number }> = ({ entries, delay }) => {
  const frame = useCurrentFrame();

  return (
    <Card style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🌡️</span> Relevés de température
        </h3>
        <Badge variant="success">Tous conformes</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map((entry, index) => {
          const entryDelay = delay + index * 12;
          const opacity = interpolate(frame, [entryDelay, entryDelay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateX = interpolate(frame, [entryDelay, entryDelay + 20], [30, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                backgroundColor: colors.background,
                borderRadius: 10,
                gap: 16,
                opacity,
                transform: `translateX(${translateX}px)`,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: `${colors.foreground}70`,
                  fontFamily: "monospace",
                  width: 50,
                }}
              >
                {entry.time}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: colors.foreground,
                  fontFamily: "system-ui, sans-serif",
                  flex: 1,
                }}
              >
                {entry.equipment}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: entry.status === "ok" ? colors.success : "#f59e0b",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {entry.temp}
              </span>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: entry.status === "ok" ? `${colors.success}20` : "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 12 }}>{entry.status === "ok" ? "✓" : "⚠"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// Allergy alert panel
const AllergyPanel: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = spring({
    frame: frame - delay,
    fps,
    config: springConfig.smooth,
  });

  const allergies = [
    { child: "Lucas M.", allergies: ["Arachides", "Fruits à coque"], severity: "severe" },
    { child: "Emma D.", allergies: ["Lactose"], severity: "moderate" },
    { child: "Noah P.", allergies: ["Gluten"], severity: "moderate" },
  ];

  return (
    <Card
      style={{
        opacity,
        transform: `scale(${Math.max(0.98, scale)})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>⚠️</span> Allergies signalées
        </h3>
        <Badge variant="warning">{allergies.length} enfants</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {allergies.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 14px",
              backgroundColor: item.severity === "severe" ? "#fef2f2" : "#fffbeb",
              borderRadius: 10,
              borderLeft: `3px solid ${item.severity === "severe" ? colors.destructive : "#f59e0b"}`,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: colors.secondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: colors.foreground,
              }}
            >
              {item.child.split(" ").map(n => n[0]).join("")}
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
                {item.child}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {item.allergies.map((allergy, i) => (
                  <Badge key={i} variant={item.severity === "severe" ? "danger" : "warning"} size="sm">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Compliance badge animated
const ComplianceBadge: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rotation = interpolate(frame, [delay, delay + 30], [-10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        backgroundColor: colors.success,
        color: colors.card,
        padding: "16px 28px",
        borderRadius: 16,
        boxShadow: `0 8px 30px ${colors.success}40`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity,
        transform: `scale(${Math.max(0, scale)}) rotate(${rotation}deg)`,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={colors.card} fillOpacity="0.2" />
        <path
          d="M8 12L11 15L16 9"
          stroke={colors.card}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          100% Conforme
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "system-ui, sans-serif",
            opacity: 0.9,
          }}
        >
          Dernière vérification: il y a 2h
        </div>
      </div>
    </div>
  );
};

export const Scene04_HACCP: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tempEntries: TempEntry[] = [
    { time: "08:15", equipment: "Frigo principal", temp: "4.2°C", status: "ok" },
    { time: "08:20", equipment: "Frigo desserts", temp: "3.8°C", status: "ok" },
    { time: "08:25", equipment: "Congélateur", temp: "-18.5°C", status: "ok" },
    { time: "12:30", equipment: "Frigo principal", temp: "4.1°C", status: "ok" },
  ];

  // Delays
  const sidebarDelay = 0;
  const headerDelay = 15;
  const tempDelay = 30;
  const allergyDelay = 80;
  const badgeDelay = 100;
  const textDelay = 140;

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
  const fadeOut = interpolate(frame, [440, 480], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text animations now handled by KineticWord component

  // UI shrink and move up when text appears
  const uiShrinkStart = textDelay - 20; // Start shrinking before text appears
  const uiScale = interpolate(frame, [uiShrinkStart, uiShrinkStart + 40], [1, 0.72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const uiTranslateY = interpolate(frame, [uiShrinkStart, uiShrinkStart + 40], [0, -80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Browser frame with HACCP panel - shrinks and moves up */}
      <div
        style={{
          transform: `scale(${uiScale}) translateY(${uiTranslateY}px)`,
          transformOrigin: "center top",
        }}
      >
        <BrowserFrame width={1600} height={900} url="app.luniqo.com/haccp">
        <div style={{ display: "flex", height: "100%", position: "relative" }}>
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
              position: "relative",
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
                  <span>🛡️</span> Module HACCP
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: `${colors.foreground}70`,
                    fontFamily: "system-ui, sans-serif",
                    margin: "4px 0 0 0",
                  }}
                >
                  Journal de traçabilité • Aujourd'hui
                </p>
              </div>
            </div>

            {/* Content grid */}
            <div style={{ display: "flex", gap: 24, flex: 1 }}>
              {/* Temperature log */}
              <div
                style={{
                  flex: 1,
                  opacity: getOpacity(tempDelay),
                  transform: `translateY(${getTranslateY(tempDelay)}px)`,
                }}
              >
                <TemperatureLog entries={tempEntries} delay={tempDelay + 20} />
              </div>

              {/* Allergy panel */}
              <div
                style={{
                  flex: 1,
                  opacity: getOpacity(allergyDelay),
                  transform: `translateY(${getTranslateY(allergyDelay)}px)`,
                }}
              >
                <AllergyPanel delay={allergyDelay} />
              </div>
            </div>

            {/* Compliance badge */}
            <ComplianceBadge delay={badgeDelay} />
          </div>
        </div>
      </BrowserFrame>
      </div>

      {/* Bottom kinetic text - larger and more prominent */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
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
          fontSize={42}
          fontWeight={600}
          color={colors.foreground}
          direction="left"
          float={false}
        >
          Traçabilité complète.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 40}
          fontSize={42}
          fontWeight={600}
          color={colors.foreground}
          direction="up"
          float={false}
        >
          Historique sécurisé.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 80}
          fontSize={42}
          fontWeight={700}
          color={colors.success}
          direction="right"
          impact
          glow
          glowColor={colors.success}
        >
          Contrôles simplifiés.
        </KineticWord>
      </div>

      {/* Beat moment - "100% Conforme" */}
      <BeatMoment
        text="100% Conforme."
        startFrame={300}
        duration={50}
        color={colors.success}
        style="slam"
      />
    </AbsoluteFill>
  );
};
