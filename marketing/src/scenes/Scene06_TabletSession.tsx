import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors, shadows, springConfig } from "../colors";
import { TabletFrame } from "../components/layout/TabletFrame";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Toast } from "../components/ui/Toast";
import { KineticWord } from "../components/ui/KineticText";

/**
 * Scene 06 - Tablet Session View
 * Vue tablette pour les sessions de nettoyage journalier
 * Interface tactile optimisée pour les employés
 * Texte: "Interface tactile. Validation instantanée."
 */

interface CleaningTaskProps {
  label: string;
  checked: boolean;
  animateAt: number;
  index: number;
}

const CleaningTask: React.FC<CleaningTaskProps> = ({ label, checked, animateAt, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryDelay = 60 + index * 12;
  const opacity = interpolate(frame, [entryDelay, entryDelay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = interpolate(frame, [entryDelay, entryDelay + 20], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const checkScale = spring({
    frame: frame - animateAt,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const isAnimatingCheck = frame >= animateAt;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px 20px",
        backgroundColor: checked ? `${colors.success}10` : colors.card,
        borderRadius: 14,
        gap: 16,
        opacity,
        transform: `translateX(${translateX}px)`,
        border: `2px solid ${checked ? colors.success : colors.border}`,
        transition: "all 0.3s ease",
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: checked ? colors.success : colors.background,
          border: `2px solid ${checked ? colors.success : colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: isAnimatingCheck ? `scale(${Math.min(1.2, checkScale)})` : "scale(1)",
          transition: "background-color 0.2s, border-color 0.2s",
        }}
      >
        {checked && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12L10 17L19 8"
              stroke={colors.card}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Label */}
      <span
        style={{
          flex: 1,
          fontSize: 16,
          fontWeight: 500,
          color: checked ? `${colors.foreground}70` : colors.foreground,
          fontFamily: "system-ui, sans-serif",
          textDecoration: checked ? "line-through" : "none",
        }}
      >
        {label}
      </span>

      {/* Touch indicator */}
      {!checked && (
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: colors.primary,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: colors.card,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Valider
        </div>
      )}
    </div>
  );
};

const ProgressRing: React.FC<{ progress: number; delay: number }> = ({ progress, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const animatedProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 30, stiffness: 60 },
  });

  const currentProgress = progress * Math.min(1, animatedProgress);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (currentProgress / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 120, height: 120, opacity }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={colors.border}
          strokeWidth="10"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={colors.success}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {Math.round(currentProgress)}%
        </div>
        <div
          style={{
            fontSize: 11,
            color: `${colors.foreground}60`,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          complété
        </div>
      </div>
    </div>
  );
};

export const Scene06_TabletSession: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delays
  const tabletDelay = 0;
  const headerDelay = 20;
  const progressDelay = 40;
  const task1CheckDelay = 100;
  const task2CheckDelay = 140;
  const task3CheckDelay = 180;
  const toastDelay = 200;
  const textDelay = 220;

  // Animation helpers
  const getOpacity = (delay: number) => interpolate(
    frame,
    [delay, delay + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const getTranslateY = (delay: number) => interpolate(
    frame,
    [delay, delay + 25],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const tabletScale = spring({
    frame: frame - tabletDelay,
    fps,
    config: springConfig.smooth,
  });

  // Scene exit
  const fadeOut = interpolate(frame, [280, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tasks data
  const tasks = [
    { label: "Nettoyage des sols", checked: frame > task1CheckDelay, animateAt: task1CheckDelay },
    { label: "Désinfection des surfaces", checked: frame > task2CheckDelay, animateAt: task2CheckDelay },
    { label: "Nettoyage des jouets", checked: frame > task3CheckDelay, animateAt: task3CheckDelay },
    { label: "Rangement du matériel", checked: false, animateAt: 9999 },
    { label: "Aération de la pièce", checked: false, animateAt: 9999 },
  ];

  const completedCount = tasks.filter(t => t.checked).length;
  const progress = (completedCount / tasks.length) * 100;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Tablet frame */}
      <div
        style={{
          transform: `scale(${Math.max(0.95, tabletScale)})`,
          opacity: getOpacity(tabletDelay),
        }}
      >
        <TabletFrame width={1100} height={750}>
          <div
            style={{
              height: "100%",
              padding: 32,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              backgroundColor: colors.background,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: getOpacity(headerDelay),
                transform: `translateY(${getTranslateY(headerDelay)}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: `${colors.primary}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                  }}
                >
                  🦋
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: colors.foreground,
                      fontFamily: "system-ui, sans-serif",
                      margin: 0,
                    }}
                  >
                    Salle Papillons
                  </h1>
                  <p
                    style={{
                      fontSize: 14,
                      color: `${colors.foreground}60`,
                      fontFamily: "system-ui, sans-serif",
                      margin: "4px 0 0 0",
                    }}
                  >
                    Session du matin • 13 février
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Badge variant="primary" size="sm">{completedCount}/{tasks.length} tâches</Badge>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: colors.secondary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors.foreground,
                    }}
                  >
                    MD
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: colors.foreground,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Marie D.
                  </span>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div style={{ display: "flex", gap: 32, flex: 1 }}>
              {/* Tasks list */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                {tasks.map((task, index) => (
                  <CleaningTask
                    key={task.label}
                    {...task}
                    index={index}
                  />
                ))}
              </div>

              {/* Progress panel */}
              <div
                style={{
                  width: 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 20,
                  opacity: getOpacity(progressDelay),
                }}
              >
                <ProgressRing progress={progress} delay={progressDelay} />

                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: colors.foreground,
                      fontFamily: "system-ui, sans-serif",
                      marginBottom: 4,
                    }}
                  >
                    {completedCount === tasks.length ? "Terminé !" : "En cours..."}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: `${colors.foreground}60`,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {tasks.length - completedCount} tâches restantes
                  </div>
                </div>

                {/* Quick actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                  <button
                    style={{
                      padding: "14px 20px",
                      backgroundColor: colors.success,
                      color: colors.card,
                      border: "none",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: "system-ui, sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    Terminer la salle
                  </button>
                  <button
                    style={{
                      padding: "14px 20px",
                      backgroundColor: colors.card,
                      color: colors.foreground,
                      border: `2px solid ${colors.border}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: "system-ui, sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    Signaler un problème
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Toast notification */}
          {frame > toastDelay && (
            <Toast
              message="Tâche validée avec succès !"
              type="success"
              showAt={toastDelay}
              duration={60}
            />
          )}
        </TabletFrame>
      </div>

      {/* Bottom kinetic text */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          gap: 50,
        }}
      >
        <KineticWord
          startFrame={textDelay}
          fontSize={32}
          fontWeight={600}
          color={colors.foreground}
          direction="left"
          float={false}
        >
          Interface tactile.
        </KineticWord>
        <KineticWord
          startFrame={textDelay + 30}
          fontSize={32}
          fontWeight={700}
          color={colors.success}
          direction="right"
          impact
          glow
          glowColor={colors.success}
        >
          Validation instantanée.
        </KineticWord>
      </div>
    </AbsoluteFill>
  );
};
