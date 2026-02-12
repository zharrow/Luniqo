# Luniqo Marketing Video

Video marketing programmee avec [Remotion](https://www.remotion.dev/).

## Commandes

```bash
# Lancer le studio de preview
npm start

# Generer la video MP4
npm run build

# Mettre a jour Remotion
npm run upgrade
```

## Structure

```
marketing/
├── src/
│   ├── index.ts              # Point d'entree
│   ├── Root.tsx              # Enregistrement des compositions
│   ├── LuniqoMarketing.tsx   # Video principale (45s)
│   └── components/
│       ├── IntroScene.tsx    # Scene 1: Logo + Intro (8s)
│       ├── FeaturesScene.tsx # Scene 2: Fonctionnalites (12s)
│       ├── HACCPScene.tsx    # Scene 3: Module HACCP (10s)
│       ├── MultiSiteScene.tsx# Scene 4: Multi-sites (8s)
│       └── CTAScene.tsx      # Scene 5: Call to Action (7s)
├── public/                   # Assets statiques (images, fonts)
├── remotion.config.ts        # Configuration Remotion
└── package.json
```

## Personnalisation

### Couleurs (Design System Luniqo)

Les couleurs sont definies dans `src/LuniqoMarketing.tsx`:

- **Primary** (#5a9dc9) - Bleu serenite
- **Secondary** (#f4c2c2) - Rose douceur
- **Accent** (#ffe5b4) - Jaune actions positives
- **Success** (#b5ead7) - Vert menthe HACCP

### Ajouter des assets

1. Placez vos images dans `/public`
2. Importez avec `import logo from '../public/logo.png'`
3. Utilisez avec `<Img src={staticFile('logo.png')} />`

### Modifier la duree

Ajustez les durees dans `LuniqoMarketing.tsx`:

```typescript
const introDuration = fps * 8;  // 8 secondes
```

## Export

```bash
# MP4 1080p
npm run build

# Autres formats
npx remotion render src/index.ts LuniqoMarketing out/video.webm --codec=vp8
npx remotion render src/index.ts LuniqoMarketing out/video.gif --codec=gif
```

## Preview

Ouvrez http://localhost:3001 apres `npm start` pour previsualisez la video frame par frame.
