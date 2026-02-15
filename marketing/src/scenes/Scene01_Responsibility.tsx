import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors, springConfig } from "../colors";

/**
 * Scene 01 - Responsibility (0-8s)
 * Kinetic typography centrée
 * Texte: "Diriger une crèche implique une responsabilité réglementaire constante."
 * Animation lente et élégante
 */

interface WordProps {
  word: string;
  index: number;
  totalWords: number;
  startFrame: number;
  isHighlight?: boolean;
}

const Word: React.FC<WordProps> = ({ word, index, startFrame, isHighlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wordDelay = startFrame + index * 6; // Stagger each word

  // Opacity animation
  const opacity = interpolate(
    frame,
    [wordDelay, wordDelay + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Y translation (enter from below)
  const translateY = interpolate(
    frame,
    [wordDelay, wordDelay + 20],
    [20, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // Subtle scale
  const scale = spring({
    frame: frame - wordDelay,
    fps,
    config: springConfig.gentle,
  });

  // Blur effect on entry
  const blur = interpolate(
    frame,
    [wordDelay, wordDelay + 10],
    [4, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        transform: `translateY(${translateY}px) scale(${Math.max(0.98, scale)})`,
        filter: `blur(${blur}px)`,
        marginRight: 16,
        color: isHighlight ? colors.primary : colors.foreground,
        fontWeight: isHighlight ? 700 : 500,
      }}
    >
      {word}
    </span>
  );
};

export const Scene01_Responsibility: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Text content split into words
  const line1Words = ["Diriger", "une", "crèche"];
  const line2Words = ["implique", "une", "responsabilité"];
  const line3Words = ["réglementaire", "constante."];

  // Highlight words (key message)
  const highlightWords = ["responsabilité", "réglementaire", "constante."];

  // Background subtle pulse
  const bgPulse = interpolate(
    Math.sin(frame * 0.02),
    [-1, 1],
    [0.98, 1.02]
  );

  // Decorative elements fade in
  const decorOpacity = interpolate(
    frame,
    [60, 90],
    [0, 0.3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Final fade out
  const sceneOpacity = interpolate(
    frame,
    [200, 240],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
      }}
    >
      {/* Background decorative shapes */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.secondary}30 0%, transparent 70%)`,
          transform: `scale(${bgPulse})`,
          opacity: decorOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          right: "15%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
          transform: `scale(${bgPulse * 1.1})`,
          opacity: decorOpacity,
        }}
      />

      {/* Main text container */}
      <div
        style={{
          textAlign: "center",
          maxWidth: 1200,
          padding: "0 60px",
        }}
      >
        {/* Line 1 */}
        <div
          style={{
            fontSize: 64,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.3,
            marginBottom: 8,
          }}
        >
          {line1Words.map((word, index) => (
            <Word
              key={word + index}
              word={word}
              index={index}
              totalWords={line1Words.length}
              startFrame={15}
              isHighlight={highlightWords.includes(word)}
            />
          ))}
        </div>

        {/* Line 2 */}
        <div
          style={{
            fontSize: 64,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.3,
            marginBottom: 8,
          }}
        >
          {line2Words.map((word, index) => (
            <Word
              key={word + index}
              word={word}
              index={index}
              totalWords={line2Words.length}
              startFrame={40}
              isHighlight={highlightWords.includes(word)}
            />
          ))}
        </div>

        {/* Line 3 */}
        <div
          style={{
            fontSize: 64,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.3,
          }}
        >
          {line3Words.map((word, index) => (
            <Word
              key={word + index}
              word={word}
              index={index}
              totalWords={line3Words.length}
              startFrame={70}
              isHighlight={highlightWords.includes(word)}
            />
          ))}
        </div>

        {/* Underline accent */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: interpolate(
                frame,
                [120, 160],
                [0, 200],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              height: 4,
              backgroundColor: colors.primary,
              borderRadius: 2,
              opacity: interpolate(
                frame,
                [120, 140],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
