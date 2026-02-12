import { interpolate, spring, Easing } from "remotion";

// === KINETIC TYPOGRAPHY ANIMATIONS ===

// Split text into words with staggered reveal
export const getWordReveal = (
  frame: number,
  wordIndex: number,
  startFrame: number,
  staggerDelay: number = 6
) => {
  const wordStart = startFrame + wordIndex * staggerDelay;

  const opacity = interpolate(frame, [wordStart, wordStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(frame, [wordStart, wordStart + 15], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  const blur = interpolate(frame, [wordStart, wordStart + 8], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return { opacity, y, blur };
};

// Character by character reveal (typewriter style but animated)
export const getCharacterReveal = (
  frame: number,
  charIndex: number,
  startFrame: number,
  staggerDelay: number = 1.5
) => {
  const charStart = startFrame + charIndex * staggerDelay;

  const opacity = interpolate(frame, [charStart, charStart + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [charStart, charStart + 10], [1.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });

  return { opacity, scale };
};

// Line reveal with mask effect
export const getLineReveal = (
  frame: number,
  startFrame: number,
  duration: number = 20
) => {
  const clipProgress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 100],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  return {
    clipPath: `inset(0 ${100 - clipProgress}% 0 0)`,
    opacity: frame >= startFrame ? 1 : 0,
  };
};

// Fade up animation
export const getFadeUp = (
  frame: number,
  startFrame: number,
  distance: number = 40,
  duration: number = 25
) => {
  const opacity = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(frame, [startFrame, startFrame + duration], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  return { opacity, y };
};

// Scale pop animation
export const getScalePop = (
  frame: number,
  fps: number,
  startFrame: number
) => {
  const scale = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 8,
      stiffness: 150,
      mass: 0.8,
    },
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return { scale: Math.max(0, scale), opacity };
};

// Highlight animation (background color sweep)
export const getHighlightSweep = (
  frame: number,
  startFrame: number,
  duration: number = 15
) => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return {
    backgroundSize: `${progress}% 100%`,
    backgroundPosition: "0 0",
    backgroundRepeat: "no-repeat",
  };
};

// Counter animation
export const getAnimatedCounter = (
  frame: number,
  startFrame: number,
  endValue: number,
  duration: number = 45,
  suffix: string = ""
) => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const value = Math.floor(progress * endValue);
  return `${value}${suffix}`;
};

// Stagger group animation
export const getStaggeredItem = (
  frame: number,
  index: number,
  startFrame: number,
  staggerDelay: number = 10
) => {
  const itemStart = startFrame + index * staggerDelay;

  const opacity = interpolate(frame, [itemStart, itemStart + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const x = interpolate(frame, [itemStart, itemStart + 20], [-50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  const scale = interpolate(frame, [itemStart, itemStart + 15], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  return { opacity, x, scale };
};

// Scene transition (fade in/out)
export const getSceneOpacity = (
  frame: number,
  sceneStart: number,
  sceneDuration: number,
  fadeIn: number = 12,
  fadeOut: number = 12
) => {
  // Ensure fadeIn and fadeOut are at least 1 to avoid [0,0] inputRange error
  const safeFadeIn = Math.max(1, fadeIn);
  const safeFadeOut = Math.max(1, fadeOut);

  const inOpacity = interpolate(frame, [sceneStart, sceneStart + safeFadeIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outOpacity = interpolate(
    frame,
    [sceneStart + sceneDuration - safeFadeOut, sceneStart + sceneDuration],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return Math.min(inOpacity, outOpacity);
};

// Text emphasis pulse
export const getEmphasisPulse = (
  frame: number,
  startFrame: number,
  cycles: number = 2
) => {
  if (frame < startFrame) return 1;

  const elapsed = frame - startFrame;
  const cycleLength = 20;
  const progress = (elapsed % cycleLength) / cycleLength;
  const currentCycle = Math.floor(elapsed / cycleLength);

  if (currentCycle >= cycles) return 1;

  return 1 + Math.sin(progress * Math.PI * 2) * 0.08;
};

// Split reveal (left and right parts)
export const getSplitReveal = (
  frame: number,
  startFrame: number,
  duration: number = 20
) => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return {
    leftX: interpolate(progress, [0, 1], [-100, 0]),
    rightX: interpolate(progress, [0, 1], [100, 0]),
    opacity: progress,
  };
};

// Gradient text color animation
export const getGradientShift = (frame: number, speed: number = 2) => {
  const offset = (frame * speed) % 360;
  return `linear-gradient(${90 + offset}deg, #5a9dc9, #f4c2c2, #b5ead7, #5a9dc9)`;
};

// Underline draw animation
export const getUnderlineDraw = (
  frame: number,
  startFrame: number,
  duration: number = 20
) => {
  const width = interpolate(frame, [startFrame, startFrame + duration], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return `${width}%`;
};
