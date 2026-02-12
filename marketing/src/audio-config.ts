// Audio configuration for LuniqoPromo video
// Total duration: 50 seconds (1500 frames at 30fps)

export const AUDIO_CONFIG = {
  // Background music settings
  music: {
    file: "audio/background-music.mp3", // Place your music file here
    volume: 0.15, // Low volume so voiceover is clear
    fadeInDuration: 30, // 1 second fade in
    fadeOutDuration: 60, // 2 seconds fade out at end
  },

  // Voiceover segments - each has a file and timing
  // Generate these with ElevenLabs, Google TTS, or record yourself
  voiceover: {
    volume: 1.0,
    segments: [
      // === HOOK SCENE (0-8s) ===
      {
        id: "hook-1",
        file: "audio/vo-hook-1.mp3",
        text: "Paperasse.",
        startFrame: 15, // 0.5s
        durationFrames: 30, // ~1s
      },
      {
        id: "hook-2",
        file: "audio/vo-hook-2.mp3",
        text: "Stress.",
        startFrame: 51, // 1.7s
        durationFrames: 30,
      },
      {
        id: "hook-3",
        file: "audio/vo-hook-3.mp3",
        text: "Chaos.",
        startFrame: 87, // 2.9s
        durationFrames: 30,
      },
      {
        id: "hook-stop",
        file: "audio/vo-hook-stop.mp3",
        text: "Stop.",
        startFrame: 120, // 4s
        durationFrames: 30,
      },
      {
        id: "hook-solution",
        file: "audio/vo-hook-solution.mp3",
        text: "Il existe une meilleure solution.",
        startFrame: 165, // 5.5s
        durationFrames: 70, // ~2.3s
      },

      // === SOLUTION SCENE (8-14s) ===
      {
        id: "solution-intro",
        file: "audio/vo-solution.mp3",
        text: "Luniqo. La gestion de crèche, simplifiée.",
        startFrame: 240 + 30, // 8s + 1s
        durationFrames: 120, // 4s
      },

      // === MODULES SCENE (14-34s) ===
      {
        id: "modules-intro",
        file: "audio/vo-modules-intro.mp3",
        text: "Découvrez cinq modules essentiels.",
        startFrame: 420, // 14s
        durationFrames: 60, // 2s
      },
      {
        id: "module-1",
        file: "audio/vo-module-1.mp3",
        text: "Gestion des salles. Organisez vos espaces en temps réel.",
        startFrame: 480 + 15, // After intro + small delay
        durationFrames: 90, // 3s
      },
      {
        id: "module-2",
        file: "audio/vo-module-2.mp3",
        text: "Planification des tâches. Assignez et automatisez.",
        startFrame: 480 + 108 + 15,
        durationFrames: 90,
      },
      {
        id: "module-3",
        file: "audio/vo-module-3.mp3",
        text: "Module HACCP. Traçabilité complète, conformité garantie.",
        startFrame: 480 + 216 + 15,
        durationFrames: 90,
      },
      {
        id: "module-4",
        file: "audio/vo-module-4.mp3",
        text: "Gestion du personnel. Accès PIN et historique des interventions.",
        startFrame: 480 + 324 + 15,
        durationFrames: 90,
      },
      {
        id: "module-5",
        file: "audio/vo-module-5.mp3",
        text: "Multi-sites. Gérez plusieurs crèches depuis un seul tableau de bord.",
        startFrame: 480 + 432 + 15,
        durationFrames: 90,
      },

      // === BENEFITS SCENE (34-44s) ===
      {
        id: "benefits-intro",
        file: "audio/vo-benefits-intro.mp3",
        text: "Des résultats concrets.",
        startFrame: 1020 + 15, // 34s + delay
        durationFrames: 45,
      },
      {
        id: "benefit-1",
        file: "audio/vo-benefit-1.mp3",
        text: "Quatre-vingt pourcent de temps gagné sur l'administratif.",
        startFrame: 1020 + 60,
        durationFrames: 70,
      },
      {
        id: "benefit-2",
        file: "audio/vo-benefit-2.mp3",
        text: "Cent pourcent conforme HACCP.",
        startFrame: 1020 + 130,
        durationFrames: 50,
      },
      {
        id: "benefit-3",
        file: "audio/vo-benefit-3.mp3",
        text: "Accessible vingt-quatre heures sur vingt-quatre, sept jours sur sept.",
        startFrame: 1020 + 180,
        durationFrames: 70,
      },

      // === CTA SCENE (44-50s) ===
      {
        id: "cta",
        file: "audio/vo-cta.mp3",
        text: "Luniqo. Essayez gratuitement sur luniqo.com",
        startFrame: 1320 + 45, // 44s + delay
        durationFrames: 120, // 4s
      },
    ],
  },
};

// Helper to get voiceover text for TTS generation
export const getVoiceoverScript = () => {
  return AUDIO_CONFIG.voiceover.segments.map((s) => ({
    id: s.id,
    text: s.text,
    timing: `${(s.startFrame / 30).toFixed(1)}s`,
  }));
};

// Export script for easy copy-paste to TTS service
export const printVoiceoverScript = () => {
  console.log("=== VOICEOVER SCRIPT FOR TTS ===\n");
  AUDIO_CONFIG.voiceover.segments.forEach((s, i) => {
    console.log(`[${i + 1}] ${s.id}`);
    console.log(`    "${s.text}"`);
    console.log(`    File: public/${s.file}`);
    console.log(`    Timing: ${(s.startFrame / 30).toFixed(1)}s\n`);
  });
};
