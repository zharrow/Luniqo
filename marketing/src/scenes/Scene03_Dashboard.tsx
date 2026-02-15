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
import { KPIWidget } from "../components/ui/KPIWidget";
import { ChartCard } from "../components/ui/ChartCard";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { KineticWord } from "../components/ui/KineticText";
import { BeatMoment } from "../components/transitions";

/**
 * Scene 03 - Dashboard (16-32s)
 * DashboardOverview: Sidebar pastel, 3 KPI cards, Graphique taux de remplissage, Bloc alertes conformité
 * Texte: "Vision globale. Pilotage multi-sites. Indicateurs en temps réel."
 */

// Simple icons
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const AlertItem: React.FC<{ text: string; type: "success" | "warning"; delay: number }> = ({ text, type, delay }) => {
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
        gap: 12,
        padding: "12px 16px",
        backgroundColor: type === "success" ? `${colors.success}15` : "#fef3c7",
        borderRadius: 10,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <span style={{ fontSize: 16 }}>{type === "success" ? "✓" : "⚠️"}</span>
      <span
        style={{
          fontSize: 13,
          color: colors.foreground,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 500,
        }}
      >
        {text}
      </span>
      <Badge variant={type === "success" ? "success" : "warning"} size="sm" style={{ marginLeft: "auto" }}>
        {type === "success" ? "Conforme" : "Attention"}
      </Badge>
    </div>
  );
};

export const Scene03_Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stagger delays for elements
  const sidebarDelay = 0;
  const kpi1Delay = 20;
  const kpi2Delay = 30;
  const kpi3Delay = 40;
  const chartDelay = 50;
  const alertsDelay = 70;
  const textDelay = 120;

  // Animation helpers
  const getEntrySpring = (delay: number) => spring({
    frame: frame - delay,
    fps,
    config: springConfig.smooth,
  });

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

  // Scene entry from blur
  const blurIn = interpolate(frame, [0, 20], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        filter: `blur(${blurIn}px)`,
        opacity: fadeOut,
      }}
    >
      {/* Browser frame with dashboard - shrinks and moves up */}
      <div
        style={{
          transform: `scale(${uiScale}) translateY(${uiTranslateY}px)`,
          transformOrigin: "center top",
        }}
      >
        <BrowserFrame width={1600} height={900} url="app.luniqo.com/dashboard">
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
                opacity: getOpacity(kpi1Delay - 10),
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
                  }}
                >
                  Tableau de bord
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: `${colors.foreground}70`,
                    fontFamily: "system-ui, sans-serif",
                    margin: "4px 0 0 0",
                  }}
                >
                  Bienvenue, Marie • Crèche Les Petits Pas
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge variant="success">Tout conforme</Badge>
              </div>
            </div>

            {/* KPI Row */}
            <div style={{ display: "flex", gap: 20 }}>
              <div
                style={{
                  flex: 1,
                  opacity: getOpacity(kpi1Delay),
                  transform: `translateY(${getTranslateY(kpi1Delay)}px)`,
                }}
              >
                <KPIWidget
                  title="Enfants présents"
                  value="24"
                  subtitle="sur 30 places"
                  icon={<UsersIcon />}
                  trend={{ value: "+2", positive: true }}
                  color={colors.primary}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  opacity: getOpacity(kpi2Delay),
                  transform: `translateY(${getTranslateY(kpi2Delay)}px)`,
                }}
              >
                <KPIWidget
                  title="Taux de remplissage"
                  value="80%"
                  subtitle="cette semaine"
                  icon={<ChartIcon />}
                  trend={{ value: "+5%", positive: true }}
                  color={colors.success}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  opacity: getOpacity(kpi3Delay),
                  transform: `translateY(${getTranslateY(kpi3Delay)}px)`,
                }}
              >
                <KPIWidget
                  title="Conformité HACCP"
                  value="100%"
                  subtitle="7 jours consécutifs"
                  icon={<ShieldIcon />}
                  color={colors.success}
                />
              </div>
            </div>

            {/* Charts and Alerts Row */}
            <div style={{ display: "flex", gap: 20, flex: 1 }}>
              {/* Chart */}
              <div
                style={{
                  flex: 2,
                  opacity: getOpacity(chartDelay),
                  transform: `translateY(${getTranslateY(chartDelay)}px)`,
                }}
              >
                <ChartCard
                  title="Taux de remplissage"
                  subtitle="Évolution sur 5 jours"
                  data={[75, 82, 78, 85, 80]}
                  style={{ height: "100%" }}
                />
              </div>

              {/* Alerts */}
              <div
                style={{
                  flex: 1,
                  opacity: getOpacity(alertsDelay),
                  transform: `translateY(${getTranslateY(alertsDelay)}px)`,
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
                    }}
                  >
                    Alertes conformité
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <AlertItem text="Températures validées" type="success" delay={alertsDelay + 15} />
                    <AlertItem text="Traçabilité à jour" type="success" delay={alertsDelay + 25} />
                    <AlertItem text="Nettoyage à compléter" type="warning" delay={alertsDelay + 35} />
                  </div>
                </Card>
              </div>
            </div>
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
          Vision globale.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 30}
          fontSize={42}
          fontWeight={600}
          color={colors.foreground}
          direction="up"
          float={false}
        >
          Pilotage multi-sites.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 60}
          fontSize={42}
          fontWeight={700}
          color={colors.primary}
          direction="right"
          impact
          glow
          glowColor={colors.primary}
        >
          Indicateurs en temps réel.
        </KineticWord>
      </div>

      {/* Beat moment - "Tout sous contrôle" */}
      <BeatMoment
        text="Tout sous contrôle."
        startFrame={280}
        duration={50}
        color={colors.primary}
        style="slam"
      />
    </AbsoluteFill>
  );
};
