import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { colors } from "./colors";
import {
  Scene01_Responsibility,
  Scene02_LegacyChaos,
  Scene03_Dashboard,
  Scene04_HACCP,
  Scene05_Cleaning,
  Scene06_TabletSession,
  Scene07_EmployeeManagement,
  Scene08_ParentsChildren,
  Scene09_ParentPWA,
  Scene10_Administration,
  Scene11_MultiSite,
  Scene12_Employee,
  Scene13_UX,
  Scene14_Final,
} from "./scenes";
import { KineticTransition } from "./components/transitions";

/**
 * LuniqoPremium - Vidéo promotionnelle premium (~150 secondes)
 *
 * Positionnement stratégique:
 * - Différenciation principale: conformité réglementaire (HACCP)
 * - Image: premium, professionnelle, structurée
 * - 100% mockups UI recréés (aucune vidéo humaine)
 * - Respect strict du design system
 * - Transitions kinétiques entre les scènes
 *
 * Structure complète (14 scènes + transitions):
 * Scene 01 (8s) → Trans (1.5s) → Scene 02 (7s) → Trans (1.5s) →
 * Scene 03 (12s) → Trans (1s) → Scene 04 (12s) → Trans (1s) →
 * Scene 05 (10s) → Trans (1s) → Scene 06 (9s) → Trans (1s) →
 * Scene 07 (9s) → Trans (1s) → Scene 08 (9s) → Trans (1s) →
 * Scene 09 (9s) → Trans (1s) → Scene 10 (10s) → Trans (1s) →
 * Scene 11 (10s) → Trans (1s) → Scene 12 (9s) → Trans (1s) →
 * Scene 13 (7s) → Scene 14 (7s)
 *
 * Durée totale: ~150 secondes @ 30fps = 4500 frames
 */

export const LuniqoPremium: React.FC = () => {
  const { fps } = useVideoConfig();

  // Transition durations
  const transShort = Math.round(fps * 1);    // 30 frames (1s)
  const transMedium = Math.round(fps * 1.5); // 45 frames (1.5s)

  // Scene durations
  const scene01Duration = fps * 8;           // 240 frames - Intro
  const trans01Duration = transMedium;       // 45 frames
  const scene02Duration = fps * 7;           // 210 frames - Legacy Chaos
  const trans02Duration = transMedium;       // 45 frames
  const scene03Duration = fps * 12;          // 360 frames - Dashboard
  const trans03Duration = transShort;        // 30 frames
  const scene04Duration = fps * 12;          // 360 frames - HACCP
  const trans04Duration = transShort;        // 30 frames
  const scene05Duration = fps * 10;          // 300 frames - Cleaning
  const trans05Duration = transShort;        // 30 frames
  const scene06Duration = fps * 9;           // 270 frames - Tablet Session
  const trans06Duration = transShort;        // 30 frames
  const scene07Duration = fps * 9;           // 270 frames - Employee Management
  const trans07Duration = transShort;        // 30 frames
  const scene08Duration = fps * 9;           // 270 frames - Parents & Children
  const trans08Duration = transShort;        // 30 frames
  const scene09Duration = fps * 9;           // 270 frames - Parent PWA
  const trans09Duration = transShort;        // 30 frames
  const scene10Duration = fps * 10;          // 300 frames - Administration
  const trans10Duration = transShort;        // 30 frames
  const scene11Duration = fps * 10;          // 300 frames - Multi-Site
  const trans11Duration = transShort;        // 30 frames
  const scene12Duration = fps * 9;           // 270 frames - Employee Daily
  const trans12Duration = transShort;        // 30 frames
  const scene13Duration = fps * 7;           // 210 frames - UX
  const scene14Duration = fps * 7;           // 210 frames - Final

  // Calculate cumulative start frames
  let currentFrame = 0;

  const scene01Start = currentFrame;
  currentFrame += scene01Duration;

  const trans01Start = currentFrame;
  currentFrame += trans01Duration;

  const scene02Start = currentFrame;
  currentFrame += scene02Duration;

  const trans02Start = currentFrame;
  currentFrame += trans02Duration;

  const scene03Start = currentFrame;
  currentFrame += scene03Duration;

  const trans03Start = currentFrame;
  currentFrame += trans03Duration;

  const scene04Start = currentFrame;
  currentFrame += scene04Duration;

  const trans04Start = currentFrame;
  currentFrame += trans04Duration;

  const scene05Start = currentFrame;
  currentFrame += scene05Duration;

  const trans05Start = currentFrame;
  currentFrame += trans05Duration;

  const scene06Start = currentFrame;
  currentFrame += scene06Duration;

  const trans06Start = currentFrame;
  currentFrame += trans06Duration;

  const scene07Start = currentFrame;
  currentFrame += scene07Duration;

  const trans07Start = currentFrame;
  currentFrame += trans07Duration;

  const scene08Start = currentFrame;
  currentFrame += scene08Duration;

  const trans08Start = currentFrame;
  currentFrame += trans08Duration;

  const scene09Start = currentFrame;
  currentFrame += scene09Duration;

  const trans09Start = currentFrame;
  currentFrame += trans09Duration;

  const scene10Start = currentFrame;
  currentFrame += scene10Duration;

  const trans10Start = currentFrame;
  currentFrame += trans10Duration;

  const scene11Start = currentFrame;
  currentFrame += scene11Duration;

  const trans11Start = currentFrame;
  currentFrame += trans11Duration;

  const scene12Start = currentFrame;
  currentFrame += scene12Duration;

  const trans12Start = currentFrame;
  currentFrame += trans12Duration;

  const scene13Start = currentFrame;
  currentFrame += scene13Duration;

  const scene14Start = currentFrame;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Scene 01: Responsibility - Kinetic typography */}
      <Sequence from={scene01Start} durationInFrames={scene01Duration}>
        <Scene01_Responsibility />
      </Sequence>

      {/* Transition 01: Problem → Solution */}
      <Sequence from={trans01Start} durationInFrames={trans01Duration}>
        <KineticTransition
          text="Découvrez Luniqo."
          style="impact"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.primary}
        />
      </Sequence>

      {/* Scene 02: Legacy Chaos - Mockup désorganisé */}
      <Sequence from={scene02Start} durationInFrames={scene02Duration}>
        <Scene02_LegacyChaos />
      </Sequence>

      {/* Transition 02: Chaos → Dashboard */}
      <Sequence from={trans02Start} durationInFrames={trans02Duration}>
        <KineticTransition
          text="La solution."
          subtext="Une plateforme, tout sous contrôle."
          style="zoom"
          backgroundColor="#ffffff"
          textColor={colors.foreground}
          accentColor={colors.primary}
        />
      </Sequence>

      {/* Scene 03: Dashboard - Overview propre */}
      <Sequence from={scene03Start} durationInFrames={scene03Duration}>
        <Scene03_Dashboard />
      </Sequence>

      {/* Transition 03: Dashboard → HACCP */}
      <Sequence from={trans03Start} durationInFrames={trans03Duration}>
        <KineticTransition
          text="Conformité garantie."
          style="reveal"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.success}
        />
      </Sequence>

      {/* Scene 04: HACCP - Panel conformité */}
      <Sequence from={scene04Start} durationInFrames={scene04Duration}>
        <Scene04_HACCP />
      </Sequence>

      {/* Transition 04: HACCP → Cleaning */}
      <Sequence from={trans04Start} durationInFrames={trans04Duration}>
        <KineticTransition
          text="Nettoyage organisé."
          style="split"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.primary}
        />
      </Sequence>

      {/* Scene 05: Cleaning - Module nettoyage */}
      <Sequence from={scene05Start} durationInFrames={scene05Duration}>
        <Scene05_Cleaning />
      </Sequence>

      {/* Transition 05: Cleaning → Tablet */}
      <Sequence from={trans05Start} durationInFrames={trans05Duration}>
        <KineticTransition
          text="En action."
          style="minimal"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.success}
        />
      </Sequence>

      {/* Scene 06: Tablet Session - Vue tablette nettoyage */}
      <Sequence from={scene06Start} durationInFrames={scene06Duration}>
        <Scene06_TabletSession />
      </Sequence>

      {/* Transition 06: Tablet → Employee Management */}
      <Sequence from={trans06Start} durationInFrames={trans06Duration}>
        <KineticTransition
          text="Votre équipe."
          style="reveal"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.primary}
        />
      </Sequence>

      {/* Scene 07: Employee Management - Gestion des employés */}
      <Sequence from={scene07Start} durationInFrames={scene07Duration}>
        <Scene07_EmployeeManagement />
      </Sequence>

      {/* Transition 07: Employees → Parents/Children */}
      <Sequence from={trans07Start} durationInFrames={trans07Duration}>
        <KineticTransition
          text="Vos familles."
          style="minimal"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.secondary}
        />
      </Sequence>

      {/* Scene 08: Parents & Children - Gestion familles */}
      <Sequence from={scene08Start} durationInFrames={scene08Duration}>
        <Scene08_ParentsChildren />
      </Sequence>

      {/* Transition 08: Parents → PWA */}
      <Sequence from={trans08Start} durationInFrames={trans08Duration}>
        <KineticTransition
          text="Toujours connecté."
          style="zoom"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.success}
        />
      </Sequence>

      {/* Scene 09: Parent PWA - Application mobile parents */}
      <Sequence from={scene09Start} durationInFrames={scene09Duration}>
        <Scene09_ParentPWA />
      </Sequence>

      {/* Transition 09: PWA → Administration */}
      <Sequence from={trans09Start} durationInFrames={trans09Duration}>
        <KineticTransition
          text="Gestion claire."
          style="reveal"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.primary}
        />
      </Sequence>

      {/* Scene 10: Administration - Facturation */}
      <Sequence from={scene10Start} durationInFrames={scene10Duration}>
        <Scene10_Administration />
      </Sequence>

      {/* Transition 10: Administration → Multi-Site */}
      <Sequence from={trans10Start} durationInFrames={trans10Duration}>
        <KineticTransition
          text="Multi-sites."
          style="split"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.primary}
        />
      </Sequence>

      {/* Scene 11: Multi-Site - Supervision centralisée */}
      <Sequence from={scene11Start} durationInFrames={scene11Duration}>
        <Scene11_MultiSite />
      </Sequence>

      {/* Transition 11: Multi-Site → Employee Daily */}
      <Sequence from={trans11Start} durationInFrames={trans11Duration}>
        <KineticTransition
          text="Au quotidien."
          subtext="Simplifiez leur travail."
          style="minimal"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.secondary}
        />
      </Sequence>

      {/* Scene 12: Employee Daily - Tâches quotidiennes */}
      <Sequence from={scene12Start} durationInFrames={scene12Duration}>
        <Scene12_Employee />
      </Sequence>

      {/* Transition 12: Employee → UX */}
      <Sequence from={trans12Start} durationInFrames={trans12Duration}>
        <KineticTransition
          text="Expérience premium."
          style="reveal"
          backgroundColor={colors.background}
          textColor={colors.foreground}
          accentColor={colors.accent}
        />
      </Sequence>

      {/* Scene 13: UX Premium - Zoom interface */}
      <Sequence from={scene13Start} durationInFrames={scene13Duration}>
        <Scene13_UX />
      </Sequence>

      {/* Scene 14: Final - Split screen + CTA */}
      <Sequence from={scene14Start} durationInFrames={scene14Duration}>
        <Scene14_Final />
      </Sequence>
    </AbsoluteFill>
  );
};
