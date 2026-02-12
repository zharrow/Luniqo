# Audio Setup for LuniqoPromo Video

## Structure

```
marketing/
├── public/
│   └── audio/
│       ├── background-music.mp3    # Background music track
│       ├── vo-hook-1.mp3           # "Paperasse."
│       ├── vo-hook-2.mp3           # "Stress."
│       ├── vo-hook-3.mp3           # "Chaos."
│       ├── vo-hook-stop.mp3        # "Stop."
│       ├── vo-hook-solution.mp3    # "Il existe une meilleure solution."
│       ├── vo-solution.mp3         # "Luniqo. La gestion de crèche, simplifiée."
│       ├── vo-modules-intro.mp3    # "Découvrez cinq modules essentiels."
│       ├── vo-module-1.mp3         # Module Salles
│       ├── vo-module-2.mp3         # Module Tâches
│       ├── vo-module-3.mp3         # Module HACCP
│       ├── vo-module-4.mp3         # Module Personnel
│       ├── vo-module-5.mp3         # Module Multi-sites
│       ├── vo-benefits-intro.mp3   # "Des résultats concrets."
│       ├── vo-benefit-1.mp3        # 80% temps gagné
│       ├── vo-benefit-2.mp3        # 100% conforme
│       ├── vo-benefit-3.mp3        # 24/7 accessible
│       └── vo-cta.mp3              # CTA final
```

## Voiceover Script (for TTS)

Copy these texts to generate audio with ElevenLabs, Google TTS, or similar:

### Hook Scene (0-8s)
1. **vo-hook-1.mp3** - "Paperasse."
2. **vo-hook-2.mp3** - "Stress."
3. **vo-hook-3.mp3** - "Chaos."
4. **vo-hook-stop.mp3** - "Stop."
5. **vo-hook-solution.mp3** - "Il existe une meilleure solution."

### Solution Scene (8-14s)
6. **vo-solution.mp3** - "Luniqo. La gestion de crèche, simplifiée."

### Modules Scene (14-34s)
7. **vo-modules-intro.mp3** - "Découvrez cinq modules essentiels."
8. **vo-module-1.mp3** - "Gestion des salles. Organisez vos espaces en temps réel."
9. **vo-module-2.mp3** - "Planification des tâches. Assignez et automatisez."
10. **vo-module-3.mp3** - "Module HACCP. Traçabilité complète, conformité garantie."
11. **vo-module-4.mp3** - "Gestion du personnel. Accès PIN et historique des interventions."
12. **vo-module-5.mp3** - "Multi-sites. Gérez plusieurs crèches depuis un seul tableau de bord."

### Benefits Scene (34-44s)
13. **vo-benefits-intro.mp3** - "Des résultats concrets."
14. **vo-benefit-1.mp3** - "Quatre-vingt pourcent de temps gagné sur l'administratif."
15. **vo-benefit-2.mp3** - "Cent pourcent conforme HACCP."
16. **vo-benefit-3.mp3** - "Accessible vingt-quatre heures sur vingt-quatre, sept jours sur sept."

### CTA Scene (44-50s)
17. **vo-cta.mp3** - "Luniqo. Essayez gratuitement sur luniqo point com."

## Recommended TTS Services

### ElevenLabs (Best quality)
- URL: https://elevenlabs.io
- Voice: "Rachel" (French) or "Antoni" (multilingual)
- Settings: Stability 0.5, Clarity 0.75

### Google Cloud TTS
- Voice: fr-FR-Wavenet-A (female) or fr-FR-Wavenet-B (male)
- Speed: 1.0
- Pitch: 0

### Amazon Polly
- Voice: Léa (French female) or Mathieu (French male)
- Engine: Neural

## Background Music

Find royalty-free music:
- **Epidemic Sound**: https://epidemicsound.com
- **Artlist**: https://artlist.io
- **YouTube Audio Library**: Free
- **Pixabay Music**: https://pixabay.com/music (Free)

Recommended style: Modern, upbeat, corporate, ~120 BPM

## Enable Audio

Once all audio files are in place, edit `src/LuniqoPromo.tsx`:

```tsx
// Change this to true
const ENABLE_AUDIO = true;
```

## Adjust Timings

If audio doesn't sync perfectly, edit `src/audio-config.ts`:

```ts
{
  id: "hook-1",
  file: "audio/vo-hook-1.mp3",
  text: "Paperasse.",
  startFrame: 15,      // Adjust this (30 frames = 1 second)
  durationFrames: 30,  // Adjust this for longer/shorter audio
},
```

## Quick Test

To test a single audio file before generating all:

1. Add just `background-music.mp3` to `public/audio/`
2. In `LuniqoPromo.tsx`, set:
   ```tsx
   const ENABLE_AUDIO = true;
   const ENABLE_MUSIC = true;
   const ENABLE_VOICEOVER = false;  // Disable until ready
   ```
3. Run `npm start` and preview
