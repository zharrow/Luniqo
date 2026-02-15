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
import { KPIWidget } from "../components/ui/KPIWidget";
import { KineticWord } from "../components/ui/KineticText";

/**
 * Scene 05 - Multi-Site (48-60s)
 * MultiSiteOverview: Sélecteur de site, KPI globaux, Alertes conformité
 * Texte: "Supervision centralisée."
 */

interface SiteCardProps {
  name: string;
  address: string;
  children: number;
  capacity: number;
  status: "ok" | "warning";
  delay: number;
  isSelected?: boolean;
}

const SiteCard: React.FC<SiteCardProps> = ({
  name,
  address,
  children,
  capacity,
  status,
  delay,
  isSelected,
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

  const fillPercent = (children / capacity) * 100;

  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        boxShadow: isSelected ? `0 0 0 3px ${colors.primary}40` : shadows.sm,
        border: `1px solid ${isSelected ? colors.primary : colors.border}`,
        opacity,
        transform: `scale(${Math.max(0.98, scale)})`,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h4
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {name}
            {isSelected && (
              <Badge variant="primary" size="sm">Actif</Badge>
            )}
          </h4>
          <p
            style={{
              fontSize: 12,
              color: `${colors.foreground}60`,
              fontFamily: "system-ui, sans-serif",
              margin: "4px 0 0 0",
            }}
          >
            {address}
          </p>
        </div>
        <Badge variant={status === "ok" ? "success" : "warning"}>
          {status === "ok" ? "Conforme" : "Attention"}
        </Badge>
      </div>

      {/* Capacity bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span
            style={{
              fontSize: 12,
              color: `${colors.foreground}70`,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Taux de remplissage
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {children}/{capacity}
          </span>
        </div>
        <div
          style={{
            height: 8,
            backgroundColor: colors.background,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${fillPercent}%`,
              height: "100%",
              backgroundColor: fillPercent > 80 ? colors.success : colors.primary,
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              color: `${colors.foreground}60`,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            HACCP
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.success,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            100%
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: `${colors.foreground}60`,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Employés
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            8
          </div>
        </div>
      </div>
    </div>
  );
};

const BuildingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="6" x2="9" y2="6" />
    <line x1="15" y1="6" x2="15" y2="6" />
    <line x1="9" y1="10" x2="9" y2="10" />
    <line x1="15" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="9" y2="14" />
    <line x1="15" y1="14" x2="15" y2="14" />
    <line x1="9" y1="22" x2="9" y2="18" />
    <line x1="15" y1="22" x2="15" y2="18" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const Scene11_MultiSite: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sites = [
    { name: "Les Petits Pas", address: "12 rue des Lilas, Paris", children: 24, capacity: 30, status: "ok" as const },
    { name: "Arc-en-Ciel", address: "8 avenue Mozart, Lyon", children: 18, capacity: 20, status: "ok" as const },
    { name: "Les Coccinelles", address: "5 place du Marché, Nantes", children: 15, capacity: 25, status: "warning" as const },
  ];

  // Delays
  const sidebarDelay = 0;
  const headerDelay = 15;
  const kpiDelay = 30;
  const site1Delay = 60;
  const site2Delay = 80;
  const site3Delay = 100;
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
  const fadeOut = interpolate(frame, [320, 360], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text animation now handled by KineticWord

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Browser frame with multi-site view */}
      <BrowserFrame width={1600} height={900} url="app.luniqo.com/sites">
        <div style={{ display: "flex", height: "100%" }}>
          {/* Sidebar */}
          <div
            style={{
              opacity: getOpacity(sidebarDelay),
              transform: `translateX(${interpolate(frame, [sidebarDelay, sidebarDelay + 30], [-260, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
          >
            <Sidebar activeIndex={4} />
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
                  <span>🏢</span> Mes établissements
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: `${colors.foreground}70`,
                    fontFamily: "system-ui, sans-serif",
                    margin: "4px 0 0 0",
                  }}
                >
                  Vue d'ensemble de vos 3 crèches
                </p>
              </div>
              <Badge variant="success">Toutes conformes</Badge>
            </div>

            {/* Global KPIs */}
            <div
              style={{
                display: "flex",
                gap: 20,
                opacity: getOpacity(kpiDelay),
                transform: `translateY(${getTranslateY(kpiDelay)}px)`,
              }}
            >
              <KPIWidget
                title="Total établissements"
                value="3"
                icon={<BuildingIcon />}
                color={colors.primary}
                style={{ flex: 1 }}
              />
              <KPIWidget
                title="Enfants inscrits"
                value="57"
                subtitle="sur 75 places"
                icon={<UsersIcon />}
                color={colors.secondary}
                style={{ flex: 1 }}
              />
              <KPIWidget
                title="Conformité globale"
                value="98%"
                icon={<ShieldIcon />}
                trend={{ value: "+3%", positive: true }}
                color={colors.success}
                style={{ flex: 1 }}
              />
            </div>

            {/* Sites grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, flex: 1 }}>
              <SiteCard {...sites[0]} delay={site1Delay} isSelected />
              <SiteCard {...sites[1]} delay={site2Delay} />
              <SiteCard {...sites[2]} delay={site3Delay} />
            </div>
          </div>
        </div>
      </BrowserFrame>

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
        }}
      >
        <KineticWord
          startFrame={textDelay}
          fontSize={36}
          fontWeight={700}
          color={colors.primary}
          direction="scale"
          impact
          glow
          glowColor={colors.primary}
        >
          Supervision centralisée.
        </KineticWord>
      </div>
    </AbsoluteFill>
  );
};
