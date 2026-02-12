import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors } from "../../colors";

// Module data with icons represented as text
const modules = [
  {
    number: "01",
    title: "SALLES",
    subtitle: "Gestion des espaces",
    description: "Organisez et suivez en temps réel",
    color: colors.primary,
  },
  {
    number: "02",
    title: "TÂCHES",
    subtitle: "Planification intelligente",
    description: "Assignez et automatisez",
    color: colors.accent,
  },
  {
    number: "03",
    title: "HACCP",
    subtitle: "Traçabilité complète",
    description: "Conformité garantie",
    color: colors.success,
  },
  {
    number: "04",
    title: "ÉQUIPE",
    subtitle: "Gestion du personnel",
    description: "Accès PIN & historique",
    color: colors.secondary,
  },
  {
    number: "05",
    title: "MULTI-SITES",
    subtitle: "Plusieurs crèches",
    description: "Un seul tableau de bord",
    color: "#a78bfa",
  },
];

export const ModulesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Each module gets ~3.6 seconds
  const moduleTime = fps * 3.6;
  const introTime = fps * 2;

  // Current module index
  const currentIndex = Math.min(
    modules.length - 1,
    Math.max(0, Math.floor((frame - introTime) / moduleTime))
  );

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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        opacity: Math.min(sceneIn, sceneOut),
        overflow: "hidden",
      }}
    >
      {/* Intro title */}
      {frame < introTime + 30 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: interpolate(frame, [introTime - 10, introTime + 20], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: "#ffffff50",
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: 15,
              textTransform: "uppercase",
              transform: `translateY(${interpolate(frame, [0, 30], [50, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.exp),
              })}px)`,
              opacity: interpolate(frame, [0, 25], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            Découvrez
          </span>
          <span
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: "#ffffff",
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: -3,
              transform: `scale(${spring({
                frame: frame - 10,
                fps,
                config: { damping: 12, stiffness: 150 },
              })})`,
            }}
          >
            5 MODULES
          </span>
        </div>
      )}

      {/* Module displays */}
      {modules.map((module, index) => {
        const moduleStart = introTime + index * moduleTime;
        const moduleEnd = moduleStart + moduleTime;
        const isActive = frame >= moduleStart && frame < moduleEnd;
        const localFrame = frame - moduleStart;

        if (!isActive && frame < moduleStart) return null;

        // Entry animations
        const enterProgress = spring({
          frame: localFrame,
          fps,
          config: { damping: 15, stiffness: 120 },
        });

        // Exit animation
        const exitProgress = interpolate(
          frame,
          [moduleEnd - 20, moduleEnd],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const opacity = isActive ? 1 - exitProgress : 0;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              inset: 0,
              opacity,
            }}
          >
            {/* Background color accent */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: `${interpolate(Math.max(0, enterProgress), [0, 1], [0, 40])}%`,
                backgroundColor: `${module.color}15`,
                transform: `translateX(${interpolate(Math.max(0, enterProgress), [0, 1], [100, 0])}%)`,
              }}
            />

            {/* Large number background */}
            <div
              style={{
                position: "absolute",
                right: -50,
                top: "50%",
                transform: `translateY(-50%) scale(${Math.max(0, enterProgress)})`,
                opacity: 0.05,
              }}
            >
              <span
                style={{
                  fontSize: 600,
                  fontWeight: 900,
                  color: "#ffffff",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {module.number}
              </span>
            </div>

            {/* Left side - Number and vertical line */}
            <div
              style={{
                position: "absolute",
                left: 120,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 40,
              }}
            >
              {/* Number */}
              <div
                style={{
                  transform: `translateX(${interpolate(
                    Math.max(0, enterProgress),
                    [0, 1],
                    [-100, 0]
                  )}px)`,
                  opacity: Math.max(0, enterProgress),
                }}
              >
                <span
                  style={{
                    fontSize: 140,
                    fontWeight: 900,
                    color: module.color,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    textShadow: `0 0 60px ${module.color}50`,
                  }}
                >
                  {module.number}
                </span>
              </div>

              {/* Vertical line */}
              <div
                style={{
                  width: 4,
                  height: 200,
                  backgroundColor: module.color,
                  transform: `scaleY(${Math.max(0, enterProgress)})`,
                  transformOrigin: "top",
                  borderRadius: 2,
                }}
              />

              {/* Text content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 15,
                }}
              >
                {/* Title */}
                <div style={{ overflow: "hidden" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 90,
                      fontWeight: 900,
                      color: "#ffffff",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      letterSpacing: -2,
                      transform: `translateY(${interpolate(
                        Math.max(0, enterProgress),
                        [0, 1],
                        [100, 0]
                      )}px)`,
                    }}
                  >
                    {module.title}
                  </span>
                </div>

                {/* Subtitle */}
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    color: module.color,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    opacity: interpolate(localFrame, [15, 30], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                    transform: `translateX(${interpolate(localFrame, [15, 30], [-30, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })}px)`,
                  }}
                >
                  {module.subtitle}
                </span>

                {/* Description */}
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 400,
                    color: "#ffffff80",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    opacity: interpolate(localFrame, [25, 40], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  {module.description}
                </span>
              </div>
            </div>

            {/* Right side vertical text */}
            <div
              style={{
                position: "absolute",
                right: 80,
                top: "50%",
                transform: `translateY(-50%) rotate(90deg)`,
                opacity: interpolate(localFrame, [20, 40], [0, 0.3], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: module.color,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: 10,
                  textTransform: "uppercase",
                }}
              >
                Module {module.number}
              </span>
            </div>
          </div>
        );
      })}

      {/* Progress indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 120,
          right: 120,
          display: "flex",
          gap: 15,
        }}
      >
        {modules.map((module, index) => {
          const moduleStart = introTime + index * moduleTime;
          const isActive = frame >= moduleStart;
          const isCurrent = index === currentIndex && frame >= introTime;

          return (
            <div
              key={index}
              style={{
                flex: 1,
                height: 4,
                backgroundColor: "#ffffff15",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: isCurrent
                    ? `${interpolate(
                        frame,
                        [moduleStart, moduleStart + moduleTime],
                        [0, 100],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                      )}%`
                    : isActive
                    ? "100%"
                    : "0%",
                  backgroundColor: module.color,
                  borderRadius: 2,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Module counter */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 120,
          opacity: frame >= introTime ? 1 : 0,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#ffffff40",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {String(currentIndex + 1).padStart(2, "0")} / {String(modules.length).padStart(2, "0")}
        </span>
      </div>
    </AbsoluteFill>
  );
};
