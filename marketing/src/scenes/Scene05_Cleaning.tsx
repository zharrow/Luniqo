/**
 * Scene 05 - Cleaning Module - REFACTORED
 *
 * ARCHITECTURE DÉCLARATIVE:
 * - Animations définies via specs (DATA)
 * - Logique isolée dans le moteur (ENGINE)
 * - Composants UI préservés (BrowserFrame, Sidebar, etc.)
 *
 * Présentation du module nettoyage: salles, tâches, sessions
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
import { AnimatedCounter } from '../components/kinetic';

// Engine imports
import type { AnimationSpec } from '../dsl/animationSpec';
import { animateToStyle, sceneOpacity } from '../engine';

// ============================================
// ANIMATION SPECS FACTORIES (DATA)
// ============================================

const createEntrySpecs = (startFrame: number, slideDistance: number = 20): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 15 },
  { type: 'slide-up', startFrame, duration: 25, distance: slideDistance, easing: 'easeOutExpo' },
];

const createSlideXSpecs = (startFrame: number, distance: number = 20): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 15 },
  { type: 'slide-left', startFrame, duration: 20, distance, easing: 'easeOutExpo' },
];

const createSidebarSpecs = (startFrame: number): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 15 },
  { type: 'slide-left', startFrame, duration: 30, distance: 260, easing: 'easeOutExpo' },
];

const createPopSpecs = (startFrame: number): AnimationSpec[] => [
  { type: 'fade-in', startFrame, duration: 15 },
  { type: 'pop', startFrame, spring: 'smooth' },
];

// ============================================
// SCENE TIMING (DATA)
// ============================================

const TIMING = {
  sidebar: 0,
  header: 15,
  rooms: 30,
  room1: 50,
  room2: 70,
  room3: 90,
  tasks: 120,
  text: 200,
  uiShrink: 180, // textDelay - 20
  fadeOut: { start: 320, duration: 40 },
};

// ============================================
// ROOM CARD COMPONENT
// ============================================

interface RoomCardProps {
  name: string;
  emoji: string;
  tasks: number;
  completedTasks: number;
  status: 'pending' | 'in_progress' | 'completed';
  delay: number;
}

const RoomCard: React.FC<RoomCardProps> = ({ name, emoji, tasks, completedTasks, status, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpecs = createPopSpecs(delay);
  const style = animateToStyle(cardSpecs, frame, fps);

  const statusColors = {
    pending: { bg: colors.background, border: colors.border, text: 'En attente' },
    in_progress: { bg: `${colors.primary}15`, border: colors.primary, text: 'En cours' },
    completed: { bg: `${colors.success}15`, border: colors.success, text: 'Terminé' },
  };

  const statusStyle = statusColors[status];
  const progress = (completedTasks / tasks) * 100;

  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        boxShadow: shadows.sm,
        border: `2px solid ${statusStyle.border}`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: statusStyle.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            {emoji}
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: colors.foreground, fontFamily: 'system-ui, sans-serif', margin: 0 }}>
              {name}
            </h4>
            <p style={{ fontSize: 12, color: `${colors.foreground}60`, fontFamily: 'system-ui, sans-serif', margin: '2px 0 0 0' }}>
              {completedTasks}/{tasks} tâches
            </p>
          </div>
        </div>
        <Badge variant={status === 'completed' ? 'success' : status === 'in_progress' ? 'primary' : 'default'}>
          {statusStyle.text}
        </Badge>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: status === 'completed' ? colors.success : colors.primary,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
};

// ============================================
// TASK TEMPLATE COMPONENT
// ============================================

interface TaskTemplateProps {
  name: string;
  frequency: string;
  category: string;
  delay: number;
}

const TaskTemplate: React.FC<TaskTemplateProps> = ({ name, frequency, category, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const taskSpecs = createSlideXSpecs(delay);
  const style = animateToStyle(taskSpecs, frame, fps);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: colors.background,
        borderRadius: 10,
        gap: 12,
        ...style,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.primary }} />
      <span style={{ flex: 1, fontSize: 13, color: colors.foreground, fontFamily: 'system-ui, sans-serif' }}>
        {name}
      </span>
      <Badge variant="default" size="sm">{category}</Badge>
      <span style={{ fontSize: 11, color: `${colors.foreground}60`, fontFamily: 'system-ui, sans-serif' }}>
        {frequency}
      </span>
    </div>
  );
};

// ============================================
// MAIN SCENE
// ============================================

export const Scene05_Cleaning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade out
  const fadeOut = sceneOpacity(frame, 0, 360, 0, TIMING.fadeOut.duration);

  // Animation styles via engine
  const sidebarStyle = animateToStyle(createSidebarSpecs(TIMING.sidebar), frame, fps);
  const headerStyle = animateToStyle(createEntrySpecs(TIMING.header), frame, fps);
  const roomsStyle = animateToStyle(createEntrySpecs(TIMING.rooms), frame, fps);
  const tasksStyle = animateToStyle(createEntrySpecs(TIMING.tasks), frame, fps);

  // UI shrink (custom range)
  const { fade } = require('../engine/motionPrimitives');
  const uiScale = 1 - fade(frame, TIMING.uiShrink, 40, 0, 0.25); // 1 → 0.75
  const uiTranslateY = -fade(frame, TIMING.uiShrink, 40, 0, 60); // 0 → -60

  // Data
  const rooms = [
    { name: 'Salle Papillons', emoji: '🦋', tasks: 8, completedTasks: 8, status: 'completed' as const },
    { name: 'Salle Coccinelles', emoji: '🐞', tasks: 6, completedTasks: 4, status: 'in_progress' as const },
    { name: 'Cuisine', emoji: '🍳', tasks: 10, completedTasks: 0, status: 'pending' as const },
  ];

  const taskTemplates = [
    { name: 'Nettoyage des sols', frequency: 'Quotidien', category: 'Hygiène' },
    { name: 'Désinfection des jouets', frequency: 'Quotidien', category: 'Hygiène' },
    { name: 'Nettoyage des sanitaires', frequency: '2x/jour', category: 'Sanitaire' },
    { name: 'Aération des locaux', frequency: '3x/jour', category: 'Bien-être' },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
      }}
    >
      {/* Browser frame */}
      <div
        style={{
          transform: `scale(${uiScale}) translateY(${uiTranslateY}px)`,
          transformOrigin: 'center top',
        }}
      >
        <BrowserFrame width={1600} height={900} url="app.luniqo.com/sessions">
          <div style={{ display: 'flex', height: '100%' }}>
            {/* Sidebar */}
            <div style={sidebarStyle}>
              <Sidebar activeIndex={0} />
            </div>

            {/* Main content */}
            <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
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
                    <span>🧹</span> Sessions de nettoyage
                  </h1>
                  <p style={{ fontSize: 14, color: `${colors.foreground}70`, fontFamily: 'system-ui, sans-serif', margin: '4px 0 0 0' }}>
                    Jeudi 13 février 2025 • Session du matin
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Badge variant="primary">3 salles</Badge>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: `${colors.success}15`, padding: '6px 12px', borderRadius: 8 }}>
                    <AnimatedCounter from={0} to={12} startFrame={30} duration={45} fontSize={14} fontWeight={600} color={colors.success} entryAnimation="none" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.success }}>/24 tâches</span>
                  </div>
                </div>
              </div>

              {/* Content grid */}
              <div style={{ display: 'flex', gap: 24, flex: 1 }}>
                {/* Rooms column */}
                <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 16, ...roomsStyle }}>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: `${colors.foreground}80`,
                      fontFamily: 'system-ui, sans-serif',
                      margin: 0,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Salles à nettoyer
                  </h3>
                  <RoomCard {...rooms[0]} delay={TIMING.room1} />
                  <RoomCard {...rooms[1]} delay={TIMING.room2} />
                  <RoomCard {...rooms[2]} delay={TIMING.room3} />
                </div>

                {/* Tasks templates column */}
                <div style={{ flex: 1, ...tasksStyle }}>
                  <Card style={{ height: '100%' }}>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: colors.foreground,
                        fontFamily: 'system-ui, sans-serif',
                        margin: '0 0 16px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>📋</span> Tâches standards
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {taskTemplates.map((task, index) => (
                        <TaskTemplate key={task.name} {...task} delay={TIMING.tasks + 20 + index * 15} />
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </BrowserFrame>
      </div>

      {/* Bottom kinetic text */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
        }}
      >
        <KineticWord startFrame={TIMING.text} fontSize={38} fontWeight={600} color={colors.foreground} direction="left" float={false}>
          Organisation simplifiée.
        </KineticWord>
        <KineticWord startFrame={TIMING.text + 40} fontSize={38} fontWeight={700} color={colors.primary} direction="right" impact glow glowColor={colors.primary}>
          Traçabilité complète.
        </KineticWord>
      </div>
    </AbsoluteFill>
  );
};

export default Scene05_Cleaning;
