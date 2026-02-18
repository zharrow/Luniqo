/**
 * Scene 04 - HACCP Focus (32-48s) - REFACTORED
 *
 * ARCHITECTURE DÉCLARATIVE:
 * - Animations définies via specs (DATA)
 * - Logique isolée dans le moteur (ENGINE)
 * - Composants UI préservés (BrowserFrame, Sidebar, etc.)
 *
 * HACCPCompliancePanel: Journal horodaté, Températures validées, Allergies signalées
 */

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors, shadows, springConfig } from '../colors';
import { BrowserFrame } from '../components/layout/BrowserFrame';
import { Sidebar } from '../components/ui/Sidebar';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { KineticWord } from '../components/ui/KineticText';
import { BeatMoment } from '../components/transitions';
import { AnimatedCounter } from '../components/kinetic';

// Engine imports
import type { AnimationSpec } from '../dsl/animationSpec';
import { animateToStyle, sceneOpacity } from '../engine';

// ============================================
// ANIMATION SPECS (DATA)
// ============================================

/**
 * Créer des specs pour une entrée avec fade + slide
 */
const createEntrySpecs = (startFrame: number, slideDistance: number = 20): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 15 },
  { type: 'slide-up', startFrame, duration: 25, distance: slideDistance, easing: 'easeOutExpo' },
];

/**
 * Créer des specs pour une entrée avec slide horizontal
 */
const createSlideXSpecs = (startFrame: number, distance: number = 30): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 15 },
  { type: 'slide-left', startFrame, duration: 20, distance, easing: 'easeOutExpo' },
];

/**
 * Specs pour sidebar slide-in
 */
const createSidebarSpecs = (startFrame: number): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 15 },
  { type: 'slide-left', startFrame, duration: 30, distance: 260, easing: 'easeOutExpo' },
];

/**
 * Specs pour scale pop
 */
const createPopSpecs = (startFrame: number): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 20 },
  { type: 'pop', startFrame, spring: 'smooth' },
];

/**
 * Specs pour le badge de conformité
 */
const createBadgeSpecs = (startFrame: number): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 15 },
  { type: 'pop', startFrame, spring: 'bouncy' },
  { type: 'rotate', startFrame, duration: 30 },
];

// ============================================
// SCENE TIMING (DATA)
// ============================================

const TIMING = {
  sidebar: 0,
  header: 15,
  temp: 30,
  allergy: 80,
  badge: 100,
  text: 140,
  uiShrink: 120, // textDelay - 20
  fadeOut: { start: 440, duration: 40 },
};

// ============================================
// TEMPERATURE LOG COMPONENT
// ============================================

interface TempEntry {
  time: string;
  equipment: string;
  temp: string;
  status: 'ok' | 'warning';
}

const TemperatureLog: React.FC<{ entries: TempEntry[]; delay: number }> = ({ entries, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Card style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: 'system-ui, sans-serif',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>🌡️</span> Relevés de température
        </h3>
        <Badge variant="success">Tous conformes</Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map((entry, index) => {
          const entrySpecs = createSlideXSpecs(delay + index * 12);
          const style = animateToStyle(entrySpecs, frame, fps);

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: colors.background,
                borderRadius: 10,
                gap: 16,
                ...style,
              }}
            >
              <span style={{ fontSize: 12, color: `${colors.foreground}70`, fontFamily: 'monospace', width: 50 }}>
                {entry.time}
              </span>
              <span style={{ fontSize: 13, color: colors.foreground, fontFamily: 'system-ui, sans-serif', flex: 1 }}>
                {entry.equipment}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: entry.status === 'ok' ? colors.success : '#f59e0b',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {entry.temp}
              </span>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: entry.status === 'ok' ? `${colors.success}20` : '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 12 }}>{entry.status === 'ok' ? '✓' : '⚠'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ============================================
// ALLERGY PANEL COMPONENT
// ============================================

const AllergyPanel: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelSpecs = createPopSpecs(delay);
  const style = animateToStyle(panelSpecs, frame, fps);

  const allergies = [
    { child: 'Lucas M.', allergies: ['Arachides', 'Fruits à coque'], severity: 'severe' },
    { child: 'Emma D.', allergies: ['Lactose'], severity: 'moderate' },
    { child: 'Noah P.', allergies: ['Gluten'], severity: 'moderate' },
  ];

  return (
    <Card style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: colors.foreground,
            fontFamily: 'system-ui, sans-serif',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>⚠️</span> Allergies signalées
        </h3>
        <Badge variant="warning">{allergies.length} enfants</Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allergies.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 14px',
              backgroundColor: item.severity === 'severe' ? '#fef2f2' : '#fffbeb',
              borderRadius: 10,
              borderLeft: `3px solid ${item.severity === 'severe' ? colors.destructive : '#f59e0b'}`,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: colors.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: colors.foreground,
              }}
            >
              {item.child.split(' ').map(n => n[0]).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.foreground, fontFamily: 'system-ui, sans-serif' }}>
                {item.child}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {item.allergies.map((allergy, i) => (
                  <Badge key={i} variant={item.severity === 'severe' ? 'danger' : 'warning'} size="sm">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ============================================
// COMPLIANCE BADGE COMPONENT
// ============================================

const ComplianceBadge: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpecs = createBadgeSpecs(delay);
  const style = animateToStyle(badgeSpecs, frame, fps);

  if (frame < delay) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: colors.success,
        color: colors.card,
        padding: '16px 28px',
        borderRadius: 16,
        boxShadow: `0 8px 30px ${colors.success}40`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        ...style,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={colors.card} fillOpacity="0.2" />
        <path d="M8 12L11 15L16 9" stroke={colors.card} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>100% Conforme</div>
        <div style={{ fontSize: 11, fontFamily: 'system-ui, sans-serif', opacity: 0.9 }}>Dernière vérification: il y a 2h</div>
      </div>
    </div>
  );
};

// ============================================
// MAIN SCENE
// ============================================

export const Scene04_HACCP: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tempEntries: TempEntry[] = [
    { time: '08:15', equipment: 'Frigo principal', temp: '4.2°C', status: 'ok' },
    { time: '08:20', equipment: 'Frigo desserts', temp: '3.8°C', status: 'ok' },
    { time: '08:25', equipment: 'Congélateur', temp: '-18.5°C', status: 'ok' },
    { time: '12:30', equipment: 'Frigo principal', temp: '4.1°C', status: 'ok' },
  ];

  // Scene fade out via engine
  const fadeOut = sceneOpacity(frame, 0, 480, 0, TIMING.fadeOut.duration);

  // Sidebar animation
  const sidebarSpecs = createSidebarSpecs(TIMING.sidebar);
  const sidebarStyle = animateToStyle(sidebarSpecs, frame, fps);

  // Header animation
  const headerSpecs = createEntrySpecs(TIMING.header);
  const headerStyle = animateToStyle(headerSpecs, frame, fps);

  // Temp panel animation
  const tempSpecs = createEntrySpecs(TIMING.temp);
  const tempStyle = animateToStyle(tempSpecs, frame, fps);

  // Allergy panel animation
  const allergySpecs = createEntrySpecs(TIMING.allergy);
  const allergyStyle = animateToStyle(allergySpecs, frame, fps);

  // UI shrink specs (custom - uses scale with specific range)
  const { fade, scale } = require('../engine/motionPrimitives');
  const uiScale = 1 - fade(frame, TIMING.uiShrink, 40, 0, 0.28); // 1 → 0.72
  const uiTranslateY = -fade(frame, TIMING.uiShrink, 40, 0, 80); // 0 → -80

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
      }}
    >
      {/* Browser frame with HACCP panel */}
      <div
        style={{
          transform: `scale(${uiScale}) translateY(${uiTranslateY}px)`,
          transformOrigin: 'center top',
        }}
      >
        <BrowserFrame width={1600} height={900} url="app.luniqo.com/haccp">
          <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
            {/* Sidebar */}
            <div style={sidebarStyle}>
              <Sidebar activeIndex={1} />
            </div>

            {/* Main content */}
            <div
              style={{
                flex: 1,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...headerStyle }}>
                <div>
                  <h1
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: colors.foreground,
                      fontFamily: 'system-ui, sans-serif',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span>🛡️</span> Module HACCP
                  </h1>
                  <p style={{ fontSize: 14, color: `${colors.foreground}70`, fontFamily: 'system-ui, sans-serif', margin: '4px 0 0 0' }}>
                    Journal de traçabilité • Aujourd'hui
                  </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: `${colors.success}10`,
                      padding: '8px 16px',
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>📦</span>
                    <AnimatedCounter from={0} to={128} startFrame={TIMING.header + 20} duration={50} fontSize={16} fontWeight={700} color={colors.success} entryAnimation="none" />
                    <span style={{ fontSize: 13, color: `${colors.foreground}70` }}>produits tracés</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: `${colors.primary}10`,
                      padding: '8px 16px',
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🌡️</span>
                    <AnimatedCounter from={0} to={24} startFrame={TIMING.header + 30} duration={40} fontSize={16} fontWeight={700} color={colors.primary} entryAnimation="none" />
                    <span style={{ fontSize: 13, color: `${colors.foreground}70` }}>relevés/jour</span>
                  </div>
                </div>
              </div>

              {/* Content grid */}
              <div style={{ display: 'flex', gap: 24, flex: 1 }}>
                <div style={{ flex: 1, ...tempStyle }}>
                  <TemperatureLog entries={tempEntries} delay={TIMING.temp + 20} />
                </div>
                <div style={{ flex: 1, ...allergyStyle }}>
                  <AllergyPanel delay={TIMING.allergy} />
                </div>
              </div>

              {/* Compliance badge */}
              <ComplianceBadge delay={TIMING.badge} />
            </div>
          </div>
        </BrowserFrame>
      </div>

      {/* Bottom kinetic text */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
        }}
      >
        <KineticWord startFrame={TIMING.text} fontSize={42} fontWeight={600} color={colors.foreground} direction="left" float={false}>
          Traçabilité complète.
        </KineticWord>
        <KineticWord startFrame={TIMING.text + 40} fontSize={42} fontWeight={600} color={colors.foreground} direction="up" float={false}>
          Historique sécurisé.
        </KineticWord>
        <KineticWord startFrame={TIMING.text + 80} fontSize={42} fontWeight={700} color={colors.success} direction="right" impact glow glowColor={colors.success}>
          Contrôles simplifiés.
        </KineticWord>
      </div>

      {/* Beat moment */}
      <BeatMoment text="100% Conforme." startFrame={300} duration={50} color={colors.success} style="slam" />
    </AbsoluteFill>
  );
};

export default Scene04_HACCP;
