import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { colors } from "../colors";
import { getFloatingOffset, getPulse } from "./animations";

// Animated particles in background
const BackgroundParticle: React.FC<{
  x: number;
  y: number;
  size: number;
  delay: number;
  frame: number;
}> = ({ x, y, size, delay, frame }) => {
  const float = getFloatingOffset(frame - delay, 0.02, 30);
  const opacity = interpolate(frame, [delay, delay + 40], [0, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + float,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)`,
        opacity,
      }}
    />
  );
};

// Animated arrow icon
const AnimatedArrow: React.FC<{ frame: number }> = ({ frame }) => {
  const bounce = Math.sin(frame * 0.15) * 5;

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      style={{ transform: `translateX(${bounce}px)`, marginLeft: 10 }}
    >
      <path
        d="M5 12h14M12 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation with dramatic entrance
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 60, mass: 0.8 },
  });

  const logoRotation = interpolate(frame, [0, 25], [15, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });

  const logoGlow = getPulse(frame, 0.08, 0.2);
  const logoFloat = getFloatingOffset(frame, 0.04, 6);

  // Headline animation - word by word
  const headlineWords = ["Prêt", "à", "simplifier", "votre", "quotidien", "?"];
  const headlineStartFrame = 15;

  // Subheadline
  const subOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [50, 70], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  // CTA button with attention-grabbing animation
  const buttonScale = spring({
    frame: frame - 80,
    fps,
    config: { damping: 10, stiffness: 80, mass: 0.6 },
  });

  const buttonOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Button pulse and glow
  const buttonPulse = getPulse(frame, 0.1, 0.02);
  const buttonGlowIntensity = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.3, 0.6]
  );

  // Feature badges
  const badges = [
    { icon: "✨", text: "Essai gratuit 14 jours" },
    { icon: "🔒", text: "Sans engagement" },
    { icon: "💬", text: "Support dédié" },
  ];

  // Background particles
  const particles = [
    { x: 100, y: 100, size: 150, delay: 0 },
    { x: 1700, y: 150, size: 120, delay: 10 },
    { x: 200, y: 800, size: 100, delay: 20 },
    { x: 1600, y: 700, size: 180, delay: 15 },
    { x: 900, y: 50, size: 80, delay: 25 },
    { x: 400, y: 500, size: 140, delay: 30 },
    { x: 1400, y: 400, size: 90, delay: 35 },
  ];

  // Website URL animation
  const urlOpacity = interpolate(frame, [150, 170], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `
          linear-gradient(135deg, ${colors.primary} 0%, #4a8ab8 40%, #3d7a9e 100%)
        `,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Animated gradient overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.1) 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <BackgroundParticle key={i} {...p} frame={frame} />
      ))}

      {/* Large decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -300,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.08)",
          transform: `rotate(${frame * 0.1}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -400,
          right: -300,
          width: 900,
          height: 900,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.05)",
          transform: `rotate(${-frame * 0.08}deg)`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRotation}deg) translateY(${logoFloat}px)`,
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: `linear-gradient(145deg, ${colors.white} 0%, #f0f0f0 100%)`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: `
            0 30px 80px rgba(0,0,0,${0.3 * logoGlow}),
            0 0 60px rgba(255,255,255,${0.2 * logoGlow}),
            inset 0 -5px 15px rgba(0,0,0,0.05)
          `,
          marginBottom: 35,
        }}
      >
        <span
          style={{
            fontSize: 85,
            fontWeight: 800,
            background: `linear-gradient(135deg, ${colors.primary} 0%, #4a8ab8 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          L
        </span>
      </div>

      {/* Headline - animated words */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18, marginBottom: 15, maxWidth: 1000 }}>
        {headlineWords.map((word, index) => {
          const wordDelay = headlineStartFrame + index * 5;
          const wordOpacity = interpolate(frame, [wordDelay, wordDelay + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const wordY = interpolate(frame, [wordDelay, wordDelay + 12], [40, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(2)),
          });
          const wordScale = spring({
            frame: frame - wordDelay,
            fps,
            config: { damping: 12, stiffness: 120 },
          });

          return (
            <span
              key={index}
              style={{
                fontSize: 68,
                fontWeight: 800,
                color: colors.white,
                fontFamily: "system-ui, sans-serif",
                opacity: wordOpacity,
                transform: `translateY(${wordY}px) scale(${Math.max(0.8, wordScale)})`,
                display: "inline-block",
                textShadow: "0 4px 30px rgba(0,0,0,0.3)",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Subheadline */}
      <p
        style={{
          fontSize: 28,
          color: "rgba(255,255,255,0.9)",
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          marginBottom: 45,
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          fontWeight: 400,
        }}
      >
        Rejoignez les crèches qui font confiance à Luniqo
      </p>

      {/* CTA Button with glow */}
      <div
        style={{
          transform: `scale(${Math.max(0, buttonScale) * buttonPulse})`,
          opacity: buttonOpacity,
          position: "relative",
        }}
      >
        {/* Glow effect behind button */}
        <div
          style={{
            position: "absolute",
            top: -20,
            left: -20,
            right: -20,
            bottom: -20,
            borderRadius: 30,
            background: `radial-gradient(ellipse, rgba(255,255,255,${buttonGlowIntensity}) 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
        />

        <div
          style={{
            background: `linear-gradient(135deg, ${colors.white} 0%, #f5f5f5 100%)`,
            padding: "22px 50px",
            borderRadius: 18,
            boxShadow: `
              0 15px 50px rgba(0,0,0,0.3),
              0 5px 20px rgba(0,0,0,0.2),
              inset 0 2px 0 rgba(255,255,255,1)
            `,
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${colors.primary} 0%, #4a8ab8 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Demander une démo gratuite
          </span>
          <AnimatedArrow frame={frame} />
        </div>
      </div>

      {/* Feature badges */}
      <div
        style={{
          display: "flex",
          gap: 25,
          marginTop: 50,
        }}
      >
        {badges.map((badge, index) => {
          const badgeDelay = 120 + index * 12;
          const badgeOpacity = interpolate(frame, [badgeDelay, badgeDelay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const badgeScale = spring({
            frame: frame - badgeDelay,
            fps,
            config: { damping: 12, stiffness: 100 },
          });
          const badgeY = interpolate(frame, [badgeDelay, badgeDelay + 15], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.exp),
          });

          return (
            <div
              key={badge.text}
              style={{
                opacity: badgeOpacity,
                transform: `scale(${Math.max(0, badgeScale)}) translateY(${badgeY}px)`,
                background: "rgba(255,255,255,0.15)",
                padding: "14px 24px",
                borderRadius: 50,
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>{badge.icon}</span>
              <span
                style={{
                  fontSize: 16,
                  color: colors.white,
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 500,
                }}
              >
                {badge.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Website URL */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          opacity: urlOpacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: colors.success,
            boxShadow: `0 0 10px ${colors.success}`,
          }}
        />
        <span
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.8)",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 500,
            letterSpacing: 1,
          }}
        >
          luniqo.fr
        </span>
      </div>
    </AbsoluteFill>
  );
};
