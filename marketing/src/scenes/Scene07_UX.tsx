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
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { KPIWidget } from "../components/ui/KPIWidget";

/**
 * Scene 07 - UX Premium (70-78s)
 * Zoom sur interface. Focus: Coins 16px, Ombres subtiles, Espaces blancs
 * Texte: "Clair. Structuré. Professionnel."
 */

// Component showcase with zoom effect
interface UIShowcaseProps {
  delay: number;
  zoomProgress: number;
}

const UIShowcase: React.FC<UIShowcaseProps> = ({ delay, zoomProgress }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = spring({
    frame: frame - delay,
    fps,
    config: springConfig.gentle,
  });

  // Zoom to specific elements based on progress
  const elementZoom = interpolate(zoomProgress, [0, 0.3, 0.6, 1], [1, 1.3, 1.3, 1], {
    extrapolateRight: "clamp",
  });

  const elementX = interpolate(zoomProgress, [0, 0.3, 0.6, 1], [0, -100, 100, 0], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const elementY = interpolate(zoomProgress, [0, 0.3, 0.6, 1], [0, -50, 50, 0], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <div
      style={{
        display: "flex",
        gap: 40,
        opacity,
        transform: `scale(${Math.max(0.95, scale) * elementZoom}) translate(${elementX}px, ${elementY}px)`,
        padding: 60,
      }}
    >
      {/* Card example */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Card padding={32}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: `${colors.primary}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: colors.foreground,
                  fontFamily: "system-ui, sans-serif",
                  margin: 0,
                }}
              >
                Module HACCP
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: `${colors.foreground}60`,
                  fontFamily: "system-ui, sans-serif",
                  margin: "4px 0 0 0",
                }}
              >
                Conformité alimentaire
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Badge variant="success">Actif</Badge>
            <Badge variant="primary">Premium</Badge>
          </div>
        </Card>

        {/* Design callout - Border radius */}
        <div
          style={{
            position: "relative",
            padding: "12px 20px",
            backgroundColor: `${colors.accent}50`,
            borderRadius: 12,
            borderLeft: `4px solid ${colors.primary}`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ↑ Border radius 16px
          </span>
        </div>
      </div>

      {/* KPI example */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <KPIWidget
          title="Conformité"
          value="100%"
          subtitle="Cette semaine"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
          color={colors.success}
          style={{ minWidth: 220 }}
        />

        {/* Design callout - Shadows */}
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: `${colors.accent}50`,
            borderRadius: 12,
            borderLeft: `4px solid ${colors.primary}`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ↑ Ombres subtiles
          </span>
        </div>
      </div>

      {/* Spacing example */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Card padding={32} style={{ minWidth: 280 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                height: 48,
                backgroundColor: colors.background,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: `${colors.foreground}60`,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Champ de saisie
              </span>
            </div>

            <div
              style={{
                height: 48,
                backgroundColor: colors.background,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: `${colors.foreground}60`,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Sélection
              </span>
            </div>

            <button
              style={{
                height: 48,
                backgroundColor: colors.primary,
                color: colors.card,
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              Valider
            </button>
          </div>
        </Card>

        {/* Design callout - Whitespace */}
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: `${colors.accent}50`,
            borderRadius: 12,
            borderLeft: `4px solid ${colors.primary}`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.foreground,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ↑ Espaces généreux
          </span>
        </div>
      </div>
    </div>
  );
};

export const Scene07_UX: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing
  const showcaseDelay = 20;
  const textDelay = 120;

  // Zoom animation progress (0 to 1 over scene duration)
  const zoomProgress = interpolate(frame, [40, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Scene exit
  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text animations - appear one by one
  const text1Opacity = interpolate(frame, [textDelay, textDelay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const text2Opacity = interpolate(frame, [textDelay + 25, textDelay + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const text3Opacity = interpolate(frame, [textDelay + 50, textDelay + 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text scale spring
  const text1Scale = spring({ frame: frame - textDelay, fps, config: springConfig.gentle });
  const text2Scale = spring({ frame: frame - (textDelay + 25), fps, config: springConfig.gentle });
  const text3Scale = spring({ frame: frame - (textDelay + 50), fps, config: springConfig.gentle });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* UI Showcase */}
      <UIShowcase delay={showcaseDelay} zoomProgress={zoomProgress} />

      {/* Bottom text */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          gap: 60,
        }}
      >
        <span
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
            opacity: text1Opacity,
            transform: `scale(${Math.max(0.95, text1Scale)})`,
            display: "inline-block",
          }}
        >
          Clair.
        </span>
        <span
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
            opacity: text2Opacity,
            transform: `scale(${Math.max(0.95, text2Scale)})`,
            display: "inline-block",
          }}
        >
          Structuré.
        </span>
        <span
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: colors.primary,
            fontFamily: "system-ui, sans-serif",
            opacity: text3Opacity,
            transform: `scale(${Math.max(0.95, text3Scale)})`,
            display: "inline-block",
          }}
        >
          Professionnel.
        </span>
      </div>

      {/* Design system label */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [10, 30], [0, 0.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: `${colors.foreground}60`,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Design System "Douceur Professionnelle"
        </span>
      </div>
    </AbsoluteFill>
  );
};
