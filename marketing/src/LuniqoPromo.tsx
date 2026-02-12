import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { HookScene } from "./components/promo/HookScene";
import { SolutionScene } from "./components/promo/SolutionScene";
import { ModulesScene } from "./components/promo/ModulesScene";
import { BenefitsScene } from "./components/promo/BenefitsScene";
import { PromoCtaScene } from "./components/promo/PromoCtaScene";
import { AudioTrack } from "./components/promo/AudioTrack";
import { colors } from "./colors";

// Set to true when audio files are ready
const ENABLE_AUDIO = false;
const ENABLE_MUSIC = true;
const ENABLE_VOICEOVER = true;

export const LuniqoPromo: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene durations in frames (at 30fps)
  const hookDuration = fps * 8;        // 8 seconds - Problem/Hook
  const solutionDuration = fps * 6;    // 6 seconds - Luniqo intro
  const modulesDuration = fps * 20;    // 20 seconds - Modules showcase
  const benefitsDuration = fps * 10;   // 10 seconds - Benefits
  const ctaDuration = fps * 6;         // 6 seconds - CTA

  // Total: 50 seconds

  let currentFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Audio Track - Enable when files are ready */}
      {ENABLE_AUDIO && (
        <AudioTrack
          enableMusic={ENABLE_MUSIC}
          enableVoiceover={ENABLE_VOICEOVER}
        />
      )}

      {/* Scene 1: Hook - Problem statement */}
      <Sequence from={currentFrame} durationInFrames={hookDuration}>
        <HookScene />
      </Sequence>

      {/* Scene 2: Solution - Introducing Luniqo */}
      <Sequence from={(currentFrame += hookDuration)} durationInFrames={solutionDuration}>
        <SolutionScene />
      </Sequence>

      {/* Scene 3: Modules - Feature showcase */}
      <Sequence from={(currentFrame += solutionDuration)} durationInFrames={modulesDuration}>
        <ModulesScene />
      </Sequence>

      {/* Scene 4: Benefits - Key metrics */}
      <Sequence from={(currentFrame += modulesDuration)} durationInFrames={benefitsDuration}>
        <BenefitsScene />
      </Sequence>

      {/* Scene 5: CTA - Call to action */}
      <Sequence from={(currentFrame += benefitsDuration)} durationInFrames={ctaDuration}>
        <PromoCtaScene />
      </Sequence>
    </AbsoluteFill>
  );
};
