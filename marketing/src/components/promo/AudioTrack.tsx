import {
  Audio,
  Sequence,
  useVideoConfig,
  interpolate,
  useCurrentFrame,
  staticFile,
} from "remotion";
import { AUDIO_CONFIG } from "../../audio-config";

// Background music component with fade in/out
const BackgroundMusic: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { music } = AUDIO_CONFIG;

  // Calculate volume with fades
  const fadeInVolume = interpolate(
    frame,
    [0, music.fadeInDuration],
    [0, music.volume],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fadeOutVolume = interpolate(
    frame,
    [durationInFrames - music.fadeOutDuration, durationInFrames],
    [music.volume, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const volume = Math.min(fadeInVolume, fadeOutVolume);

  return (
    <Audio
      src={staticFile(music.file)}
      volume={volume}
      loop // Loop if music is shorter than video
    />
  );
};

// Single voiceover segment
const VoiceoverSegment: React.FC<{
  file: string;
  startFrame: number;
  durationFrames: number;
  volume: number;
}> = ({ file, startFrame, durationFrames, volume }) => {
  return (
    <Sequence from={startFrame} durationInFrames={durationFrames}>
      <Audio src={staticFile(file)} volume={volume} />
    </Sequence>
  );
};

// All voiceover segments
const Voiceover: React.FC = () => {
  const { voiceover } = AUDIO_CONFIG;

  return (
    <>
      {voiceover.segments.map((segment) => (
        <VoiceoverSegment
          key={segment.id}
          file={segment.file}
          startFrame={segment.startFrame}
          durationFrames={segment.durationFrames}
          volume={voiceover.volume}
        />
      ))}
    </>
  );
};

// Main audio track component
export const AudioTrack: React.FC<{
  enableMusic?: boolean;
  enableVoiceover?: boolean;
}> = ({ enableMusic = true, enableVoiceover = true }) => {
  return (
    <>
      {enableMusic && <BackgroundMusic />}
      {enableVoiceover && <Voiceover />}
    </>
  );
};

// Export for testing individual segments
export { BackgroundMusic, Voiceover, VoiceoverSegment };
