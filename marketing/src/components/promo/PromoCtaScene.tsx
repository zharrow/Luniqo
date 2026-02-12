import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors } from "../../colors";

export const PromoCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene fade in (no fade out - end on brand)
  const sceneIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animation timings
  const logoStart = fps * 0.5;
  const brandStart = fps * 1;
  const ctaStart = fps * 2.5;
  const urlStart = fps * 4;

  // Dynamic background
  const bgHue = interpolate(frame, [0, durationInFrames], [200, 220], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg,
          hsl(${bgHue}, 70%, 97%) 0%,
          hsl(${bgHue + 20}, 60%, 95%) 50%,
          hsl(${bgHue + 40}, 50%, 97%) 100%)`,
        opacity: sceneIn,
        overflow: "hidden",
      }}
    >
      {/* Animated background shapes */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primary}08 0%, transparent 60%)`,
          left: -200,
          top: -200,
          transform: `scale(${1 + Math.sin(frame * 0.02) * 0.2})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.secondary}08 0%, transparent 60%)`,
          right: -100,
          bottom: -100,
          transform: `scale(${1 + Math.cos(frame * 0.025) * 0.2})`,
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {/* Logo animation */}
        <div
          style={{
            position: "relative",
            width: 160,
            height: 160,
          }}
        >
          {/* Glowing rings */}
          {[0, 1, 2].map((i) => {
            const ringDelay = logoStart + i * 8;
            const ringProgress = spring({
              frame: frame - ringDelay,
              fps,
              config: { damping: 20, stiffness: 60 },
            });

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: -30 - i * 30,
                  borderRadius: "50%",
                  border: `2px solid ${colors.primary}${30 - i * 10}`,
                  transform: `scale(${Math.max(0, ringProgress)})`,
                  opacity: interpolate(Math.max(0, ringProgress), [0, 0.5, 1], [0, 1, 0.3]),
                }}
              />
            );
          })}

          {/* Logo container */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 40,
              background: `linear-gradient(135deg, ${colors.primary}, #3d7ba3)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${spring({
                frame: frame - logoStart,
                fps,
                config: { damping: 10, stiffness: 120 },
              })}) rotate(${interpolate(
                frame,
                [logoStart, logoStart + 25],
                [-180, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) }
              )}deg)`,
              boxShadow: `
                0 20px 60px ${colors.primary}40,
                0 0 0 8px ${colors.primary}15
              `,
            }}
          >
            <span
              style={{
                fontSize: 90,
                fontWeight: 900,
                color: "#fff",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              L
            </span>
          </div>
        </div>

        {/* Brand name */}
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              transform: `translateY(${interpolate(
                frame,
                [brandStart, brandStart + 25],
                [100, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) }
              )}px)`,
            }}
          >
            {"Luniqo".split("").map((char, i) => {
              const charDelay = brandStart + i * 3;
              const charProgress = spring({
                frame: frame - charDelay,
                fps,
                config: { damping: 15, stiffness: 200 },
              });

              return (
                <span
                  key={i}
                  style={{
                    fontSize: 100,
                    fontWeight: 900,
                    color: i === 3 ? colors.secondary : colors.primary,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    display: "inline-block",
                    transform: `scale(${Math.max(0, charProgress)})`,
                    letterSpacing: -2,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>

        {/* CTA Button */}
        <div
          style={{
            position: "relative",
            marginTop: 20,
          }}
        >
          {/* Button glow */}
          <div
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: 60,
              background: colors.primary,
              filter: "blur(30px)",
              opacity: interpolate(
                frame,
                [ctaStart + 20, ctaStart + 40],
                [0, 0.4],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              transform: `scale(${1 + Math.sin(frame * 0.1) * 0.05})`,
            }}
          />

          {/* Button */}
          <div
            style={{
              padding: "25px 70px",
              borderRadius: 60,
              background: `linear-gradient(135deg, ${colors.primary}, #4a8bb9)`,
              transform: `scale(${spring({
                frame: frame - ctaStart,
                fps,
                config: { damping: 10, stiffness: 100 },
              })})`,
              boxShadow: `0 15px 40px ${colors.primary}40`,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Essayez gratuitement
            </span>
          </div>
        </div>

        {/* Website URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 20,
            opacity: interpolate(frame, [urlStart, urlStart + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${interpolate(
              frame,
              [urlStart, urlStart + 20],
              [20, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )}px)`,
          }}
        >
          {/* Pulsing dot */}
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: colors.success,
              boxShadow: `0 0 ${10 + Math.sin(frame * 0.15) * 5}px ${colors.success}`,
            }}
          />
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: colors.text,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: 2,
            }}
          >
            luniqo.com
          </span>
        </div>
      </div>

      {/* Decorative elements - corners */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          width: 100,
          height: 100,
          borderLeft: `4px solid ${colors.primary}30`,
          borderTop: `4px solid ${colors.primary}30`,
          opacity: interpolate(frame, [fps * 3, fps * 4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${interpolate(frame, [fps * 3, fps * 4], [0.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
          transformOrigin: "top left",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 60,
          width: 100,
          height: 100,
          borderRight: `4px solid ${colors.secondary}30`,
          borderBottom: `4px solid ${colors.secondary}30`,
          opacity: interpolate(frame, [fps * 3.5, fps * 4.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${interpolate(frame, [fps * 3.5, fps * 4.5], [0.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
          transformOrigin: "bottom right",
        }}
      />

      {/* Bottom tagline */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [urlStart + 10, urlStart + 25], [0, 0.7], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: colors.text,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          La gestion de crèche, simplifiée.
        </span>
      </div>

      {/* Floating sparkles */}
      {[...Array(6)].map((_, i) => {
        const sparkleStart = ctaStart + 30 + i * 8;
        const angle = (i / 6) * Math.PI * 2 + frame * 0.02;
        const radius = 250 + Math.sin(frame * 0.03 + i) * 30;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "45%",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: i % 2 === 0 ? colors.accent : colors.secondary,
              transform: `translate(
                calc(-50% + ${Math.cos(angle) * radius}px),
                calc(-50% + ${Math.sin(angle) * radius}px)
              )`,
              opacity: interpolate(
                frame,
                [sparkleStart, sparkleStart + 15],
                [0, 0.8],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              boxShadow: `0 0 15px ${i % 2 === 0 ? colors.accent : colors.secondary}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
