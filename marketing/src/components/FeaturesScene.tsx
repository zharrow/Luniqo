import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
  Img,
  staticFile,
} from "remotion";
import { colors } from "../colors";
import { getFloatingOffset } from "./animations";

// Module data with custom icons (SVG paths for clean look)
const modules = [
  {
    id: "nettoyage",
    title: "Nettoyage",
    description: "Sessions quotidiennes",
    color: colors.primary,
    icon: "sparkles",
  },
  {
    id: "enfants",
    title: "Enfants",
    description: "Fiches & allergies",
    color: colors.secondary,
    icon: "children",
  },
  {
    id: "famille",
    title: "Famille",
    description: "Portail parents",
    color: "#ec4899",
    icon: "family",
  },
  {
    id: "repas",
    title: "Repas",
    description: "Traçabilité alimentaire",
    color: "#f5a623",
    icon: "food",
  },
  {
    id: "equipes",
    title: "Équipes",
    description: "Planning & tablettes",
    color: colors.success,
    icon: "team",
  },
  {
    id: "haccp",
    title: "HACCP",
    description: "Conformité garantie",
    color: "#8b5cf6",
    icon: "shield",
  },
  {
    id: "multisites",
    title: "Multi-sites",
    description: "Toutes vos crèches",
    color: "#06b6d4",
    icon: "buildings",
  },
];

// Custom icon components
const ModuleIcon: React.FC<{ icon: string; color: string; size: number }> = ({
  icon,
  color,
  size,
}) => {
  const icons: Record<string, React.ReactNode> = {
    sparkles: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
          fill={color}
        />
        <path
          d="M19 15L19.75 17.25L22 18L19.75 18.75L19 21L18.25 18.75L16 18L18.25 17.25L19 15Z"
          fill={color}
          opacity={0.6}
        />
        <path
          d="M5 2L5.5 3.5L7 4L5.5 4.5L5 6L4.5 4.5L3 4L4.5 3.5L5 2Z"
          fill={color}
          opacity={0.6}
        />
      </svg>
    ),
    children: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="7" r="4" fill={color} />
        <path
          d="M12 13C7.58 13 4 15.69 4 19V21H20V19C20 15.69 16.42 13 12 13Z"
          fill={color}
          opacity={0.7}
        />
        <circle cx="19" cy="9" r="2.5" fill={color} opacity={0.5} />
        <circle cx="5" cy="9" r="2.5" fill={color} opacity={0.5} />
      </svg>
    ),
    family: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Parent 1 */}
        <circle cx="7" cy="6" r="3" fill={color} />
        <path
          d="M7 11C4.24 11 2 12.79 2 15V17H12V15C12 12.79 9.76 11 7 11Z"
          fill={color}
        />
        {/* Parent 2 */}
        <circle cx="17" cy="6" r="3" fill={color} opacity={0.8} />
        <path
          d="M17 11C14.24 11 12 12.79 12 15V17H22V15C22 12.79 19.76 11 17 11Z"
          fill={color}
          opacity={0.8}
        />
        {/* Child */}
        <circle cx="12" cy="15" r="2.5" fill={color} />
        <path
          d="M12 18.5C9.79 18.5 8 19.57 8 21V22H16V21C16 19.57 14.21 18.5 12 18.5Z"
          fill={color}
        />
        {/* Heart */}
        <path
          d="M12 10L11.2 10.8C9.8 12.2 9 13 9 14C9 14.8 9.7 15.5 10.5 15.5C11 15.5 11.5 15.2 12 14.7C12.5 15.2 13 15.5 13.5 15.5C14.3 15.5 15 14.8 15 14C15 13 14.2 12.2 12.8 10.8L12 10Z"
          fill="white"
          opacity={0.8}
        />
      </svg>
    ),
    food: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="17" rx="8" ry="4" fill={color} opacity={0.3} />
        <path
          d="M12 4C8 4 5 7 5 11C5 14 8 16 12 16C16 16 19 14 19 11C19 7 16 4 12 4Z"
          fill={color}
        />
        <path d="M12 2V4" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path
          d="M8 6C8 6 9 8 12 8C15 8 16 6 16 6"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={0.5}
        />
      </svg>
    ),
    team: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="3" fill={color} />
        <circle cx="15" cy="7" r="3" fill={color} opacity={0.7} />
        <path
          d="M9 12C5.69 12 3 14.24 3 17V19H15V17C15 14.24 12.31 12 9 12Z"
          fill={color}
        />
        <path
          d="M15 12C14.33 12 13.69 12.11 13.09 12.3C14.27 13.41 15 14.97 15 17V19H21V17C21 14.24 18.31 12 15 12Z"
          fill={color}
          opacity={0.7}
        />
      </svg>
    ),
    shield: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L4 5V11C4 16.55 7.16 21.74 12 23C16.84 21.74 20 16.55 20 11V5L12 2Z"
          fill={color}
        />
        <path
          d="M9 12L11 14L15 10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    buildings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="9" width="7" height="12" rx="1" fill={color} />
        <rect x="14" y="5" width="7" height="16" rx="1" fill={color} opacity={0.7} />
        <rect x="5" y="11" width="2" height="2" fill="white" opacity={0.5} />
        <rect x="5" y="15" width="2" height="2" fill="white" opacity={0.5} />
        <rect x="16" y="7" width="2" height="2" fill="white" opacity={0.5} />
        <rect x="16" y="11" width="2" height="2" fill="white" opacity={0.5} />
        <rect x="16" y="15" width="2" height="2" fill="white" opacity={0.5} />
      </svg>
    ),
  };

  return <>{icons[icon]}</>;
};

// Speech bubble component
const SpeechBubble: React.FC<{
  text: string;
  frame: number;
  delay: number;
  position: "left" | "right";
}> = ({ text, frame, delay, position }) => {
  // Longer display time: visible for ~70 frames (2.3s)
  const opacity = interpolate(frame, [delay, delay + 12, delay + 65, delay + 80], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [delay, delay + 18], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });

  return (
    <div
      style={{
        position: "absolute",
        top: -80,
        [position]: position === "left" ? -20 : -20,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: position === "left" ? "bottom left" : "bottom right",
      }}
    >
      <div
        style={{
          background: colors.white,
          padding: "12px 20px",
          borderRadius: 20,
          boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
          position: "relative",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: colors.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {text}
        </span>
        {/* Bubble tail */}
        <div
          style={{
            position: "absolute",
            bottom: -10,
            [position]: 25,
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: `12px solid ${colors.white}`,
          }}
        />
      </div>
    </div>
  );
};

// Module card component with 3D tilt effect
const ModuleCard: React.FC<{
  module: (typeof modules)[0];
  frame: number;
  delay: number;
  fps: number;
  index: number;
  isActive: boolean;
  mascotX: number;
  cardCenterX: number;
}> = ({ module, frame, delay, fps, index, isActive, mascotX, cardCenterX }) => {
  const cardScale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardY = interpolate(frame, [delay, delay + 20], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  const float = getFloatingOffset(frame + index * 20, 0.04, 4);

  // Active state glow
  const glowIntensity = isActive ? 0.5 : 0.15;

  // 3D tilt effect - card tilts towards mascot when active
  const tiltDirection = mascotX < cardCenterX ? 1 : -1; // Tilt left or right
  const tiltAngle = isActive ? tiltDirection * 8 : 0;
  const tiltY = isActive ? -5 : 0; // Slight lift when active

  // Icon pulse when active
  const iconScale = isActive ? 1 + Math.sin(frame * 0.15) * 0.08 : 1;

  return (
    <div
      style={{
        opacity: cardOpacity,
        transform: `
          scale(${Math.max(0, cardScale) * (isActive ? 1.08 : 1)})
          translateY(${cardY + float + tiltY}px)
          perspective(800px)
          rotateY(${tiltAngle}deg)
        `,
        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          background: isActive
            ? `linear-gradient(145deg, ${colors.white} 0%, ${module.color}08 100%)`
            : `linear-gradient(145deg, ${colors.white} 0%, #fafafa 100%)`,
          padding: "20px 22px",
          borderRadius: 20,
          boxShadow: isActive
            ? `
              0 20px 50px rgba(0,0,0,0.12),
              0 8px 20px ${module.color}40,
              0 0 30px ${module.color}20,
              inset 0 1px 0 rgba(255,255,255,1)
            `
            : `
              0 15px 40px rgba(0,0,0,0.08),
              0 5px 15px ${module.color}${Math.floor(glowIntensity * 255)
              .toString(16)
              .padStart(2, "0")},
              inset 0 1px 0 rgba(255,255,255,1)
            `,
          border: `2px solid ${module.color}${isActive ? "60" : "20"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          minWidth: 130,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shine effect when active */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: -100,
              width: 60,
              height: "200%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              transform: `translateX(${((frame % 60) / 60) * 300}px) skewX(-20deg)`,
            }}
          />
        )}

        {/* Icon container with pulse */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: isActive
              ? `linear-gradient(135deg, ${module.color}35 0%, ${module.color}20 100%)`
              : `linear-gradient(135deg, ${module.color}20 0%, ${module.color}10 100%)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transform: `scale(${iconScale})`,
            transition: "background 0.3s ease",
          }}
        >
          <ModuleIcon icon={module.icon} color={module.color} size={32} />
        </div>

        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: colors.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {module.title}
        </span>

        <span
          style={{
            fontSize: 13,
            color: "#64748b",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          {module.description}
        </span>

        {/* Active indicator */}
        {isActive && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: module.color,
              boxShadow: `0 0 10px ${module.color}`,
            }}
          />
        )}
      </div>
    </div>
  );
};

// Dotted path component - centered vertically
const DottedPath: React.FC<{ frame: number }> = ({ frame }) => {
  const pathProgress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <svg
      style={{
        position: "absolute",
        top: "63%",
        left: 0,
        right: 0,
        height: 100,
        pointerEvents: "none",
      }}
      viewBox="0 0 1920 100"
      preserveAspectRatio="none"
    >
      <path
        d="M 100 50 Q 400 20, 600 50 T 1000 50 T 1400 50 T 1820 50"
        fill="none"
        stroke={colors.primary}
        strokeWidth="3"
        strokeDasharray="10 10"
        strokeLinecap="round"
        opacity={0.3}
        style={{
          strokeDashoffset: 1000 - pathProgress * 1000,
        }}
      />
    </svg>
  );
};

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene duration: 18 seconds = 540 frames
  // Mascot walks from left to right, stopping at each module

  // Mascot position (walks across screen - slower)
  const mascotProgress = interpolate(frame, [60, 500], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mascotX = interpolate(mascotProgress, [0, 1], [150, 1750]);

  // Bouncing while walking
  const isWalking = frame > 60 && frame < 500;
  const walkBounce = isWalking ? Math.abs(Math.sin(frame * 0.3)) * 10 : 0;

  // Mascot looking direction (alternates based on which module is active)
  const currentModuleIndex = Math.min(
    6,
    Math.floor(interpolate(frame, [80, 480], [0, 7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
  );

  // Mascot scale (entrance)
  const mascotScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  // Title animation
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 30], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  // Speech bubble texts for each module
  const speechBubbles = [
    "Je vous montre !",
    "Tout propre !",
    "Bien suivis !",
    "Pour les parents !",
    "Miam miam !",
    "Super équipe !",
    "Certifié !",
    "Partout !",
  ];

  // Calculate which speech bubble to show (7 modules + intro) - SLOWER timing
  const getCurrentBubbleIndex = () => {
    if (frame < 80) return 0;   // Intro: 0-80 (2.6s)
    if (frame < 140) return 1;  // Nettoyage: 80-140
    if (frame < 200) return 2;  // Enfants: 140-200
    if (frame < 260) return 3;  // Famille: 200-260
    if (frame < 320) return 4;  // Repas: 260-320
    if (frame < 380) return 5;  // Équipes: 320-380
    if (frame < 440) return 6;  // HACCP: 380-440
    return 7;                   // Multi-sites: 440+
  };

  const bubbleIndex = getCurrentBubbleIndex();

  // Module positions (spread across screen for 7 modules)
  const modulePositions = [140, 380, 620, 860, 1100, 1340, 1580];

  // Calculate delays for each module card (7 modules in 18 seconds) - SLOWER
  const getModuleDelay = (index: number) => 70 + index * 55;

  // Check if a module is currently active (mascot is near it)
  const isModuleActive = (index: number) => {
    const moduleX = modulePositions[index];
    return Math.abs(mascotX - moduleX) < 180;
  };

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #e8f4fc 0%, ${colors.background} 40%, #fef0e6 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Background clouds - more prominent like Scene 1 */}
      {[
        { x: 80, y: 60, scale: 0.9 },
        { x: 350, y: 140, scale: 0.6 },
        { x: 650, y: 80, scale: 0.7 },
        { x: 950, y: 50, scale: 0.5 },
        { x: 1250, y: 120, scale: 0.8 },
        { x: 1550, y: 70, scale: 0.65 },
        { x: 1750, y: 130, scale: 0.75 },
        // Bottom clouds
        { x: 150, y: 850, scale: 0.7 },
        { x: 500, y: 900, scale: 0.5 },
        { x: 900, y: 870, scale: 0.6 },
        { x: 1300, y: 890, scale: 0.55 },
        { x: 1650, y: 860, scale: 0.65 },
      ].map((cloud, i) => {
        const cloudFloat = getFloatingOffset(frame + i * 30, 0.025, 12);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cloud.x,
              top: cloud.y + cloudFloat,
              transform: `scale(${cloud.scale})`,
              opacity: 0.7,
              display: "flex",
            }}
          >
            {[0, 1, 2, 3, 4].map((j) => (
              <div
                key={j}
                style={{
                  width: j === 2 ? 60 : j === 1 || j === 3 ? 45 : 30,
                  height: j === 2 ? 60 : j === 1 || j === 3 ? 45 : 30,
                  borderRadius: "50%",
                  backgroundColor: colors.white,
                  marginLeft: j > 0 ? -18 : 0,
                  marginTop: j === 0 || j === 4 ? 15 : j === 2 ? 0 : 8,
                  boxShadow: "0 5px 15px rgba(0,0,0,0.03)",
                }}
              />
            ))}
          </div>
        );
      })}

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <h1
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: colors.text,
            fontFamily: "system-ui, sans-serif",
            margin: 0,
          }}
        >
          Tout ce dont vous avez besoin
        </h1>
        <p
          style={{
            fontSize: 24,
            color: "#718096",
            fontFamily: "system-ui, sans-serif",
            marginTop: 10,
          }}
        >
          Une solution complète pour votre crèche
        </p>
      </div>

      {/* Dotted path */}
      <DottedPath frame={frame} />

      {/* Module cards - centered vertically */}
      <div
        style={{
          position: "absolute",
          top: "38%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 20,
          padding: "0 60px",
        }}
      >
        {modules.map((module, index) => {
          // Calculate card center X position (approximate based on layout)
          const cardCenterX = modulePositions[index];
          return (
            <ModuleCard
              key={module.id}
              module={module}
              frame={frame}
              delay={getModuleDelay(index)}
              fps={fps}
              index={index}
              isActive={isModuleActive(index)}
              mascotX={mascotX}
              cardCenterX={cardCenterX}
            />
          );
        })}
      </div>

      {/* Mascot - centered vertically */}
      <div
        style={{
          position: "absolute",
          top: "66%",
          left: mascotX,
          transform: `translateX(-50%) scale(${Math.max(0, mascotScale)})`,
        }}
      >
        {/* Speech bubble */}
        <SpeechBubble
          text={speechBubbles[bubbleIndex]}
          frame={frame}
          delay={bubbleIndex === 0 ? 20 : 70 + (bubbleIndex - 1) * 55}
          position={currentModuleIndex % 2 === 0 ? "left" : "right"}
        />

        {/* Mascot with bounce */}
        <div
          style={{
            transform: `translateY(${-walkBounce}px)`,
          }}
        >
          <Img
            src={staticFile("luniqo.png")}
            style={{
              width: 120,
              height: "auto",
              filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.15))",
            }}
          />
        </div>

        {/* Walking dust particles */}
        {isWalking &&
          [0, 1, 2].map((i) => {
            const dustOpacity = interpolate(
              (frame + i * 10) % 30,
              [0, 15, 30],
              [0.6, 0.3, 0],
              { extrapolateRight: "clamp" }
            );
            const dustY = interpolate((frame + i * 10) % 30, [0, 30], [0, -20], {
              extrapolateRight: "clamp",
            });
            const dustX = -20 - i * 15;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  bottom: 5,
                  left: "50%",
                  transform: `translateX(${dustX}px) translateY(${dustY}px)`,
                  width: 8 - i * 2,
                  height: 8 - i * 2,
                  borderRadius: "50%",
                  backgroundColor: colors.accent,
                  opacity: dustOpacity,
                }}
              />
            );
          })}
      </div>

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {modules.map((module, index) => {
          const dotOpacity = interpolate(
            frame,
            [getModuleDelay(index), getModuleDelay(index) + 15],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={index}
              style={{
                width: isModuleActive(index) ? 24 : 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: isModuleActive(index) ? module.color : `${colors.text}30`,
                opacity: dotOpacity,
                transition: "all 0.3s ease",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
