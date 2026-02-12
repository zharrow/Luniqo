import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { colors } from "../colors";
import { getFloatingOffset, getPulse } from "./animations";

const nurseries = [
  { name: "Crèche Paris", city: "Paris 11e", children: 24, color: colors.secondary, emoji: "🏠" },
  { name: "Crèche Lyon", city: "Lyon 3e", children: 18, color: colors.accent, emoji: "🏡" },
  { name: "Crèche Marseille", city: "Marseille 6e", children: 30, color: colors.success, emoji: "🏘️" },
];

// Animated connection line with data flow
const ConnectionLine: React.FC<{
  frame: number;
  delay: number;
  angle: number;
  length: number;
}> = ({ frame, delay, angle, length }) => {
  const lineProgress = interpolate(frame, [delay, delay + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Animated data dots flowing along the line
  const dotPosition = ((frame - delay) * 2) % 100;

  return (
    <div
      style={{
        position: "absolute",
        width: length,
        height: 4,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "left center",
      }}
    >
      {/* Line background */}
      <div
        style={{
          width: `${lineProgress * 100}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${colors.primary}60 0%, ${colors.primary}30 100%)`,
          borderRadius: 2,
        }}
      />

      {/* Flowing data dot */}
      {lineProgress === 1 && (
        <div
          style={{
            position: "absolute",
            left: `${dotPosition}%`,
            top: -4,
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: colors.primary,
            boxShadow: `0 0 20px ${colors.primary}`,
            opacity: 0.8,
          }}
        />
      )}
    </div>
  );
};

// Nursery card component
const NurseryCard: React.FC<{
  nursery: typeof nurseries[0];
  frame: number;
  delay: number;
  fps: number;
  position: { x: number; y: number };
}> = ({ nursery, frame, delay, fps, position }) => {
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 10, stiffness: 80, mass: 0.8 },
  });

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const float = getFloatingOffset(frame - delay, 0.04, 8);

  // Card shine effect
  const shinePosition = interpolate(frame, [delay + 40, delay + 80], [-100, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y + float,
        transform: `scale(${Math.max(0, scale)}) translate(-50%, -50%)`,
        opacity,
      }}
    >
      <div
        style={{
          background: `linear-gradient(145deg, ${colors.white} 0%, #f8f8f8 100%)`,
          padding: "30px 35px",
          borderRadius: 24,
          boxShadow: `
            0 20px 50px rgba(0,0,0,0.1),
            0 10px 25px ${nursery.color}30,
            inset 0 1px 0 rgba(255,255,255,1)
          `,
          border: `3px solid ${nursery.color}40`,
          minWidth: 200,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shine effect */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: shinePosition,
            width: 60,
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            transform: "skewX(-20deg)",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${nursery.color}30 0%, ${nursery.color}15 100%)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 15,
          }}
        >
          <span style={{ fontSize: 36 }}>{nursery.emoji}</span>
        </div>

        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: colors.text,
            fontFamily: "system-ui, sans-serif",
            margin: 0,
            marginBottom: 4,
          }}
        >
          {nursery.name}
        </h3>

        <p
          style={{
            fontSize: 14,
            color: "#718096",
            fontFamily: "system-ui, sans-serif",
            margin: 0,
            marginBottom: 12,
          }}
        >
          {nursery.city}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: `${nursery.color}15`,
            padding: "8px 14px",
            borderRadius: 20,
          }}
        >
          <span style={{ fontSize: 16 }}>👶</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.text,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {nursery.children} enfants
          </span>
        </div>
      </div>
    </div>
  );
};

export const MultiSiteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation - words with stagger
  const titleWords = ["Gérez", "toutes", "vos", "crèches"];
  const subtitleWords = ["depuis", "un", "seul", "compte"];

  // Hub animations
  const hubScale = spring({
    frame: frame - 60,
    fps,
    config: { damping: 8, stiffness: 60, mass: 1 },
  });

  const hubGlow = getPulse(frame, 0.06, 0.15);
  const hubFloat = getFloatingOffset(frame, 0.03, 6);

  // Bottom stats
  const statsOpacity = interpolate(frame, [180, 200], [0, 1], {
    extrapolateRight: "clamp",
  });

  const stats = [
    { icon: "🔒", label: "Données isolées", desc: "par site" },
    { icon: "🔄", label: "Ressources partagées", desc: "entre crèches" },
    { icon: "📊", label: "Vue globale", desc: "en temps réel" },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.background} 0%, #f0ebe3 100%)`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Animated mesh background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 30% 20%, ${colors.primary}10 0%, transparent 40%),
            radial-gradient(circle at 70% 80%, ${colors.secondary}15 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, ${colors.accent}08 0%, transparent 50%)
          `,
        }}
      />

      {/* Grid pattern overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(${colors.primary}05 1px, transparent 1px),
            linear-gradient(90deg, ${colors.primary}05 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: 0.5,
        }}
      />

      {/* Title section */}
      <div style={{ textAlign: "center", marginBottom: 20, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {titleWords.map((word, index) => {
            const wordDelay = index * 5;
            const wordOpacity = interpolate(frame, [wordDelay, wordDelay + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const wordY = interpolate(frame, [wordDelay, wordDelay + 12], [30, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.exp),
            });

            return (
              <span
                key={index}
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: colors.text,
                  fontFamily: "system-ui, sans-serif",
                  opacity: wordOpacity,
                  transform: `translateY(${wordY}px)`,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 8 }}>
          {subtitleWords.map((word, index) => {
            const wordDelay = 20 + index * 4;
            const wordOpacity = interpolate(frame, [wordDelay, wordDelay + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <span
                key={index}
                style={{
                  fontSize: 42,
                  fontWeight: 600,
                  color: colors.primary,
                  fontFamily: "system-ui, sans-serif",
                  opacity: wordOpacity,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {/* Central visualization area */}
      <div
        style={{
          position: "relative",
          width: 1200,
          height: 500,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Connection lines */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <ConnectionLine frame={frame} delay={100} angle={-30} length={280} />
          <ConnectionLine frame={frame} delay={110} angle={30} length={280} />
          <ConnectionLine frame={frame} delay={120} angle={180} length={250} />
        </div>

        {/* Central Hub - Luniqo */}
        <div
          style={{
            transform: `scale(${Math.max(0, hubScale)}) translateY(${hubFloat}px)`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${colors.primary} 0%, #4a8ab8 100%)`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: `
                0 30px 80px rgba(90, 157, 201, ${0.4 * hubGlow}),
                0 0 100px rgba(90, 157, 201, ${0.2 * hubGlow}),
                inset 0 -10px 30px rgba(0,0,0,0.1)
              `,
              position: "relative",
            }}
          >
            {/* Rotating ring */}
            <div
              style={{
                position: "absolute",
                width: 240,
                height: 240,
                borderRadius: "50%",
                border: `2px dashed ${colors.primary}40`,
                transform: `rotate(${frame * 0.3}deg)`,
              }}
            />

            <span
              style={{
                fontSize: 90,
                fontWeight: 800,
                color: colors.white,
                fontFamily: "system-ui, sans-serif",
                textShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}
            >
              L
            </span>
          </div>

          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: colors.primary,
              fontFamily: "system-ui, sans-serif",
              textAlign: "center",
              marginTop: 20,
            }}
          >
            Tableau de bord unique
          </p>
        </div>

        {/* Nursery cards */}
        <NurseryCard
          nursery={nurseries[0]}
          frame={frame}
          delay={70}
          fps={fps}
          position={{ x: 150, y: 180 }}
        />
        <NurseryCard
          nursery={nurseries[1]}
          frame={frame}
          delay={85}
          fps={fps}
          position={{ x: 1050, y: 180 }}
        />
        <NurseryCard
          nursery={nurseries[2]}
          frame={frame}
          delay={100}
          fps={fps}
          position={{ x: 200, y: 420 }}
        />
      </div>

      {/* Bottom stats */}
      <div
        style={{
          display: "flex",
          gap: 60,
          opacity: statsOpacity,
          marginTop: 20,
        }}
      >
        {stats.map((stat, index) => {
          const statDelay = 200 + index * 15;
          const statScale = spring({
            frame: frame - statDelay,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={stat.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                transform: `scale(${Math.max(0, statScale)})`,
              }}
            >
              <span style={{ fontSize: 28 }}>{stat.icon}</span>
              <div>
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: colors.text,
                    fontFamily: "system-ui, sans-serif",
                    margin: 0,
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "#718096",
                    fontFamily: "system-ui, sans-serif",
                    margin: 0,
                  }}
                >
                  {stat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
