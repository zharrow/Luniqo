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
import { CheckboxAnimated, TaskList } from "../components/ui/CheckboxAnimated";
import { Toast } from "../components/ui/Toast";

/**
 * Scene 06 - Employee (60-70s)
 * EmployeeDailyCompliance: Tâches réglementaires, Observations, Validation repas
 * Texte: "Procédures intégrées. Moins d'oubli."
 */

export const Scene06_Employee: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Delays
  const tabletDelay = 0;
  const headerDelay = 20;
  const tasksDelay = 40;
  const task1CheckDelay = 80;
  const task2CheckDelay = 110;
  const task3CheckDelay = 140;
  const mealDelay = 170;
  const toastDelay = 200;
  const textDelay = 230;

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
    { label: "Relevé température frigo 08h", checked: frame > task1CheckDelay, animateAt: task1CheckDelay },
    { label: "Vérification allergènes repas", checked: frame > task2CheckDelay, animateAt: task2CheckDelay },
    { label: "Nettoyage plan de travail", checked: frame > task3CheckDelay, animateAt: task3CheckDelay },
    { label: "Contrôle réception livraison", checked: false, animateAt: 9999 },
  ];

  // Meal validation
  const mealValidated = frame > mealDelay + 40;

  // Text animations
  const text1Opacity = interpolate(frame, [textDelay, textDelay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const text2Opacity = interpolate(frame, [textDelay + 30, textDelay + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
        <TabletFrame width={900} height={650}>
          <div
            style={{
              height: "100%",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    backgroundColor: colors.secondary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors.foreground,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  MD
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: colors.foreground,
                      fontFamily: "system-ui, sans-serif",
                      margin: 0,
                    }}
                  >
                    Bonjour, Marie
                  </h1>
                  <p
                    style={{
                      fontSize: 12,
                      color: `${colors.foreground}70`,
                      fontFamily: "system-ui, sans-serif",
                      margin: 0,
                    }}
                  >
                    Mardi 13 février • Salle Papillons
                  </p>
                </div>
              </div>
              <Badge variant="primary">3/4 tâches</Badge>
            </div>

            {/* Main content grid */}
            <div style={{ display: "flex", gap: 20, flex: 1 }}>
              {/* Tasks column */}
              <div
                style={{
                  flex: 1,
                  opacity: getOpacity(tasksDelay),
                  transform: `translateY(${getTranslateY(tasksDelay)}px)`,
                }}
              >
                <Card style={{ height: "100%" }}>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: colors.foreground,
                      fontFamily: "system-ui, sans-serif",
                      margin: "0 0 16px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>📋</span> Tâches du jour
                  </h3>
                  <TaskList tasks={tasks} />
                </Card>
              </div>

              {/* Right column */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Meal validation */}
                <div
                  style={{
                    opacity: getOpacity(mealDelay),
                    transform: `translateY(${getTranslateY(mealDelay)}px)`,
                    flex: 1,
                  }}
                >
                  <Card style={{ height: "100%" }}>
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: colors.foreground,
                        fontFamily: "system-ui, sans-serif",
                        margin: "0 0 16px 0",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>🍽️</span> Validation repas
                    </h3>

                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: colors.foreground,
                          fontFamily: "system-ui, sans-serif",
                          marginBottom: 4,
                        }}
                      >
                        Déjeuner - 13/02
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: `${colors.foreground}70`,
                          fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        Purée de carottes, Poulet grillé, Compote pomme
                      </div>
                    </div>

                    {/* Children meal status */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {["Lucas", "Emma", "Noah", "Léa", "Hugo"].map((name, i) => {
                        const isValidated = mealValidated && i < 3;
                        return (
                          <div
                            key={name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 10px",
                              backgroundColor: isValidated ? `${colors.success}15` : colors.background,
                              borderRadius: 8,
                              border: `1px solid ${isValidated ? colors.success : colors.border}`,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                color: colors.foreground,
                                fontFamily: "system-ui, sans-serif",
                              }}
                            >
                              {name}
                            </span>
                            {isValidated && (
                              <span style={{ fontSize: 10, color: colors.success }}>✓</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Validate button */}
                    <button
                      style={{
                        width: "100%",
                        padding: "12px 20px",
                        backgroundColor: mealValidated ? colors.success : colors.primary,
                        color: colors.card,
                        border: "none",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "system-ui, sans-serif",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "background-color 0.2s",
                      }}
                    >
                      {mealValidated ? (
                        <>
                          <span>✓</span> Repas validés
                        </>
                      ) : (
                        "Valider les repas"
                      )}
                    </button>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Toast notification */}
          {frame > toastDelay && (
            <Toast
              message="Tâche enregistrée avec succès !"
              type="success"
              showAt={toastDelay}
              duration={60}
            />
          )}
        </TabletFrame>
      </div>

      {/* Bottom text */}
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
        <span
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: "system-ui, sans-serif",
            opacity: text1Opacity,
          }}
        >
          Procédures intégrées.
        </span>
        <span
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: colors.success,
            fontFamily: "system-ui, sans-serif",
            opacity: text2Opacity,
          }}
        >
          Moins d'oubli.
        </span>
      </div>
    </AbsoluteFill>
  );
};
