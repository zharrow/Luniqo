import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors } from "../../colors";

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene transitions
  const sceneIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sceneOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Brand reveal timing
  const brandStart = fps * 0.5;

  // Expanding circles
  const circles = [
    { delay: 0, color: colors.primary, size: 1200 },
    { delay: 5, color: colors.secondary, size: 1000 },
    { delay: 10, color: colors.success, size: 800 },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        opacity: Math.min(sceneIn, sceneOut),
        overflow: "hidden",
      }}
    >
      {/* Expanding circle animations */}
      {circles.map((circle, i) => {
        const circleProgress = spring({
          frame: frame - brandStart - circle.delay,
          fps,
          config: { damping: 20, stiffness: 40 },
        });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: circle.size,
              height: circle.size,
              borderRadius: "50%",
              border: `3px solid ${circle.color}30`,
              transform: `translate(-50%, -50%) scale(${Math.max(0, circleProgress)})`,
              opacity: interpolate(Math.max(0, circleProgress), [0, 0.5, 1], [0, 0.8, 0.3]),
            }}
          />
        );
      })}

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Left vertical text */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: "50%",
            transform: `translateY(-50%) rotate(-90deg)`,
            transformOrigin: "center center",
            opacity: interpolate(frame, [brandStart + 30, brandStart + 50], [0, 0.4], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: colors.primary,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: 8,
              textTransform: "uppercase",
            }}
          >
            Gestion de crèche
          </span>
        </div>

        {/* Right vertical text */}
        <div
          style={{
            position: "absolute",
            right: 80,
            top: "50%",
            transform: `translateY(-50%) rotate(90deg)`,
            transformOrigin: "center center",
            opacity: interpolate(frame, [brandStart + 40, brandStart + 60], [0, 0.4], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: colors.secondary,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: 8,
              textTransform: "uppercase",
            }}
          >
            Simplifiée
          </span>
        </div>

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 30,
          }}
        >
          {/* Logo "L" with morph animation */}
          <div
            style={{
              position: "relative",
              width: 180,
              height: 180,
            }}
          >
            {/* Background glow */}
            <div
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${colors.primary}40 0%, transparent 70%)`,
                transform: `scale(${1 + Math.sin(frame * 0.05) * 0.1})`,
                opacity: interpolate(frame, [brandStart, brandStart + 20], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            />

            {/* L logo */}
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 40,
                background: `linear-gradient(135deg, ${colors.primary}, #4a8bb9)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${spring({
                  frame: frame - brandStart,
                  fps,
                  config: { damping: 10, stiffness: 150 },
                })}) rotate(${interpolate(frame, [brandStart, brandStart + 30], [-180, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.exp),
                })}deg)`,
                boxShadow: `0 30px 60px ${colors.primary}50`,
              }}
            >
              <span
                style={{
                  fontSize: 100,
                  fontWeight: 900,
                  color: "#fff",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                L
              </span>
            </div>
          </div>

          {/* Brand name with staggered letter animation */}
          <div style={{ display: "flex", overflow: "hidden" }}>
            {"Luniqo".split("").map((char, index) => {
              const charDelay = brandStart + 20 + index * 4;
              const charProgress = spring({
                frame: frame - charDelay,
                fps,
                config: { damping: 12, stiffness: 200 },
              });

              return (
                <span
                  key={index}
                  style={{
                    fontSize: 120,
                    fontWeight: 900,
                    color: index === 3 ? colors.secondary : colors.primary,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    display: "inline-block",
                    transform: `translateY(${interpolate(
                      Math.max(0, charProgress),
                      [0, 1],
                      [100, 0]
                    )}px) scale(${Math.max(0, charProgress)})`,
                    letterSpacing: -3,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>

          {/* Tagline with reveal mask */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "10px 0",
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: colors.text,
                fontFamily: "system-ui, -apple-system, sans-serif",
                display: "block",
                transform: `translateX(${interpolate(
                  frame,
                  [brandStart + 50, brandStart + 75],
                  [-100, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) }
                )}%)`,
                opacity: interpolate(
                  frame,
                  [brandStart + 50, brandStart + 70],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              La gestion de crèche, simplifiée.
            </span>

            {/* Underline animation */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: 4,
                width: `${interpolate(
                  frame,
                  [brandStart + 70, brandStart + 90],
                  [0, 100],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
                )}%`,
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const baseRadius = 300 + (i % 3) * 100;
        const radius = baseRadius + Math.sin(frame * 0.03 + i) * 50;
        const x = Math.cos(angle + frame * 0.008) * radius;
        const y = Math.sin(angle + frame * 0.008) * radius;

        const particleColors = [colors.primary, colors.secondary, colors.success, colors.accent];

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 8 + (i % 3) * 4,
              height: 8 + (i % 3) * 4,
              borderRadius: "50%",
              backgroundColor: particleColors[i % 4],
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              opacity: interpolate(frame, [brandStart + 40 + i * 3, brandStart + 60 + i * 3], [0, 0.6], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              boxShadow: `0 0 20px ${particleColors[i % 4]}80`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
