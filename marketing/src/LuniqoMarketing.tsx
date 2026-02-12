import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { IntroScene } from "./components/IntroScene";
import { FeaturesScene } from "./components/FeaturesScene";
import { HACCPScene } from "./components/HACCPScene";
import { MultiSiteScene } from "./components/MultiSiteScene";
import { CTAScene } from "./components/CTAScene";
import { colors } from "./colors";

export const LuniqoMarketing: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene durations in frames (at 30fps)
  const introDuration = fps * 8;      // 8 seconds
  const featuresDuration = fps * 18;  // 18 seconds
  const haccpDuration = fps * 10;     // 10 seconds
  const multiSiteDuration = fps * 8;  // 8 seconds
  const ctaDuration = fps * 7;        // 7 seconds

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Scene 1: Logo + Intro */}
      <Sequence from={0} durationInFrames={introDuration}>
        <IntroScene />
      </Sequence>

      {/* Scene 2: Main Features */}
      <Sequence from={introDuration} durationInFrames={featuresDuration}>
        <FeaturesScene />
      </Sequence>

      {/* Scene 3: HACCP Module */}
      <Sequence from={introDuration + featuresDuration} durationInFrames={haccpDuration}>
        <HACCPScene />
      </Sequence>

      {/* Scene 4: Multi-Site Support */}
      <Sequence from={introDuration + featuresDuration + haccpDuration} durationInFrames={multiSiteDuration}>
        <MultiSiteScene />
      </Sequence>

      {/* Scene 5: Call to Action */}
      <Sequence from={introDuration + featuresDuration + haccpDuration + multiSiteDuration} durationInFrames={ctaDuration}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
