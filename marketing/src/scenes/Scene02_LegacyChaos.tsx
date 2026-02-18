/**
 * Scene 02 - Legacy Chaos (8-16s) - REFACTORED
 *
 * ARCHITECTURE DÉCLARATIVE:
 * - Animations définies via specs (DATA)
 * - Logique isolée dans le moteur (ENGINE)
 * - Composants purement présentationnels (VIEW)
 *
 * CONTENU:
 * - Texte kinétique au centre (focus)
 * - Chaos desktop en fond flou (contexte)
 * - Progression de tension vers "Risque d'erreur"
 */

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors } from '../colors';

// Engine & DSL imports
import type { AnimationSpec } from '../dsl/animationSpec';
import { animateToStyle, sceneOpacity } from '../engine';

// ============================================
// ANIMATION SPECS (DATA)
// ============================================

/**
 * Specs pour le premier texte "Données dispersées."
 * Direction: gauche → centre
 */
const text1Specs: AnimationSpec[] = [
  { type: 'fade-in', startFrame: 50, duration: 15 },
  { type: 'slide-left', startFrame: 50, duration: 25, distance: 100, easing: 'easeOutExpo' },
  { type: 'float', startFrame: 75, amplitude: 3, speed: 0.04 },
];

/**
 * Specs pour le deuxième texte "Suivi manuel."
 * Direction: droite → centre
 */
const text2Specs: AnimationSpec[] = [
  { type: 'fade-in', startFrame: 80, duration: 15 },
  { type: 'slide-right', startFrame: 80, duration: 25, distance: 100, easing: 'easeOutExpo' },
  { type: 'float', startFrame: 105, amplitude: 3, speed: 0.03 },
];

/**
 * Specs pour le troisième texte "Risque d'erreur." (IMPACT)
 * Animation plus dramatique avec pop et glow
 */
const text3ImpactSpecs: AnimationSpec[] = [
  { type: 'fade-in', startFrame: 110, duration: 8 },
  { type: 'slide-up', startFrame: 110, duration: 20, distance: 50, easing: 'easeOutExpo' },
  { type: 'pop', startFrame: 110, spring: 'impact' },
  { type: 'pulse', startFrame: 130, amplitude: 2, speed: 0.08 },
];

/**
 * Specs pour le conteneur central
 */
const containerSpecs: AnimationSpec[] = [
  { type: 'fade-in', startFrame: 40, duration: 20 },
  { type: 'scale', startFrame: 80, duration: 130, scale: 0.92, easing: 'linear' }, // Zoom in progressif
];

// ============================================
// SCENE TIMING (DATA)
// ============================================

const SCENE_TIMING = {
  duration: 240,
  fadeOutStart: 210,
  fadeOutDuration: 30,
};

// ============================================
// CHAOS BACKGROUND COMPONENT
// ============================================

/**
 * ChaosBackground - Bureau chaotique en arrière-plan
 *
 * Utilise le moteur pour les animations de base,
 * mais garde certains calculs inline pour les effets complexes
 * (comme le blur progressif qui n'est pas une animation standard).
 */
const ChaosBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Windows data (pure data, no logic)
  const windows = [
    { x: 80, y: 100, w: 380, h: 280, rotation: -4, color: '#217346', delay: 0 },
    { x: 420, y: 320, w: 360, h: 260, rotation: 3, color: '#0078d4', delay: 5 },
    { x: 820, y: 80, w: 320, h: 240, rotation: 5, color: '#2563eb', delay: 10 },
    { x: 160, y: 460, w: 300, h: 240, rotation: -3, color: '#34c759', delay: 15 },
    { x: 850, y: 400, w: 340, h: 220, rotation: 6, color: '#f59e0b', delay: 20 },
    { x: 560, y: 180, w: 280, h: 180, rotation: -2, color: '#dc2626', delay: 25 },
  ];

  const errorBadges = [
    { x: 200, y: 320, delay: 30 },
    { x: 680, y: 360, delay: 45 },
    { x: 1050, y: 280, delay: 60 },
    { x: 380, y: 640, delay: 75 },
  ];

  // Progressive blur via engine (using primitive directly for custom range)
  const { fade } = require('../engine/motionPrimitives');
  const bgBlur = 2 + fade(frame, 0, 120, 0, 6); // 2 → 8
  const bgOpacity = 0.6 - fade(frame, 0, 120, 0, 0.3); // 0.6 → 0.3
  const redTint = fade(frame, 140, 60, 0, 0.15);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        filter: `blur(${bgBlur}px)`,
        opacity: bgOpacity,
      }}
    >
      {/* Desktop gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B8DD6 100%)',
          opacity: 0.15,
        }}
      />

      {/* Red danger tint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#dc2626',
          opacity: redTint,
          pointerEvents: 'none',
        }}
      />

      {/* Windows */}
      {windows.map((win, i) => {
        const windowSpecs: AnimationSpec[] = [
          { type: 'fade-in', startFrame: win.delay, duration: 15 },
          { type: 'float', startFrame: win.delay + 15, amplitude: 5, speed: 0.03 },
        ];
        const style = animateToStyle(windowSpecs, frame, fps);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: win.x,
              top: win.y,
              width: win.w,
              height: win.h,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              transform: `rotate(${win.rotation}deg) ${style.transform || ''}`,
              opacity: style.opacity,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}
          >
            {/* Window header */}
            <div
              style={{
                height: 32,
                backgroundColor: '#f6f6f6',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 12,
                gap: 6,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840' }} />
            </div>

            {/* Content */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 8, width: '70%', backgroundColor: win.color, borderRadius: 4, opacity: 0.3 }} />
              <div style={{ height: 6, width: '90%', backgroundColor: '#e5e7eb', borderRadius: 3 }} />
              <div style={{ height: 6, width: '60%', backgroundColor: '#e5e7eb', borderRadius: 3 }} />
              <div style={{ height: 6, width: '80%', backgroundColor: '#e5e7eb', borderRadius: 3 }} />
            </div>
          </div>
        );
      })}

      {/* Error badges */}
      {errorBadges.map((badge, i) => {
        const badgeSpecs: AnimationSpec[] = [
          { type: 'fade-in', startFrame: badge.delay, duration: 10 },
          { type: 'float', startFrame: badge.delay + 10, amplitude: 8, speed: 0.04 },
          { type: 'pulse', startFrame: badge.delay + 10, amplitude: 20, speed: 0.15 },
        ];
        const style = animateToStyle(badgeSpecs, frame, fps);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: badge.x,
              top: badge.y,
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              ...style,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)',
            }}
          >
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>!</span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// KINETIC TEXT COMPONENT (DECLARATIVE)
// ============================================

interface KineticTextProps {
  text: string;
  animations: AnimationSpec[];
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  isImpact?: boolean;
}

/**
 * KineticText - Texte animé via le moteur
 *
 * N'utilise AUCUNE logique d'animation inline.
 * Tout est résolu par le moteur via les specs.
 */
const KineticText: React.FC<KineticTextProps> = ({
  text,
  animations,
  fontSize = 64,
  fontWeight = 500,
  color = '#374151',
  isImpact = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Vérifier si l'animation a démarré
  const firstSpec = animations[0];
  if (firstSpec && frame < firstSpec.startFrame) return null;

  // Résoudre les animations via le moteur
  const style = animateToStyle(animations, frame, fps);

  // Calculer le glow pour les textes impact (via primitive)
  const { fade } = require('../engine/motionPrimitives');
  const glowIntensity = isImpact ? 30 + fade(frame, firstSpec?.startFrame || 0, 70, 0, 30) : 0;
  const glowPulse = isImpact ? 1 + Math.sin(frame * 0.12) * 0.3 : 1;

  return (
    <div
      style={{
        ...style,
        fontSize,
        fontWeight,
        color,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        letterSpacing: '-0.03em',
        textShadow: isImpact
          ? `0 0 ${glowIntensity * glowPulse}px ${color}60, 0 0 ${glowIntensity * 2 * glowPulse}px ${color}30, 0 4px 20px rgba(0,0,0,0.15)`
          : '0 4px 20px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

// ============================================
// MAIN SCENE
// ============================================

export const Scene02_LegacyChaos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade out
  const fadeOut = sceneOpacity(
    frame,
    0,
    SCENE_TIMING.duration,
    0, // No fade in
    SCENE_TIMING.fadeOutDuration
  );

  // Container animation
  const containerStyle = animateToStyle(containerSpecs, frame, fps);

  // Vignette intensity (progressive)
  const { fade } = require('../engine/motionPrimitives');
  const vignetteIntensity = 0.1 + fade(frame, 60, 120, 0, 0.45);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#e8eaed',
        opacity: fadeOut,
      }}
    >
      {/* Chaos background */}
      <ChaosBackground />

      {/* Vignette for focus */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 70% 60% at center, transparent 20%, rgba(0, 0, 0, ${vignetteIntensity}) 100%)`,
          pointerEvents: 'none',
          zIndex: 40,
        }}
      />

      {/* Central kinetic text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          zIndex: 100,
          ...containerStyle,
        }}
      >
        {/* First phrase */}
        <KineticText
          text="Données dispersées."
          animations={text1Specs}
          fontSize={64}
          fontWeight={500}
          color="#374151"
        />

        {/* Second phrase */}
        <KineticText
          text="Suivi manuel."
          animations={text2Specs}
          fontSize={64}
          fontWeight={500}
          color="#374151"
        />

        {/* Third phrase - IMPACT */}
        <KineticText
          text="Risque d'erreur."
          animations={text3ImpactSpecs}
          fontSize={80}
          fontWeight={700}
          color={colors.destructive}
          isImpact
        />
      </div>
    </AbsoluteFill>
  );
};

export default Scene02_LegacyChaos;
