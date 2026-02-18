/**
 * Scene 14 - Final (78-85s) - REFACTORED
 *
 * ARCHITECTURE DÉCLARATIVE:
 * - Animations définies via specs (DATA)
 * - Logique isolée dans le moteur (ENGINE)
 *
 * Split screen: HACCP, Dashboard, Planning
 * Texte final: "Luniqo - La conformité maîtrisée."
 */

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from 'remotion';
import { colors, shadows, springConfig } from '../colors';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { KineticWord } from '../components/ui/KineticText';
import { TypewriterText } from '../components/kinetic';

// Engine imports
import type { AnimationSpec } from '../dsl/animationSpec';
import { animateToStyle } from '../engine';

// ============================================
// ANIMATION SPECS FACTORIES (DATA)
// ============================================

const createCardSpecs = (
  startFrame: number,
  position: 'left' | 'center' | 'right'
): AnimationSpec[] => {
  const xDistance = position === 'left' ? 50 : position === 'right' ? -50 : 0;
  const specs: AnimationSpec[] = [
    { type: 'fade-in', startFrame, duration: 20 },
    { type: 'slide-up', startFrame, duration: 30, distance: 30, easing: 'easeOutExpo' },
    { type: 'pop', startFrame, spring: 'smooth' },
  ];

  if (xDistance !== 0) {
    specs.push({
      type: xDistance > 0 ? 'slide-right' : 'slide-left',
      startFrame,
      duration: 30,
      distance: Math.abs(xDistance),
      easing: 'easeOutExpo',
    });
  }

  return specs;
};

const createLogoSpecs = (startFrame: number): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 20 },
  { type: 'pop', startFrame, spring: 'gentle' },
];

const createUnderlineSpecs = (startFrame: number): AnimationSpec[] => [
  { type: 'reveal-left', startFrame, duration: 30 },
];

// ============================================
// SCENE TIMING (DATA)
// ============================================

const TIMING = {
  card1: 10,
  card2: 25,
  card3: 40,
  logo: 80,
  tagline: 120,
  finalText: 150,
};

// ============================================
// PREVIEW CARD COMPONENT
// ============================================

interface PreviewCardProps {
  title: string;
  icon: string;
  color: string;
  delay: number;
  position: 'left' | 'center' | 'right';
}

const PreviewCard: React.FC<PreviewCardProps> = ({ title, icon, color, delay, position }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpecs = createCardSpecs(delay, position);
  const style = animateToStyle(cardSpecs, frame, fps);

  return (
    <div style={style}>
      <Card padding={24} style={{ minWidth: 340, minHeight: 200 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            {icon}
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.foreground, fontFamily: 'system-ui, sans-serif', margin: 0 }}>
              {title}
            </h3>
            <Badge variant="success" size="sm" style={{ marginTop: 4 }}>
              Conforme
            </Badge>
          </div>
        </div>

        {/* Mock content lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[85, 65, 50].map((width, i) => (
            <div
              key={i}
              style={{
                height: 10,
                width: `${width}%`,
                backgroundColor: i === 0 ? `${color}30` : colors.border,
                borderRadius: 5,
              }}
            />
          ))}
        </div>

        {/* Mini chart representation */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, alignItems: 'flex-end' }}>
          {[40, 55, 45, 70, 60].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: h,
                backgroundColor: i === 4 ? color : `${color}40`,
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

// ============================================
// MAIN SCENE
// ============================================

export const Scene14_Final: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoSpecs = createLogoSpecs(TIMING.logo);
  const logoStyle = animateToStyle(logoSpecs, frame, fps);

  // Underline animation (via primitive for clip-path reveal)
  const { revealLeft, pulse } = require('../engine/motionPrimitives');
  const underlineWidth = revealLeft(frame, TIMING.finalText + 30, 30);

  // Background pulse
  const bgPulse = pulse(frame, 0.03, 0.05);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '50%',
          height: '60%',
          background: `radial-gradient(ellipse, ${colors.primary}15 0%, transparent 70%)`,
          transform: `scale(${bgPulse})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '50%',
          height: '60%',
          background: `radial-gradient(ellipse, ${colors.secondary}20 0%, transparent 70%)`,
          transform: `scale(${bgPulse * 1.1})`,
        }}
      />

      {/* Split screen cards */}
      <div style={{ display: 'flex', gap: 30, marginBottom: 60 }}>
        <PreviewCard title="Module HACCP" icon="🛡️" color={colors.success} delay={TIMING.card1} position="left" />
        <PreviewCard title="Tableau de bord" icon="📊" color={colors.primary} delay={TIMING.card2} position="center" />
        <PreviewCard title="Planning" icon="📅" color={colors.secondary} delay={TIMING.card3} position="right" />
      </div>

      {/* Logo and brand */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          ...logoStyle,
        }}
      >
        {/* Logo */}
        <Img
          src={staticFile('luniqo.png')}
          style={{
            width: 100,
            height: 'auto',
            filter: `drop-shadow(0 10px 30px ${colors.primary}30)`,
          }}
        />

        {/* Brand name */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: colors.primary,
            fontFamily: 'system-ui, sans-serif',
            margin: 0,
            letterSpacing: -1,
          }}
        >
          Luniqo
        </h1>
      </div>

      {/* Tagline with kinetic text */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 0,
          right: 0,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <KineticWord startFrame={TIMING.tagline} fontSize={36} fontWeight={600} color={colors.foreground} direction="left" float={false}>
            La conformité
          </KineticWord>
          <KineticWord startFrame={TIMING.tagline + 15} fontSize={36} fontWeight={700} color={colors.success} direction="scale" impact glow glowColor={colors.success}>
            maîtrisée.
          </KineticWord>
        </div>

        {/* Animated underline */}
        <div
          style={{
            width: `${underlineWidth}%`,
            maxWidth: 300,
            height: 4,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.success})`,
            borderRadius: 2,
          }}
        />
      </div>

      {/* CTA hint with typewriter effect */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <TypewriterText
          text="luniqo.com"
          startFrame={TIMING.finalText + 60}
          speed={0.4}
          cursor={true}
          cursorChar="_"
          cursorBlinkRate={12}
          fontSize={18}
          fontWeight={500}
          color={`${colors.foreground}80`}
          humanize={true}
          style={{ letterSpacing: '0.05em' }}
        />
      </div>
    </AbsoluteFill>
  );
};

export default Scene14_Final;
