import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors } from "../../colors";

const benefits = [
  { value: 80, suffix: "%", label: "TEMPS GAGNÉ", color: colors.primary },
  { value: 100, suffix: "%", label: "CONFORME HACCP", color: colors.success },
  { value: 24, suffix: "/7", label: "ACCESSIBLE", color: colors.secondary },
];

export const BenefitsScene: React.FC = () => {
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

  // Title animation
  const titleStart = fps * 0.3;

  // Benefits stagger
  const benefitDelay = fps * 0.8;
  const benefitsStart = fps * 1.5;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#fafafa",
        opacity: Math.min(sceneIn, sceneOut),
        overflow: "hidden",
      }}
    >
      {/* Animated background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 20%, ${colors.primary}10 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, ${colors.secondary}10 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, ${colors.success}08 0%, transparent 60%)
          `,
        }}
      />

      {/* Title section */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        {/* Small label */}
        <div
          style={{
            overflow: "hidden",
            marginBottom: 15,
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: 24,
              fontWeight: 600,
              color: colors.primary,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: 10,
              textTransform: "uppercase",
              transform: `translateY(${interpolate(
                frame,
                [titleStart, titleStart + 20],
                [50, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) }
              )}px)`,
              opacity: interpolate(frame, [titleStart, titleStart + 15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Résultats
          </span>
        </div>

        {/* Main title */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          {"CONCRETS".split("").map((char, i) => {
            const charDelay = titleStart + 10 + i * 3;
            const charProgress = spring({
              frame: frame - charDelay,
              fps,
              config: { damping: 10, stiffness: 200 },
            });

            return (
              <span
                key={i}
                style={{
                  fontSize: 100,
                  fontWeight: 900,
                  color: colors.text,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  display: "inline-block",
                  transform: `translateY(${interpolate(
                    Math.max(0, charProgress),
                    [0, 1],
                    [80, 0]
                  )}px) rotate(${interpolate(
                    Math.max(0, charProgress),
                    [0, 1],
                    [10, 0]
                  )}deg)`,
                  opacity: Math.max(0, charProgress),
                }}
              >
                {char}
              </span>
            );
          })}
        </div>
      </div>

      {/* Benefits display */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 100,
        }}
      >
        {benefits.map((benefit, index) => {
          const itemStart = benefitsStart + index * benefitDelay;
          const localFrame = frame - itemStart;

          // Counter animation
          const counterProgress = interpolate(
            frame,
            [itemStart + 20, itemStart + 70],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
          );
          const displayValue = Math.floor(counterProgress * benefit.value);

          // Entry animation
          const entryProgress = spring({
            frame: localFrame,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 15,
                transform: `translateY(${interpolate(
                  Math.max(0, entryProgress),
                  [0, 1],
                  [100, 0]
                )}px)`,
                opacity: Math.max(0, entryProgress),
              }}
            >
              {/* Animated circle background */}
              <div
                style={{
                  position: "relative",
                  width: 220,
                  height: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Outer ring */}
                <svg
                  width="220"
                  height="220"
                  style={{
                    position: "absolute",
                    transform: "rotate(-90deg)",
                  }}
                >
                  {/* Background circle */}
                  <circle
                    cx="110"
                    cy="110"
                    r="100"
                    fill="none"
                    stroke={`${benefit.color}20`}
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="110"
                    cy="110"
                    r="100"
                    fill="none"
                    stroke={benefit.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${counterProgress * 628} 628`}
                    style={{
                      filter: `drop-shadow(0 0 10px ${benefit.color}80)`,
                    }}
                  />
                </svg>

                {/* Number */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: 80,
                      fontWeight: 900,
                      color: benefit.color,
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    {displayValue}
                  </span>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 700,
                      color: benefit.color,
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      opacity: counterProgress,
                    }}
                  >
                    {benefit.suffix}
                  </span>
                </div>
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: colors.text,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: 3,
                  opacity: interpolate(localFrame, [30, 50], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {benefit.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Left vertical text */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
          opacity: interpolate(frame, [fps * 2, fps * 3], [0, 0.3], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: colors.primary,
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          Performance
        </span>
      </div>

      {/* Right vertical text */}
      <div
        style={{
          position: "absolute",
          right: 60,
          top: "50%",
          transform: "translateY(-50%) rotate(90deg)",
          opacity: interpolate(frame, [fps * 2.5, fps * 3.5], [0, 0.3], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: colors.secondary,
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          Efficacité
        </span>
      </div>

      {/* Bottom quote */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [fps * 6, fps * 7], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: `${colors.text}80`,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontStyle: "italic",
          }}
        >
          "Concentrez-vous sur l'essentiel : les enfants."
        </span>
      </div>
    </AbsoluteFill>
  );
};
