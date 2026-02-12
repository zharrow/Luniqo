import { interpolate, spring, Easing } from "remotion";

// Smooth easing functions
export const easings = {
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

// Animated text - returns opacity for each character
export const getCharacterAnimation = (
  frame: number,
  charIndex: number,
  startFrame: number,
  staggerDelay: number = 2
) => {
  const charStart = startFrame + charIndex * staggerDelay;
  return interpolate(frame, [charStart, charStart + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// Floating animation
export const getFloatingOffset = (frame: number, speed: number = 0.05, amplitude: number = 10) => {
  return Math.sin(frame * speed) * amplitude;
};

// Parallax effect
export const getParallaxOffset = (frame: number, layer: number, speed: number = 0.5) => {
  return frame * speed * layer;
};

// Scale with bounce
export const getBounceScale = (
  frame: number,
  fps: number,
  startFrame: number = 0
) => {
  return spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 10,
      stiffness: 100,
      mass: 0.5,
    },
  });
};

// Slide in from direction
export const getSlideIn = (
  frame: number,
  startFrame: number,
  direction: "left" | "right" | "up" | "down" = "up",
  distance: number = 100
) => {
  const progress = interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  const offsets = {
    left: { x: -distance * (1 - progress), y: 0 },
    right: { x: distance * (1 - progress), y: 0 },
    up: { x: 0, y: distance * (1 - progress) },
    down: { x: 0, y: -distance * (1 - progress) },
  };

  return {
    ...offsets[direction],
    opacity: progress,
  };
};

// Fade transition between scenes
export const getSceneTransition = (
  frame: number,
  sceneStart: number,
  sceneDuration: number,
  fadeFrames: number = 15
) => {
  const fadeIn = interpolate(frame, [sceneStart, sceneStart + fadeFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [sceneStart + sceneDuration - fadeFrames, sceneStart + sceneDuration],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return Math.min(fadeIn, fadeOut);
};

// Staggered grid animation
export const getGridItemAnimation = (
  frame: number,
  index: number,
  startFrame: number,
  staggerDelay: number = 8
) => {
  const itemStart = startFrame + index * staggerDelay;
  const scale = interpolate(frame, [itemStart, itemStart + 20], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });
  const opacity = interpolate(frame, [itemStart, itemStart + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [itemStart, itemStart + 20], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  return { scale, opacity, y };
};

// Typewriter effect
export const getTypewriterText = (
  text: string,
  frame: number,
  startFrame: number,
  charsPerFrame: number = 0.5
) => {
  const elapsed = Math.max(0, frame - startFrame);
  const visibleChars = Math.floor(elapsed * charsPerFrame);
  return text.slice(0, visibleChars);
};

// Pulse animation
export const getPulse = (frame: number, speed: number = 0.1, intensity: number = 0.05) => {
  return 1 + Math.sin(frame * speed) * intensity;
};

// Rotation animation
export const getRotation = (frame: number, speed: number = 0.5) => {
  return frame * speed;
};

// Counter animation
export const getCounterValue = (
  frame: number,
  startFrame: number,
  endValue: number,
  duration: number = 60
) => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return Math.floor(progress * endValue);
};
