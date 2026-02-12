import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { colors } from "../../colors";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // === PHASE 1: Big dramatic words (0-4s) ===
  const words = ["PAPERASSE", "STRESS", "CHAOS"];
  const wordDuration = fps * 1.2;

  // === PHASE 2: "STOP" (4-5s) ===
  const stopStart = fps * 4;

  // === PHASE 3: Transition text (5-8s) ===
  const transitionStart = fps * 5.5;

  // Scene fade out
  const sceneOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        opacity: sceneOpacity,
        overflow: "hidden",
      }}
    >
      {/* Animated gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${50 + Math.sin(frame * 0.02) * 20}% ${50 + Math.cos(frame * 0.02) * 20}%, ${colors.primary}15 0%, transparent 50%)`,
        }}
      />

      {/* Big dramatic words - one at a time */}
      {words.map((word, index) => {
        const wordStart = index * wordDuration;
        const wordEnd = wordStart + wordDuration;
        const isVisible = frame >= wordStart && frame < stopStart;

        // Explosive entrance
        const enterProgress = spring({
          frame: frame - wordStart,
          fps,
          config: { damping: 8, stiffness: 200, mass: 0.5 },
        });

        // Exit animation
        const exitProgress = interpolate(
          frame,
          [wordEnd - 10, wordEnd],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Scale from huge to normal
        const scale = interpolate(
          Math.max(0, enterProgress),
          [0, 1],
          [3, 1],
          { extrapolateRight: "clamp" }
        );

        // Blur effect
        const blur = interpolate(
          Math.max(0, enterProgress),
          [0, 0.5, 1],
          [20, 5, 0],
          { extrapolateRight: "clamp" }
        );

        // Rotation
        const rotation = interpolate(
          Math.max(0, enterProgress),
          [0, 1],
          [-10, 0],
          { extrapolateRight: "clamp" }
        );

        // Glitch offset
        const glitchX = frame % 3 === 0 && frame >= wordStart && frame < wordStart + 15
          ? (Math.random() - 0.5) * 20
          : 0;

        if (!isVisible) return null;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 1 - exitProgress,
            }}
          >
            {/* Red glitch layer */}
            <span
              style={{
                position: "absolute",
                fontSize: 200,
                fontWeight: 900,
                color: "#ff0040",
                fontFamily: "system-ui, -apple-system, sans-serif",
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${glitchX + 4}px, 2px)`,
                filter: `blur(${blur}px)`,
                opacity: 0.7,
                letterSpacing: -5,
              }}
            >
              {word}
            </span>
            {/* Main text */}
            <span
              style={{
                fontSize: 200,
                fontWeight: 900,
                color: "#ffffff",
                fontFamily: "system-ui, -apple-system, sans-serif",
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${glitchX}px, 0)`,
                filter: `blur(${blur}px)`,
                letterSpacing: -5,
                textShadow: "0 0 100px rgba(255,255,255,0.5)",
              }}
            >
              {word}
            </span>
          </div>
        );
      })}

      {/* STOP - Big impact */}
      {frame >= stopStart && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Flash effect */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#fff",
              opacity: interpolate(
                frame,
                [stopStart, stopStart + 3, stopStart + 8],
                [1, 0.8, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          />

          {/* STOP text */}
          <span
            style={{
              fontSize: 300,
              fontWeight: 900,
              color: colors.primary,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: -10,
              transform: `scale(${spring({
                frame: frame - stopStart,
                fps,
                config: { damping: 10, stiffness: 300 },
              })})`,
              opacity: interpolate(
                frame,
                [transitionStart - 10, transitionStart],
                [1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              textShadow: `0 0 60px ${colors.primary}80`,
            }}
          >
            STOP.
          </span>
        </div>
      )}

      {/* Transition text */}
      {frame >= transitionStart && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {/* "Il existe" - slides from left */}
          <div
            style={{
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 60,
                fontWeight: 400,
                color: "#ffffff60",
                fontFamily: "system-ui, -apple-system, sans-serif",
                transform: `translateX(${interpolate(
                  frame,
                  [transitionStart, transitionStart + 20],
                  [-200, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) }
                )}px)`,
                opacity: interpolate(
                  frame,
                  [transitionStart, transitionStart + 15],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              Il existe
            </span>
          </div>

          {/* "une meilleure" */}
          <div style={{ display: "flex", gap: 25, overflow: "hidden" }}>
            <span
              style={{
                fontSize: 90,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "system-ui, -apple-system, sans-serif",
                transform: `translateY(${interpolate(
                  frame,
                  [transitionStart + 10, transitionStart + 30],
                  [100, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) }
                )}px)`,
                opacity: interpolate(
                  frame,
                  [transitionStart + 10, transitionStart + 25],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              une meilleure
            </span>
          </div>

          {/* "SOLUTION" - big and colorful */}
          <span
            style={{
              fontSize: 140,
              fontWeight: 900,
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.success})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: -3,
              transform: `scale(${spring({
                frame: frame - transitionStart - 25,
                fps,
                config: { damping: 12, stiffness: 150 },
              })})`,
              textShadow: "none",
            }}
          >
            SOLUTION.
          </span>
        </div>
      )}

      {/* Vertical accent lines */}
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 0,
          bottom: 0,
          width: 4,
          background: `linear-gradient(180deg, transparent, ${colors.primary}, transparent)`,
          opacity: interpolate(frame, [fps * 2, fps * 3], [0, 0.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scaleY(${interpolate(frame, [fps * 2, fps * 3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 0,
          bottom: 0,
          width: 4,
          background: `linear-gradient(180deg, transparent, ${colors.secondary}, transparent)`,
          opacity: interpolate(frame, [fps * 2.5, fps * 3.5], [0, 0.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scaleY(${interpolate(frame, [fps * 2.5, fps * 3.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
        }}
      />
    </AbsoluteFill>
  );
};
