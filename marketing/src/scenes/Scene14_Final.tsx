import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Img,
  staticFile,
} from "remotion";
import { colors, shadows, springConfig } from "../colors";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { KineticWord } from "../components/ui/KineticText";

/**
 * Scene 08 - Final (78-85s)
 * Split screen: HACCP, Dashboard, Planning
 * Texte final: "Luniqo - La conformité maîtrisée."
 */

// Mini preview cards for split screen
interface PreviewCardProps {
  title: string;
  icon: string;
  color: string;
  delay: number;
  position: "left" | "center" | "right";
}

const PreviewCard: React.FC<PreviewCardProps> = ({ title, icon, color, delay, position }) => {
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

  // Different entry directions based on position
  const translateX = interpolate(
    frame,
    [delay, delay + 30],
    [position === "left" ? -50 : position === "right" ? 50 : 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const translateY = interpolate(
    frame,
    [delay, delay + 30],
    [30, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  return (
    <div
      style={{
        opacity,
        transform: `scale(${Math.max(0.95, scale)}) translate(${translateX}px, ${translateY}px)`,
      }}
    >
      <Card padding={24} style={{ minWidth: 340, minHeight: 200 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: `${color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            {icon}
          </div>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: colors.foreground,
                fontFamily: "system-ui, sans-serif",
                margin: 0,
              }}
            >
              {title}
            </h3>
            <Badge variant="success" size="sm" style={{ marginTop: 4 }}>
              Conforme
            </Badge>
          </div>
        </div>

        {/* Mock content lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[85, 65, 50].map((width, i) => (
            <div
              key={i}
              style={{
                height: 10,
                width: `${width}%`,
                backgroundColor: i === 0 ? `${color}30` : colors.border,
                borderRadius: 5,
              }}
            />
          ))}
        </div>

        {/* Mini chart representation */}
        <div style={{ display: "flex", gap: 6, marginTop: 16, alignItems: "flex-end" }}>
          {[40, 55, 45, 70, 60].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: h,
                backgroundColor: i === 4 ? color : `${color}40`,
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export const Scene14_Final: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delays
  const card1Delay = 10;
  const card2Delay = 25;
  const card3Delay = 40;
  const logoDelay = 80;
  const taglineDelay = 120;
  const finalTextDelay = 150;

  // Logo animation
  const logoScale = spring({
    frame: frame - logoDelay,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const logoOpacity = interpolate(frame, [logoDelay, logoDelay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline animation now handled by KineticWord

  // Final text underline
  const underlineWidth = interpolate(
    frame,
    [finalTextDelay + 30, finalTextDelay + 60],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Decorative background gradient pulse
  const bgPulse = interpolate(Math.sin(frame * 0.03), [-1, 1], [0.95, 1.05]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "50%",
          height: "60%",
          background: `radial-gradient(ellipse, ${colors.primary}15 0%, transparent 70%)`,
          transform: `scale(${bgPulse})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "50%",
          height: "60%",
          background: `radial-gradient(ellipse, ${colors.secondary}20 0%, transparent 70%)`,
          transform: `scale(${bgPulse * 1.1})`,
        }}
      />

      {/* Split screen cards */}
      <div
        style={{
          display: "flex",
          gap: 30,
          marginBottom: 60,
        }}
      >
        <PreviewCard
          title="Module HACCP"
          icon="🛡️"
          color={colors.success}
          delay={card1Delay}
          position="left"
        />
        <PreviewCard
          title="Tableau de bord"
          icon="📊"
          color={colors.primary}
          delay={card2Delay}
          position="center"
        />
        <PreviewCard
          title="Planning"
          icon="📅"
          color={colors.secondary}
          delay={card3Delay}
          position="right"
        />
      </div>

      {/* Logo and brand */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          opacity: logoOpacity,
          transform: `scale(${Math.max(0, logoScale)})`,
        }}
      >
        {/* Logo */}
        <Img
          src={staticFile("luniqo.png")}
          style={{
            width: 100,
            height: "auto",
            filter: `drop-shadow(0 10px 30px ${colors.primary}30)`,
          }}
        />

        {/* Brand name */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: colors.primary,
            fontFamily: "system-ui, sans-serif",
            margin: 0,
            letterSpacing: -1,
          }}
        >
          Luniqo
        </h1>
      </div>

      {/* Tagline with kinetic text */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
          <KineticWord
            startFrame={taglineDelay}
            fontSize={36}
            fontWeight={600}
            color={colors.foreground}
            direction="left"
            float={false}
          >
            La conformité
          </KineticWord>
          <KineticWord
            startFrame={taglineDelay + 15}
            fontSize={36}
            fontWeight={700}
            color={colors.success}
            direction="scale"
            impact
            glow
            glowColor={colors.success}
          >
            maîtrisée.
          </KineticWord>
        </div>

        {/* Animated underline */}
        <div
          style={{
            width: `${underlineWidth}%`,
            maxWidth: 300,
            height: 4,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.success})`,
            borderRadius: 2,
          }}
        />
      </div>

      {/* CTA hint */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [finalTextDelay + 50, finalTextDelay + 70], [0, 0.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontSize: 16,
            color: `${colors.foreground}70`,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          luniqo.com
        </span>
      </div>
    </AbsoluteFill>
  );
};
