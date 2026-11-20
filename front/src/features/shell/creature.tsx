import { useId } from 'react'

import { FAMILIES, type FamilyId } from './families'

/**
 * Les Petits Croissants (LUN-151) : une créature par famille du menu, faite des mêmes formes
 * (corps, gros œil, pattes en bâtonnets, croissant de lune sur la tête). Formes et proportions de la
 * planche « Personnage : trois pistes », piste 2. Règles : docs/recherches/personnage-2026-11-20.md.
 */

type Circle = { cx: number; cy: number; r: number }
type Rect = { x: number; y: number; width: number; height: number; rx: number }

type Shape = {
  /** Largeur du dessin ; la hauteur vaut toujours 150. */
  width: number
  moon: Circle
  /** Disque retiré du croissant ; par défaut, décalé de (5, -3) et plus petit d'une unité. */
  cut?: Circle
  body: Rect | Circle
  eye: Circle
  pupil: Circle
  legs: Rect[]
}

const PUPIL = '#1e2430'
const HEIGHT = 150

const SHAPES: Record<FamilyId, Shape> = {
  // Corps large et arrondi, deux pattes : celle du logo.
  today: {
    width: 120,
    moon: { cx: 60, cy: 18, r: 10 },
    body: { x: 10, y: 38, width: 100, height: 80, rx: 40 },
    eye: { cx: 82, cy: 70, r: 14 },
    pupil: { cx: 85, cy: 72, r: 6 },
    legs: [
      { x: 30, y: 112, width: 9, height: 28, rx: 4 },
      { x: 78, y: 112, width: 9, height: 28, rx: 4 },
    ],
  },
  // Corps haut et arrondi, deux pattes courtes.
  children: {
    width: 100,
    moon: { cx: 50, cy: 26, r: 9 },
    body: { x: 14, y: 44, width: 72, height: 92, rx: 36 },
    eye: { cx: 58, cy: 76, r: 13 },
    pupil: { cx: 60, cy: 78, r: 6 },
    legs: [
      { x: 32, y: 130, width: 9, height: 16, rx: 4 },
      { x: 60, y: 130, width: 9, height: 16, rx: 4 },
    ],
  },
  // Corps bas et long, trois pattes.
  team: {
    width: 100,
    moon: { cx: 50, cy: 52, r: 9 },
    body: { x: 8, y: 70, width: 84, height: 56, rx: 28 },
    eye: { cx: 70, cy: 94, r: 12 },
    pupil: { cx: 73, cy: 96, r: 5 },
    legs: [
      { x: 22, y: 120, width: 8, height: 26, rx: 4 },
      { x: 44, y: 120, width: 8, height: 26, rx: 4 },
      { x: 66, y: 120, width: 8, height: 26, rx: 4 },
    ],
  },
  // Petit corps, deux longues pattes.
  places: {
    width: 100,
    moon: { cx: 50, cy: 14, r: 9 },
    body: { x: 22, y: 30, width: 56, height: 64, rx: 28 },
    eye: { cx: 58, cy: 56, r: 12 },
    pupil: { cx: 61, cy: 58, r: 5 },
    legs: [
      { x: 34, y: 88, width: 8, height: 58, rx: 4 },
      { x: 58, y: 88, width: 8, height: 58, rx: 4 },
    ],
  },
  // Corps rond, deux pattes très courtes.
  admin: {
    width: 100,
    moon: { cx: 50, cy: 60, r: 9 },
    body: { cx: 50, cy: 104, r: 38 },
    eye: { cx: 64, cy: 98, r: 12 },
    pupil: { cx: 66, cy: 100, r: 5 },
    legs: [
      { x: 34, y: 136, width: 8, height: 12, rx: 4 },
      { x: 58, y: 136, width: 8, height: 12, rx: 4 },
    ],
  },
}

/** Version réduite du logo (24 px et moins) : corps, œil et croissant, sans pattes. */
const SMALL_LOGO: Shape = {
  width: 120,
  // Croissant plus épais : à 24 px, celui de la grande version ne fait qu'un trait.
  moon: { cx: 60, cy: 20, r: 16 },
  cut: { cx: 68, cy: 14, r: 13 },
  body: { x: 4, y: 38, width: 112, height: 86, rx: 43 },
  eye: { cx: 84, cy: 76, r: 20 },
  pupil: { cx: 88, cy: 78, r: 10 },
  legs: [],
}

/**
 * Croissant : le disque moins un disque décalé vers le haut à droite. Découpé par un masque (et non
 * peint à la couleur du fond), pour rester juste sur n'importe quel fond.
 */
function Moon({ moon, cut, color, maskId }: { moon: Circle; cut?: Circle; color: string; maskId: string }) {
  return (
    <>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height={HEIGHT}>
        <circle {...moon} fill="#fff" />
        <circle {...(cut ?? { cx: moon.cx + 5, cy: moon.cy - 3, r: moon.r - 1 })} fill="#000" />
      </mask>
      <circle {...moon} fill={color} mask={`url(#${maskId})`} />
    </>
  )
}

/** Identifiant de masque propre à chaque instance (plusieurs créatures sur une page). */
function useMaskId(): string {
  return `lune-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function Drawing({ shape, family, maskId }: { shape: Shape; family: FamilyId; maskId: string }) {
  const { color, ink } = FAMILIES[family]
  return (
    <>
      <Moon moon={shape.moon} cut={shape.cut} color={color} maskId={maskId} />
      {'x' in shape.body ? <rect {...shape.body} fill={color} /> : <circle {...shape.body} fill={color} />}
      <circle {...shape.eye} fill="#fff" />
      <circle {...shape.pupil} fill={PUPIL} />
      {shape.legs.map((leg) => (
        <rect key={leg.x} {...leg} fill={ink} />
      ))}
    </>
  )
}

type CreatureProps = {
  family: FamilyId
  /** Hauteur en pixels ; la largeur suit les proportions de la créature. */
  size: number
  /** Petit saut à l'apparition (1,2 s, une fois ; rien sous « réduire les animations »). */
  hop?: boolean
  className?: string
}

/** Créature décorative : toujours masquée aux technologies d'assistance. */
export function Creature({ family, size, hop = false, className }: CreatureProps) {
  const maskId = useMaskId()
  const shape = SHAPES[family]
  return (
    <svg
      viewBox={`0 0 ${shape.width} ${HEIGHT}`}
      width={Math.round((size * shape.width) / HEIGHT)}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-family={family}
      className={className}
    >
      <g className={hop ? 'creature-hop' : undefined}>
        <Drawing shape={shape} family={family} maskId={maskId} />
      </g>
    </svg>
  )
}

/**
 * Marque de Luniqo : la créature « today », dans un carré. Sous 32 px, version réduite (sans pattes).
 * Le nom « Luniqo » reste un texte visible à côté : la marque elle-même est décorative.
 */
export function LogoMark({ size }: { size: number }) {
  const maskId = useMaskId()
  const small = size < 32
  return (
    <svg
      viewBox={small ? '-2 4 124 124' : '-15 0 150 150'}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-variant={small ? 'small' : 'full'}
      className="shrink-0"
    >
      <Drawing shape={small ? SMALL_LOGO : SHAPES.today} family="today" maskId={maskId} />
    </svg>
  )
}
