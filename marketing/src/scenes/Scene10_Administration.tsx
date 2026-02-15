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
 * Scene 10 - Administration & Billing
 * Gestion administrative: facturation, contrats, statistiques
 * Texte: "Gestion simplifiée. Facturation automatisée."
 */

interface InvoiceRowProps {
  family: string;
  child: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
  date: string;
  delay: number;
}

const InvoiceRow: React.FC<InvoiceRowProps> = ({
  family,
  child,
  amount,
  status,
  date,
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

  const statusConfig = {
    paid: { color: colors.success, label: "Payée", icon: "✓" },
    pending: { color: "#f59e0b", label: "En attente", icon: "⏳" },
    overdue: { color: colors.destructive, label: "En retard", icon: "!" },
  };

  const config = statusConfig[status];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 18px",
        backgroundColor: colors.card,
        borderRadius: 12,
        gap: 16,
        opacity,
        transform: `translateX(${translateX}px)`,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Family */}
      <div style={{ flex: 1.5 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {family}
        </div>
        <div
          style={{
            fontSize: 12,
            color: `${colors.foreground}60`,
            fontFamily: "system-ui, sans-serif",
            marginTop: 2,
          }}
        >
          {child}
        </div>
      </div>

      {/* Date */}
      <div
        style={{
          flex: 1,
          fontSize: 13,
          color: `${colors.foreground}70`,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {date}
      </div>

      {/* Amount */}
      <div
        style={{
          flex: 0.8,
          fontSize: 15,
          fontWeight: 600,
          color: colors.foreground,
          fontFamily: "system-ui, sans-serif",
          textAlign: "right",
        }}
      >
        {amount}
      </div>

      {/* Status */}
      <div style={{ width: 100 }}>
        <Badge
          variant={status === "paid" ? "success" : status === "pending" ? "warning" : "danger"}
        >
          {config.icon} {config.label}
        </Badge>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.foreground} strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.foreground} strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const RevenueChart: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const months = ["Sep", "Oct", "Nov", "Déc", "Jan", "Fév"];
  const values = [65, 78, 82, 88, 92, 95];
  const maxValue = 100;

  return (
    <Card
      style={{
        height: "100%",
        opacity,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
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
          <span>📊</span> Évolution du CA
        </h3>
        <Badge variant="success">+12% ce mois</Badge>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 160, gap: 12 }}>
        {months.map((month, index) => {
          const barDelay = delay + 30 + index * 10;
          const barHeight = spring({
            frame: frame - barDelay,
            fps,
            config: { damping: 20, stiffness: 80 },
          });

          return (
            <div
              key={month}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 140,
                  backgroundColor: colors.background,
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${(values[index] / maxValue) * 100 * Math.min(1, barHeight)}%`,
                    backgroundColor: index === months.length - 1 ? colors.primary : `${colors.primary}60`,
                    borderRadius: "8px 8px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: `${colors.foreground}60`,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {month}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const EuroIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M14.5 9.5C14 8.5 13 8 12 8c-2 0-3.5 1.5-3.5 4s1.5 4 3.5 4c1 0 2-0.5 2.5-1.5" />
    <path d="M7 11h5M7 13h5" />
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const Scene10_Administration: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delays
  const sidebarDelay = 0;
  const headerDelay = 15;
  const kpiDelay = 30;
  const chartDelay = 70;
  const invoice1Delay = 110;
  const invoice2Delay = 130;
  const invoice3Delay = 150;
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
  const fadeOut = interpolate(frame, [300, 330], [1, 0], {
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

  const invoices = [
    { family: "Famille Martin", child: "Lucas M.", amount: "485,00 €", status: "paid" as const, date: "01/02/2025" },
    { family: "Famille Dubois", child: "Emma D.", amount: "520,00 €", status: "pending" as const, date: "01/02/2025" },
    { family: "Famille Bernard", child: "Noah B.", amount: "495,00 €", status: "overdue" as const, date: "15/01/2025" },
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
        <BrowserFrame width={1600} height={900} url="app.luniqo.com/admin/billing">
          <div style={{ display: "flex", height: "100%" }}>
            {/* Sidebar */}
            <div
              style={{
                opacity: getOpacity(sidebarDelay),
                transform: `translateX(${interpolate(frame, [sidebarDelay, sidebarDelay + 30], [-260, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}
            >
              <Sidebar activeIndex={5} />
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
                    <span>💼</span> Administration & Facturation
                  </h1>
                  <p
                    style={{
                      fontSize: 14,
                      color: `${colors.foreground}70`,
                      fontFamily: "system-ui, sans-serif",
                      margin: "4px 0 0 0",
                    }}
                  >
                    Gestion financière • Février 2025
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    style={{
                      padding: "12px 20px",
                      backgroundColor: colors.card,
                      color: colors.foreground,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: "system-ui, sans-serif",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    📥 Exporter
                  </button>
                  <button
                    style={{
                      padding: "12px 20px",
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
                    + Nouvelle facture
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  opacity: getOpacity(kpiDelay),
                  transform: `translateY(${getTranslateY(kpiDelay)}px)`,
                }}
              >
                <KPIWidget
                  title="CA mensuel"
                  value="12 450 €"
                  icon={<EuroIcon />}
                  trend={{ value: "+8%", positive: true }}
                  color={colors.success}
                  style={{ flex: 1 }}
                />
                <KPIWidget
                  title="Factures émises"
                  value="24"
                  icon={<FileIcon />}
                  subtitle="ce mois"
                  color={colors.primary}
                  style={{ flex: 1 }}
                />
                <KPIWidget
                  title="Taux de recouvrement"
                  value="94%"
                  icon={<CheckIcon />}
                  trend={{ value: "+2%", positive: true }}
                  color={colors.success}
                  style={{ flex: 1 }}
                />
              </div>

              {/* Content grid */}
              <div style={{ display: "flex", gap: 24, flex: 1 }}>
                {/* Revenue chart */}
                <div style={{ flex: 1 }}>
                  <RevenueChart delay={chartDelay} />
                </div>

                {/* Recent invoices */}
                <div style={{ flex: 1.2 }}>
                  <Card style={{ height: "100%" }}>
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
                        <span>📄</span> Dernières factures
                      </h3>
                      <Badge variant="primary">24 factures</Badge>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {invoices.map((invoice, index) => (
                        <InvoiceRow
                          key={invoice.family}
                          {...invoice}
                          delay={[invoice1Delay, invoice2Delay, invoice3Delay][index]}
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
          fontSize={36}
          fontWeight={600}
          color={colors.foreground}
          direction="left"
          float={false}
        >
          Gestion simplifiée.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 40}
          fontSize={36}
          fontWeight={700}
          color={colors.success}
          direction="right"
          impact
          glow
          glowColor={colors.success}
        >
          Facturation automatisée.
        </KineticWord>
      </div>
    </AbsoluteFill>
  );
};
