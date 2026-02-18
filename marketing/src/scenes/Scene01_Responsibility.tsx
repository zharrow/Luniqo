/**
 * Scene 01 - Responsibility (REFACTORED)
 *
 * ARCHITECTURE DÉCLARATIVE:
 * Ce fichier démontre la séparation DATA / ENGINE / COMPOSANT.
 *
 * AVANT (inline):
 * ```tsx
 * const opacity = interpolate(frame, [wordDelay, wordDelay + 15], [0, 1], {...});
 * const translateY = interpolate(frame, [wordDelay, wordDelay + 20], [20, 0], {...});
 * const scale = spring({ frame: frame - wordDelay, fps, config: ... });
 * ```
 *
 * APRÈS (déclaratif):
 * ```tsx
 * const wordAnimations = staggerWordsBlur(15, { delayPerItem: 6 });
 * <AnimatedWord word={word} animations={wordAnimations} index={index} />
 * ```
 *
 * BÉNÉFICES:
 * - Animations définies comme DATA (specs)
 * - Logique d'animation isolée dans le moteur
 * - Composants purement présentationnels
 * - Code testable et déterministe
 */

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors } from '../colors';

// DSL Imports - Animation specs (DATA)
import type { AnimationSpec } from '../dsl/animationSpec';
import { staggerWordsBlur, slideUpFade, gentlePulse } from '../dsl/presets';

// Engine Imports - Pour les animations custom
import { animateToStyle, sceneOpacity } from '../engine';

// Component Imports
import { AnimatedWord } from '../components/animated';

// ============================================
// ANIMATION SPECS (DATA - DÉCLARATIF)
// ============================================

/**
 * Specs pour les mots de la ligne 1
 * Démarre à la frame 15, stagger de 6 frames par mot
 */
const line1Specs = staggerWordsBlur(15, { delayPerItem: 6 });

/**
 * Specs pour les mots de la ligne 2
 * Démarre à la frame 40
 */
const line2Specs = staggerWordsBlur(40, { delayPerItem: 6 });

/**
 * Specs pour les mots de la ligne 3
 * Démarre à la frame 70
 */
const line3Specs = staggerWordsBlur(70, { delayPerItem: 6 });

/**
 * Specs pour le tagline
 * Apparition avec slide up + scale
 */
const taglineSpecs: AnimationSpec[] = [
  { type: 'fade-in', startFrame: 140, duration: 30 },
  { type: 'slide-up', startFrame: 140, duration: 40, distance: 20, easing: 'easeOutExpo' },
  { type: 'scale', startFrame: 140, duration: 40, scale: 0.8, easing: 'easeOutBack' },
];

/**
 * Specs pour les éléments décoratifs
 */
const decorSpecs: AnimationSpec[] = [
  { type: 'fade-in', startFrame: 60, duration: 30 },
];

// ============================================
// SCENE DATA
// ============================================

/**
 * Contenu textuel de la scène
 * Séparé de la logique d'animation
 */
const SCENE_CONTENT = {
  line1: ['Diriger', 'une', 'crèche'],
  line2: ['implique', 'une', 'responsabilité'],
  line3: ['réglementaire', 'constante.'],
  tagline: 'Luniqo simplifie tout.',
  highlightWords: ['responsabilité', 'réglementaire', 'constante.'],
};

/**
 * Timings de la scène
 */
const SCENE_TIMING = {
  startFrame: 0,
  duration: 240,
  fadeOut: 40,
};

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Decorative Background Elements
 *
 * Cercles avec effet de pulsation subtile.
 * Animation via specs déclaratives.
 */
const DecorativeElements: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Résoudre les animations via le moteur
  const decorStyle = animateToStyle(decorSpecs, frame, fps);
  const pulseStyle = animateToStyle(gentlePulse({ amplitude: 2, speed: 0.02 }), frame, fps);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.secondary}30 0%, transparent 70%)`,
          ...decorStyle,
          ...pulseStyle,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '15%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
          ...decorStyle,
          transform: `${decorStyle.transform || ''} scale(1.1)`.trim(),
        }}
      />
    </>
  );
};

/**
 * Animated Text Line
 *
 * Ligne de texte avec stagger par mot.
 * Utilise AnimatedWord du moteur.
 */
interface TextLineProps {
  words: string[];
  animations: AnimationSpec[];
  highlightWords: string[];
}

const TextLine: React.FC<TextLineProps> = ({ words, animations, highlightWords }) => {
  return (
    <div
      style={{
        fontSize: 80,
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1.3,
        marginBottom: 8,
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      {words.map((word, index) => (
        <AnimatedWord
          key={`${word}-${index}`}
          word={word}
          animations={animations}
          index={index}
          isHighlight={highlightWords.includes(word)}
          highlightColor={colors.primary}
          style={{
            fontWeight: highlightWords.includes(word) ? 700 : 500,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Tagline Component
 *
 * Tagline avec animation d'entrée.
 */
const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Résoudre l'animation via le moteur
  const style = animateToStyle(taglineSpecs, frame, fps);

  // Ne pas afficher avant le démarrage
  if (frame < 140) return null;

  return (
    <div
      style={{
        marginTop: 60,
        display: 'flex',
        justifyContent: 'center',
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: colors.secondary,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.02em',
          textShadow: `0 0 40px ${colors.secondary}80`,
        }}
      >
        {SCENE_CONTENT.tagline}
      </span>
    </div>
  );
};

// ============================================
// MAIN SCENE COMPONENT
// ============================================

/**
 * Scene01_Responsibility (Refactored)
 *
 * Scène entièrement refactorisée avec l'architecture déclarative.
 *
 * STRUCTURE:
 * 1. DONNÉES: Textes et timings définis en constantes
 * 2. SPECS: Animations définies via le DSL (staggerWordsBlur, etc.)
 * 3. COMPOSANTS: Purement présentationnels, utilisent le moteur
 */
export const Scene01_Responsibility: React.FC = () => {
  const frame = useCurrentFrame();

  // Opacité de la scène (fade out à la fin)
  const opacity = sceneOpacity(
    frame,
    SCENE_TIMING.startFrame,
    SCENE_TIMING.duration,
    0, // Pas de fade in
    SCENE_TIMING.fadeOut
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      {/* Éléments décoratifs */}
      <DecorativeElements />

      {/* Contenu principal */}
      <div
        style={{
          textAlign: 'center',
          maxWidth: 1200,
          padding: '0 60px',
        }}
      >
        {/* Ligne 1 */}
        <TextLine
          words={SCENE_CONTENT.line1}
          animations={line1Specs}
          highlightWords={SCENE_CONTENT.highlightWords}
        />

        {/* Ligne 2 */}
        <TextLine
          words={SCENE_CONTENT.line2}
          animations={line2Specs}
          highlightWords={SCENE_CONTENT.highlightWords}
        />

        {/* Ligne 3 */}
        <TextLine
          words={SCENE_CONTENT.line3}
          animations={line3Specs}
          highlightWords={SCENE_CONTENT.highlightWords}
        />

        {/* Tagline */}
        <Tagline />
      </div>
    </AbsoluteFill>
  );
};

export default Scene01_Responsibility;
