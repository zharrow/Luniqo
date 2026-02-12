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

// Cloud component
const Cloud: React.FC<{
  x: number;
  y: number;
  scale: number;
  opacity: number;
  frame: number;
  delay: number;
}> = ({ x, y, scale, opacity, frame, delay }) => {
  const floatY = Math.sin((frame - delay) * 0.03) * 8;
  const cloudOpacity = interpolate(frame, [delay, delay + 20], [0, opacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + floatY,
        transform: `scale(${scale})`,
        opacity: cloudOpacity,
        display: "flex",
        gap: -20,
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: i === 2 ? 80 : i === 1 || i === 3 ? 60 : 40,
            height: i === 2 ? 80 : i === 1 || i === 3 ? 60 : 40,
            borderRadius: "50%",
            backgroundColor: colors.white,
            marginLeft: i > 0 ? -25 : 0,
            marginTop: i === 0 || i === 4 ? 20 : i === 2 ? 0 : 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          }}
        />
      ))}
    </div>
  );
};

// Sparkle star component
const Sparkle: React.FC<{
  x: number;
  y: number;
  size: number;
  delay: number;
  frame: number;
  color: string;
}> = ({ x, y, size, delay, frame, color }) => {
  const sparkleProgress = interpolate(
    frame,
    [delay, delay + 10, delay + 20, delay + 30],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const rotation = interpolate(frame, [delay, delay + 30], [0, 180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(
    frame,
    [delay, delay + 15, delay + 30],
    [0.5, 1.2, 0.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: sparkleProgress,
        transform: `rotate(${rotation}deg) scale(${scale})`,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
          fill={color}
        />
      </svg>
    </div>
  );
};

// Zzz sleep indicator
const SleepZzz: React.FC<{ frame: number; opacity: number }> = ({
  frame,
  opacity,
}) => {
  const zzzs = [
    { x: 50, y: -20, size: 20, delay: 0 },
    { x: 70, y: -45, size: 26, delay: 10 },
    { x: 95, y: -75, size: 32, delay: 20 },
  ];

  return (
    <div style={{ position: "absolute", right: -100, top: 50, opacity }}>
      {zzzs.map((z, i) => {
        const zFloat = Math.sin((frame - z.delay) * 0.1) * 5;
        const zOpacity = interpolate(
          (frame + z.delay * 3) % 60,
          [0, 30, 60],
          [0.3, 1, 0.3],
          { extrapolateRight: "clamp" }
        );

        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: z.x,
              top: z.y + zFloat,
              fontSize: z.size,
              fontWeight: 700,
              color: colors.primary,
              opacity: zOpacity,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Z
          </span>
        );
      })}
    </div>
  );
};

// Footprint component
const Footprint: React.FC<{
  x: number;
  y: number;
  rotation: number;
  delay: number;
  frame: number;
}> = ({ x, y, rotation, delay, frame }) => {
  const opacity = interpolate(frame, [delay, delay + 5, delay + 60], [0, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [delay, delay + 10], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        opacity,
      }}
    >
      {/* Simple footprint shape */}
      <div
        style={{
          width: 16,
          height: 22,
          backgroundColor: colors.primary,
          borderRadius: "50% 50% 45% 45%",
          opacity: 0.4,
        }}
      />
      {/* Toes */}
      <div style={{ display: "flex", gap: 3, marginTop: -5, marginLeft: -2 }}>
        {[5, 6, 6, 5].map((s, i) => (
          <div
            key={i}
            style={{
              width: s,
              height: s,
              backgroundColor: colors.primary,
              borderRadius: "50%",
              opacity: 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase timings (8 seconds = 240 frames at 30fps)
  const sleepEnd = fps * 2; // 0-2s: sleeping
  const wakeEnd = fps * 3; // 2-3s: waking up
  const walkEnd = fps * 5; // 3-5s: walking
  const winkEnd = fps * 6; // 5-6s: wink
  // 6-8s: logo + tagline

  // === SLEEPING PHASE (0-2s) ===
  const breathingScale = 1 + Math.sin(frame * 0.08) * 0.03;
  const sleepingTilt = Math.sin(frame * 0.05) * 3;

  // === WAKING PHASE (2-3s) ===
  const isWaking = frame >= sleepEnd;

  // Mascot stretch animation
  const stretchScale = isWaking
    ? interpolate(frame, [sleepEnd, sleepEnd + 10, sleepEnd + 20], [1, 1.15, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // === WALKING PHASE (3-5s) ===
  const isWalking = frame >= wakeEnd && frame < walkEnd;
  const walkProgress = interpolate(frame, [wakeEnd, walkEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Mascot position during walk (curves to form hint of "L" path)
  const walkX = isWalking || frame >= walkEnd
    ? interpolate(walkProgress, [0, 0.3, 0.6, 1], [0, -100, -100, 0], {
        extrapolateRight: "clamp",
      })
    : 0;
  const walkY = isWalking || frame >= walkEnd
    ? interpolate(walkProgress, [0, 0.3, 0.6, 1], [0, 0, 80, 80], {
        extrapolateRight: "clamp",
      })
    : 0;

  // Bounce while walking
  const walkBounce = isWalking ? Math.abs(Math.sin(frame * 0.4)) * 15 : 0;

  // === FINAL PHASE (5-8s) ===
  const finalPhase = frame >= winkEnd;

  // Mascot moves to final position
  const finalX = interpolate(frame, [winkEnd, winkEnd + 20], [walkX, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });
  const finalY = interpolate(frame, [winkEnd, winkEnd + 20], [walkY + 80, -50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  // Logo scale in final phase
  const logoFinalScale = spring({
    frame: frame - winkEnd,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Brand name animation
  const brandName = "Luniqo";
  const brandStartFrame = winkEnd + 25;

  // Tagline animation
  const taglineOpacity = interpolate(frame, [winkEnd + 50, winkEnd + 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [winkEnd + 50, winkEnd + 65], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  // Calculate mascot position
  const mascotX = finalPhase ? finalX : walkX;
  const mascotY = finalPhase
    ? finalY
    : frame < wakeEnd
    ? 0
    : walkY - walkBounce;
  const mascotScale = finalPhase
    ? Math.max(0, logoFinalScale)
    : frame < sleepEnd
    ? breathingScale
    : stretchScale;
  const mascotRotation = frame < sleepEnd ? sleepingTilt : 0;

  // Sparkles data (appear during wake phase)
  const sparkles = [
    { x: -80, y: -60, size: 24, delay: sleepEnd + 5, color: colors.accent },
    { x: 100, y: -40, size: 20, delay: sleepEnd + 10, color: colors.secondary },
    { x: -60, y: 40, size: 18, delay: sleepEnd + 15, color: colors.success },
    { x: 80, y: 60, size: 22, delay: sleepEnd + 8, color: colors.primary },
    { x: 0, y: -80, size: 26, delay: sleepEnd + 12, color: colors.accent },
  ];

  // Footprints data (appear during walk phase)
  const footprints = [
    { x: -20, y: 20, rotation: -10, delay: wakeEnd + 5 },
    { x: -50, y: 25, rotation: -15, delay: wakeEnd + 15 },
    { x: -80, y: 35, rotation: -5, delay: wakeEnd + 25 },
    { x: -95, y: 55, rotation: 20, delay: wakeEnd + 35 },
    { x: -90, y: 85, rotation: 45, delay: wakeEnd + 45 },
    { x: -70, y: 110, rotation: 60, delay: wakeEnd + 55 },
  ];

  // Zzz opacity (fade out when waking)
  const zzzOpacity = interpolate(frame, [sleepEnd - 10, sleepEnd + 5], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cloud that mascot sleeps on
  const mainCloudOpacity = interpolate(frame, [wakeEnd, wakeEnd + 30], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #e8f4fc 0%, ${colors.background} 50%, #fef0e6 100%)`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Background clouds */}
      <Cloud x={100} y={150} scale={0.8} opacity={0.7} frame={frame} delay={0} />
      <Cloud x={1500} y={200} scale={1} opacity={0.6} frame={frame} delay={10} />
      <Cloud x={300} y={600} scale={0.6} opacity={0.5} frame={frame} delay={20} />
      <Cloud x={1400} y={550} scale={0.7} opacity={0.6} frame={frame} delay={15} />
      <Cloud x={800} y={100} scale={0.5} opacity={0.4} frame={frame} delay={25} />

      {/* Main content container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Main cloud (mascot sleeps on this) */}
        <div
          style={{
            position: "absolute",
            top: 80,
            opacity: mainCloudOpacity,
            transform: `scale(1.5)`,
          }}
        >
          <Cloud x={-100} y={0} scale={1.2} opacity={1} frame={frame} delay={0} />
        </div>

        {/* Footprints trail */}
        <div style={{ position: "absolute", top: "50%", left: "50%" }}>
          {footprints.map((fp, i) => (
            <Footprint key={i} {...fp} frame={frame} />
          ))}
        </div>

        {/* Mascot */}
        <div
          style={{
            position: "relative",
            transform: `
              translateX(${mascotX}px)
              translateY(${mascotY}px)
              scale(${mascotScale})
              rotate(${mascotRotation}deg)
            `,
            transition: "transform 0.1s ease-out",
          }}
        >
          {/* Sleep Zzz */}
          {frame < sleepEnd + 10 && <SleepZzz frame={frame} opacity={zzzOpacity} />}

          {/* Sparkles */}
          {sparkles.map((s, i) => (
            <Sparkle key={i} {...s} frame={frame} />
          ))}

          {/* Mascot image */}
          <div style={{ position: "relative" }}>
            <Img
              src={staticFile("luniqo.png")}
              style={{
                width: 200,
                height: "auto",
                filter: finalPhase
                  ? `drop-shadow(0 20px 40px rgba(90, 157, 201, 0.3))`
                  : "drop-shadow(0 10px 20px rgba(0,0,0,0.1))",
              }}
            />

          </div>
        </div>

        {/* Brand name - appears in final phase */}
        {finalPhase && (
          <div style={{ display: "flex", marginTop: 30 }}>
            {brandName.split("").map((char, index) => {
              const charDelay = brandStartFrame + index * 4;
              const charOpacity = interpolate(
                frame,
                [charDelay, charDelay + 10],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              const charY = interpolate(
                frame,
                [charDelay, charDelay + 10],
                [20, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.back(3)),
                }
              );
              const charScale = spring({
                frame: frame - charDelay,
                fps,
                config: { damping: 10, stiffness: 150 },
              });

              return (
                <span
                  key={index}
                  style={{
                    fontSize: 72,
                    fontWeight: 800,
                    color: colors.primary,
                    fontFamily: "system-ui, sans-serif",
                    opacity: charOpacity,
                    transform: `translateY(${charY}px) scale(${Math.max(0, charScale)})`,
                    display: "inline-block",
                    textShadow: "0 4px 20px rgba(90, 157, 201, 0.3)",
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        )}

        {/* Tagline */}
        {finalPhase && (
          <div
            style={{
              opacity: taglineOpacity,
              transform: `translateY(${taglineY}px)`,
              textAlign: "center",
              marginTop: 15,
            }}
          >
            <p
              style={{
                fontSize: 32,
                color: colors.text,
                fontFamily: "system-ui, sans-serif",
                margin: 0,
                fontWeight: 500,
                letterSpacing: 1,
              }}
            >
              La gestion de crèche, simplifiée
            </p>
            <div
              style={{
                width: 180,
                height: 4,
                background: `linear-gradient(90deg, ${colors.secondary}, ${colors.primary})`,
                borderRadius: 2,
                margin: "15px auto 0",
                opacity: interpolate(frame, [winkEnd + 65, winkEnd + 80], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scaleX(${interpolate(
                  frame,
                  [winkEnd + 65, winkEnd + 80],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )})`,
              }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
