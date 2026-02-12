import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
  Img,
  staticFile,
} from "remotion";
import { colors } from "../colors";
import { getFloatingOffset } from "./animations";

// HACCP checkpoints the mascot will visit
const checkpoints = [
  {
    id: "temperature",
    label: "Températures",
    value: "4.2°C ✓",
    icon: "🌡️",
    color: "#ef4444",
    x: 300,
    y: 450,
    speechBubble: "Frigo OK !",
  },
  {
    id: "products",
    label: "Traçabilité",
    value: "Lot #2847",
    icon: "📦",
    color: "#f59e0b",
    x: 700,
    y: 350,
    speechBubble: "Tout tracé !",
  },
  {
    id: "cleaning",
    label: "Nettoyage",
    value: "100%",
    icon: "✨",
    color: colors.primary,
    x: 1100,
    y: 450,
    speechBubble: "Nickel !",
  },
  {
    id: "equipment",
    label: "Équipements",
    value: "Certifiés",
    icon: "🔧",
    color: colors.success,
    x: 1500,
    y: 350,
    speechBubble: "Validé !",
  },
];

// Kitchen/HACCP zone background element
const KitchenElement: React.FC<{
  type: "fridge" | "counter" | "sink" | "shelf";
  x: number;
  y: number;
  frame: number;
  delay: number;
}> = ({ type, x, y, frame, delay }) => {
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [delay, delay + 25], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  const elements = {
    fridge: (
      <div
        style={{
          width: 120,
          height: 200,
          background: "linear-gradient(180deg, #e5e7eb 0%, #d1d5db 100%)",
          borderRadius: 12,
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 15,
            top: "50%",
            width: 8,
            height: 40,
            background: "#9ca3af",
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 15,
            top: 20,
            width: 80,
            height: 30,
            background: "rgba(255,255,255,0.5)",
            borderRadius: 4,
          }}
        />
      </div>
    ),
    counter: (
      <div
        style={{
          width: 200,
          height: 80,
          background: "linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)",
          borderRadius: "8px 8px 0 0",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 20,
            background: "#d97706",
            borderRadius: "0 0 8px 8px",
          }}
        />
      </div>
    ),
    sink: (
      <div
        style={{
          width: 100,
          height: 60,
          background: "linear-gradient(180deg, #e0e7ff 0%, #c7d2fe 100%)",
          borderRadius: "0 0 20px 20px",
          position: "relative",
          boxShadow: "inset 0 5px 15px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            left: "50%",
            transform: "translateX(-50%)",
            width: 15,
            height: 40,
            background: "#94a3b8",
            borderRadius: 4,
          }}
        />
      </div>
    ),
    shelf: (
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 150,
              height: 12,
              background: "#a78bfa",
              borderRadius: 4,
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            }}
          />
        ))}
      </div>
    ),
  };

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {elements[type]}
    </div>
  );
};

// Checkpoint card that appears when mascot visits
const CheckpointCard: React.FC<{
  checkpoint: (typeof checkpoints)[0];
  frame: number;
  isActive: boolean;
  isCompleted: boolean;
  fps: number;
}> = ({ checkpoint, frame, isActive, isCompleted, fps }) => {
  const activeScale = isActive ? 1.1 : 1;
  const float = getFloatingOffset(frame, 0.05, 5);

  const completedOpacity = isCompleted
    ? interpolate(
        frame,
        [0, 1000],
        [1, 1], // Always visible once completed
        { extrapolateRight: "clamp" }
      )
    : 0.4;

  return (
    <div
      style={{
        position: "absolute",
        left: checkpoint.x,
        top: checkpoint.y + float,
        transform: `scale(${activeScale}) translateX(-50%)`,
        transition: "transform 0.3s ease",
      }}
    >
      <div
        style={{
          background: isCompleted
            ? `linear-gradient(145deg, ${colors.white} 0%, ${checkpoint.color}15 100%)`
            : "rgba(255,255,255,0.7)",
          padding: "20px 25px",
          borderRadius: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          boxShadow: isActive
            ? `0 20px 50px rgba(0,0,0,0.15), 0 0 30px ${checkpoint.color}40`
            : "0 10px 30px rgba(0,0,0,0.1)",
          border: `3px solid ${isCompleted ? checkpoint.color : "transparent"}`,
          minWidth: 140,
          opacity: completedOpacity,
          transition: "all 0.3s ease",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: `${checkpoint.color}20`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 28,
          }}
        >
          {checkpoint.icon}
        </div>

        {/* Label */}
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: colors.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {checkpoint.label}
        </span>

        {/* Value - only show when completed */}
        {isCompleted && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: checkpoint.color,
              fontFamily: "system-ui, sans-serif",
              background: `${checkpoint.color}15`,
              padding: "4px 12px",
              borderRadius: 20,
            }}
          >
            {checkpoint.value}
          </span>
        )}

        {/* Checkmark badge */}
        {isCompleted && (
          <div
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: colors.success,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13L9 17L19 7"
                stroke={colors.white}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

// Speech bubble for mascot
const SpeechBubble: React.FC<{
  text: string;
  frame: number;
  delay: number;
}> = ({ text, frame, delay }) => {
  const opacity = interpolate(
    frame,
    [delay, delay + 10, delay + 50, delay + 60],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(frame, [delay, delay + 15], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });

  return (
    <div
      style={{
        position: "absolute",
        top: -70,
        left: "50%",
        transform: `translateX(-50%) scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          background: colors.white,
          padding: "10px 18px",
          borderRadius: 16,
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: colors.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {text}
        </span>
        {/* Bubble tail */}
        <div
          style={{
            position: "absolute",
            bottom: -8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: `10px solid ${colors.white}`,
          }}
        />
      </div>
    </div>
  );
};

// Final compliance badge
const ComplianceBadge: React.FC<{ frame: number; delay: number; fps: number }> =
  ({ frame, delay, fps }) => {
    const scale = spring({
      frame: frame - delay,
      fps,
      config: { damping: 8, stiffness: 60 },
    });

    const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const rotation = interpolate(frame, [delay, delay + 20], [-10, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(2)),
    });

    // Sparkles around the badge
    const sparkles = [
      { x: -80, y: -40, delay: delay + 20 },
      { x: 80, y: -50, delay: delay + 25 },
      { x: -60, y: 40, delay: delay + 30 },
      { x: 70, y: 30, delay: delay + 22 },
      { x: 0, y: -70, delay: delay + 28 },
    ];

    return (
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: `translateX(-50%) scale(${Math.max(0, scale)}) rotate(${rotation}deg)`,
          opacity,
        }}
      >
        {/* Sparkles */}
        {sparkles.map((s, i) => {
          const sparkleOpacity = interpolate(
            frame,
            [s.delay, s.delay + 10, s.delay + 20, s.delay + 30],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const sparkleScale = interpolate(
            frame,
            [s.delay, s.delay + 15],
            [0.5, 1.2],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: s.x,
                top: s.y,
                opacity: sparkleOpacity,
                transform: `scale(${sparkleScale})`,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path
                  d="M12 0L14 8L22 10L14 12L12 20L10 12L2 10L10 8L12 0Z"
                  fill={colors.accent}
                />
              </svg>
            </div>
          );
        })}

        {/* Badge */}
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.white} 0%, #f0fdf4 100%)`,
            padding: "25px 50px",
            borderRadius: 24,
            boxShadow: `
              0 20px 60px rgba(0,0,0,0.2),
              0 0 40px ${colors.success}50,
              inset 0 2px 0 rgba(255,255,255,1)
            `,
            border: `3px solid ${colors.success}`,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          {/* Checkmark circle */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: colors.success,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: `0 0 20px ${colors.success}80`,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13L9 17L19 7"
                stroke={colors.white}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: colors.success,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              100% Conforme
            </span>
            <span
              style={{
                fontSize: 16,
                color: colors.text,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Contrôles HACCP validés
            </span>
          </div>
        </div>
      </div>
    );
  };

export const HACCPScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene duration: 10 seconds = 300 frames at 30fps
  // Timeline:
  // 0-30: Scene intro, mascot enters from left
  // 30-80: Checkpoint 1 (temperature)
  // 80-130: Checkpoint 2 (products)
  // 130-180: Checkpoint 3 (cleaning)
  // 180-230: Checkpoint 4 (equipment)
  // 230-300: Final badge appears, mascot celebrates

  // Mascot position - follows a path through checkpoints
  const checkpointTimes = [30, 80, 130, 180];
  const checkpointXPositions = [300, 700, 1100, 1500];
  const finalX = 960; // Center for finale

  // Calculate current checkpoint index
  const getCurrentCheckpoint = () => {
    if (frame < 30) return -1;
    if (frame < 80) return 0;
    if (frame < 130) return 1;
    if (frame < 180) return 2;
    if (frame < 230) return 3;
    return 4; // Final phase
  };

  const currentCheckpoint = getCurrentCheckpoint();

  // Mascot X position
  const mascotX =
    frame < 30
      ? interpolate(frame, [0, 30], [-100, checkpointXPositions[0]], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.exp),
        })
      : frame < 230
        ? interpolate(
            frame,
            [30, 80, 130, 180],
            checkpointXPositions,
            { extrapolateRight: "clamp" }
          )
        : interpolate(frame, [230, 260], [checkpointXPositions[3], finalX], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.exp),
          });

  // Mascot Y position (slight variations)
  const mascotBaseY = 580;
  const walkBounce =
    frame < 230 ? Math.abs(Math.sin(frame * 0.3)) * 12 : 0;

  // Title animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  // Mascot scale (entrance)
  const mascotScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Current speech bubble
  const getSpeechDelay = (checkpointIndex: number) => {
    return checkpointTimes[checkpointIndex] + 15;
  };

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #e8f4fc 0%, ${colors.success}30 40%, #d4f1e4 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Background pattern - kitchen tiles effect */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 80px,
              rgba(255,255,255,0.3) 80px,
              rgba(255,255,255,0.3) 82px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 80px,
              rgba(255,255,255,0.3) 80px,
              rgba(255,255,255,0.3) 82px
            )
          `,
          opacity: 0.5,
        }}
      />

      {/* Kitchen elements */}
      <KitchenElement type="fridge" x={200} y={300} frame={frame} delay={5} />
      <KitchenElement type="counter" x={550} y={520} frame={frame} delay={10} />
      <KitchenElement type="sink" x={950} y={520} frame={frame} delay={15} />
      <KitchenElement type="shelf" x={1350} y={280} frame={frame} delay={20} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 15,
            background: `linear-gradient(135deg, ${colors.white} 0%, #f0fdf4 100%)`,
            padding: "15px 40px",
            borderRadius: 20,
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          }}
        >
          <span style={{ fontSize: 36 }}>🛡️</span>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: colors.text,
              fontFamily: "system-ui, sans-serif",
              margin: 0,
            }}
          >
            Contrôle HACCP
          </h1>
        </div>
        <p
          style={{
            fontSize: 22,
            color: colors.text,
            fontFamily: "system-ui, sans-serif",
            marginTop: 15,
            opacity: 0.8,
          }}
        >
          La mascotte vérifie chaque point de contrôle
        </p>
      </div>

      {/* Checkpoint cards */}
      {checkpoints.map((checkpoint, index) => (
        <CheckpointCard
          key={checkpoint.id}
          checkpoint={checkpoint}
          frame={frame}
          isActive={currentCheckpoint === index}
          isCompleted={currentCheckpoint > index}
          fps={fps}
        />
      ))}

      {/* Mascot */}
      <div
        style={{
          position: "absolute",
          left: mascotX,
          top: mascotBaseY - walkBounce,
          transform: `translateX(-50%) scale(${Math.max(0, mascotScale)})`,
        }}
      >
        {/* Speech bubbles */}
        {currentCheckpoint >= 0 && currentCheckpoint < 4 && (
          <SpeechBubble
            text={checkpoints[currentCheckpoint].speechBubble}
            frame={frame}
            delay={getSpeechDelay(currentCheckpoint)}
          />
        )}

        {/* Final celebration speech */}
        {currentCheckpoint === 4 && (
          <SpeechBubble
            text="Tout est conforme ! 🎉"
            frame={frame}
            delay={240}
          />
        )}

        {/* Mascot image */}
        <Img
          src={staticFile("luniqo.png")}
          style={{
            width: 100,
            height: "auto",
            filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.15))",
          }}
        />

        {/* Walking dust particles */}
        {frame < 230 &&
          [0, 1, 2].map((i) => {
            const dustOpacity = interpolate(
              (frame + i * 10) % 30,
              [0, 15, 30],
              [0.5, 0.2, 0],
              { extrapolateRight: "clamp" }
            );
            const dustY = interpolate((frame + i * 10) % 30, [0, 30], [0, -15], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: `translateX(${-20 - i * 12}px) translateY(${dustY}px)`,
                  width: 6 - i,
                  height: 6 - i,
                  borderRadius: "50%",
                  backgroundColor: colors.success,
                  opacity: dustOpacity,
                }}
              />
            );
          })}
      </div>

      {/* Final compliance badge */}
      {frame > 240 && (
        <ComplianceBadge frame={frame} delay={245} fps={fps} />
      )}

      {/* Progress indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 15,
        }}
      >
        {checkpoints.map((checkpoint, index) => {
          const dotCompleted = currentCheckpoint > index;
          const dotActive = currentCheckpoint === index;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: dotActive ? 14 : 10,
                  height: dotActive ? 14 : 10,
                  borderRadius: "50%",
                  backgroundColor: dotCompleted
                    ? checkpoint.color
                    : dotActive
                      ? checkpoint.color
                      : `${colors.text}30`,
                  transition: "all 0.3s ease",
                  boxShadow: dotActive ? `0 0 15px ${checkpoint.color}80` : "none",
                }}
              />
              {index < checkpoints.length - 1 && (
                <div
                  style={{
                    width: 40,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: dotCompleted
                      ? checkpoint.color
                      : `${colors.text}20`,
                    transition: "background-color 0.3s ease",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
