import {
  Baby,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartPie,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  Euro,
  FileText,
  FlaskConical,
  FolderOpen,
  Heart,
  House,
  KeyRound,
  Megaphone,
  MessagesSquare,
  NotebookPen,
  Settings,
  ShieldCheck,
  Sparkles,
  Tablet,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Session } from '@/api/types'
import { FAMILIES, type FamilyId } from './families'

export type Scope = 'nursery' | 'enterprise'

export interface SoonModule {
  slug: string
  title: string
  family: FamilyId
  scope: Scope
  description: string
}

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  href: string
  soon: boolean
}

export interface NavGroup {
  family: FamilyId
  /** Vide : aucun en-tête de groupe affiché. */
  label: string
  items: NavItem[]
  collapsedByDefault: boolean
}

export interface Navigation {
  groups: NavGroup[]
  footer: NavItem[]
  /** Toutes les entrées (groupes puis pied), pour la recherche et l'entrée active. */
  flat: NavItem[]
}

/** Modules de la v1 pas encore réécrits : chacun a sa page « bientôt ». */
export const SOON_MODULES: readonly SoonModule[] = [
  {
    slug: 'menage',
    title: 'Ménage',
    family: 'today',
    scope: 'nursery',
    description:
      'Fiche de ménage du jour à cocher pièce par pièce, avec le nom de la personne qui a fait chaque tâche.',
  },
  {
    slug: 'transmissions',
    title: 'Transmissions',
    family: 'today',
    scope: 'nursery',
    description:
      'Journal de la journée de chaque enfant : repas, siestes, changes, observations et activités transmis aux familles.',
  },
  {
    slug: 'familles',
    title: 'Familles',
    family: 'children',
    scope: 'nursery',
    description: 'Dossiers des familles et de leurs enfants, avec les responsables légaux et les personnes autorisées.',
  },
  {
    slug: 'inscriptions',
    title: 'Inscriptions',
    family: 'children',
    scope: 'nursery',
    description: "Demandes d'inscription, liste d'attente et passage des dossiers vers l'accueil effectif de l'enfant.",
  },
  {
    slug: 'portail-parents',
    title: 'Portail parents',
    family: 'children',
    scope: 'nursery',
    description:
      'Gestion des accès des familles au portail : invitations, comptes et ce que chaque parent peut consulter.',
  },
  {
    slug: 'personnel',
    title: 'Personnel',
    family: 'team',
    scope: 'enterprise',
    description: "Liste des employés de l'entreprise, leurs fiches, leurs accès aux crèches et leurs absences.",
  },
  {
    slug: 'planning',
    title: 'Planning',
    family: 'team',
    scope: 'nursery',
    description: 'Planning hebdomadaire du personnel par crèche, avec les horaires et les remplacements.',
  },
  {
    slug: 'pieces',
    title: 'Pièces',
    family: 'places',
    scope: 'nursery',
    description: 'Liste des pièces de la crèche et des tâches de nettoyage associées à chacune.',
  },
  {
    slug: 'haccp',
    title: 'HACCP',
    family: 'places',
    scope: 'nursery',
    description:
      'Repas, biberons, produits, fournisseurs, températures, équipements, documents et non-conformités de la cuisine.',
  },
  {
    slug: 'fiches-menage',
    title: 'Fiches de ménage',
    family: 'places',
    scope: 'nursery',
    description: 'Historique des fiches de ménage remplies, consultable par période et exportable.',
  },
  {
    slug: 'contrats',
    title: 'Contrats',
    family: 'admin',
    scope: 'nursery',
    description: "Contrats d'accueil des enfants, avec leurs plannings, leurs tarifs et leurs avenants.",
  },
  {
    slug: 'facturation',
    title: 'Facturation',
    family: 'admin',
    scope: 'enterprise',
    description: 'Factures des familles, paiements, grilles tarifaires et suivi des impayés.',
  },
  {
    slug: 'statistiques',
    title: 'Statistiques',
    family: 'admin',
    scope: 'enterprise',
    description: "Tableaux de bord de la fréquentation, du personnel et de l'activité des crèches.",
  },
  {
    slug: 'enfants',
    title: 'Enfants',
    family: 'today',
    scope: 'enterprise',
    description: "Fiche de chaque enfant de la famille : présences, journée et informations d'accueil.",
  },
  {
    slug: 'messages',
    title: 'Messages',
    family: 'today',
    scope: 'enterprise',
    description: "Échanges entre la famille et l'équipe de la crèche.",
  },
  {
    slug: 'documents',
    title: 'Documents',
    family: 'today',
    scope: 'enterprise',
    description: 'Documents mis à disposition de la famille : contrats, factures et pièces à fournir.',
  },
  {
    slug: 'profil',
    title: 'Profil',
    family: 'today',
    scope: 'enterprise',
    description: 'Coordonnées et préférences du parent, et gestion de son compte.',
  },
  {
    slug: 'editeur-entreprises',
    title: 'Entreprises',
    family: 'today',
    scope: 'enterprise',
    description: 'Liste des entreprises clientes de la plateforme et de leurs crèches.',
  },
  {
    slug: 'editeur-permissions',
    title: 'Permissions',
    family: 'today',
    scope: 'enterprise',
    description: "Activation des modules de l'application pour chaque entreprise et chaque crèche.",
  },
  {
    slug: 'editeur-statistiques',
    title: 'Statistiques de la plateforme',
    family: 'today',
    scope: 'enterprise',
    description: "Indicateurs d'usage de la plateforme, toutes entreprises confondues.",
  },
  {
    slug: 'editeur-annonces',
    title: 'Annonces',
    family: 'today',
    scope: 'enterprise',
    description: "Messages de l'éditeur affichés aux utilisateurs de la plateforme.",
  },
  {
    slug: 'editeur-parametres',
    title: 'Paramètres',
    family: 'today',
    scope: 'enterprise',
    description: "Réglages généraux de la plateforme réservés à l'éditeur.",
  },
  {
    slug: 'aide',
    title: 'Aide',
    family: 'today',
    scope: 'enterprise',
    description: 'Guides et réponses aux questions sur Luniqo.',
  },
]

export function soonModule(slug: string): SoonModule | undefined {
  return SOON_MODULES.find((m) => m.slug === slug)
}

const ICONS: Record<string, LucideIcon> = {
  menage: Sparkles,
  transmissions: NotebookPen,
  familles: Users,
  inscriptions: UserPlus,
  'portail-parents': MessagesSquare,
  personnel: BriefcaseBusiness,
  planning: CalendarDays,
  pieces: DoorOpen,
  haccp: FlaskConical,
  'fiches-menage': ClipboardList,
  contrats: FileText,
  facturation: Euro,
  statistiques: ChartPie,
  enfants: Baby,
  messages: MessagesSquare,
  documents: FolderOpen,
  profil: UserRound,
  'editeur-entreprises': Building2,
  'editeur-permissions': ShieldCheck,
  'editeur-statistiques': ChartPie,
  'editeur-annonces': Megaphone,
  'editeur-parametres': Settings,
  aide: CircleHelp,
}

function realItem(id: string, label: string, icon: LucideIcon, href: string): NavItem {
  return { id, label, icon, href, soon: false }
}

function soonItem(slug: string, nurseryId: string | null): NavItem | null {
  const mod = soonModule(slug)
  if (!mod) throw new Error(`Module « bientôt » inconnu : ${slug}`)
  const nursery = mod.scope === 'nursery'
  if (nursery && nurseryId === null) return null
  const href = nursery ? `/creches/${nurseryId}/bientot/${slug}` : `/bientot/${slug}`
  return { id: slug, label: mod.title, icon: ICONS[slug] ?? Heart, href, soon: true }
}

function group(family: FamilyId, label: string, items: (NavItem | null)[]): NavGroup | null {
  const kept = items.filter((i): i is NavItem => i !== null)
  if (kept.length === 0) return null
  return { family, label, items: kept, collapsedByDefault: kept.every((i) => i.soon) }
}

function build(groups: (NavGroup | null)[], footer: (NavItem | null)[]): Navigation {
  const g = groups.filter((x): x is NavGroup => x !== null)
  const f = footer.filter((x): x is NavItem => x !== null)
  return { groups: g, footer: f, flat: [...g.flatMap((x) => x.items), ...f] }
}

export function navigationFor(role: Session['role'], nurseryId: string | null): Navigation {
  const soon = (slug: string) => soonItem(slug, nurseryId)
  const presences = nurseryId
    ? realItem('presences', 'Présences', ClipboardCheck, `/creches/${nurseryId}/presences`)
    : null
  const settings = realItem('reglages', 'Réglages', Settings, '/reglages')

  switch (role) {
    case 'owner':
      return build(
        [
          group('today', FAMILIES.today.label, [
            realItem('accueil', 'Accueil', House, '/accueil'),
            presences,
            soon('menage'),
            soon('transmissions'),
          ]),
          group('children', FAMILIES.children.label, [soon('familles'), soon('inscriptions'), soon('portail-parents')]),
          group('team', FAMILIES.team.label, [
            soon('personnel'),
            soon('planning'),
            nurseryId ? realItem('tablettes', 'Tablettes', Tablet, `/creches/${nurseryId}/tablettes`) : null,
          ]),
          group('places', FAMILIES.places.label, [soon('pieces'), soon('haccp'), soon('fiches-menage')]),
          group('admin', FAMILIES.admin.label, [soon('contrats'), soon('facturation'), soon('statistiques')]),
        ],
        [settings],
      )
    case 'developer':
      return build(
        [
          group('today', 'Éditeur', [
            realItem('accueil', 'Accueil', House, '/accueil'),
            soon('editeur-entreprises'),
            soon('editeur-permissions'),
            soon('editeur-statistiques'),
            soon('editeur-annonces'),
            soon('editeur-parametres'),
          ]),
        ],
        [settings],
      )
    case 'employee':
      return build(
        [
          group('today', '', [
            realItem('accueil', 'Ma journée', House, '/accueil'),
            presences,
            realItem('mon-pin', 'Mon compte', KeyRound, '/mon-pin'),
          ]),
        ],
        [],
      )
    case 'guardian':
      return build(
        [
          group('today', '', [
            realItem('accueil', 'Accueil', House, '/accueil'),
            soon('enfants'),
            soon('messages'),
            soon('documents'),
            soon('profil'),
          ]),
        ],
        [],
      )
  }
}

/** Entrée dont l'adresse est le plus long préfixe (segment entier) du chemin, ou null. */
export function activeItemId(nav: Navigation, pathname: string): string | null {
  let best: NavItem | null = null
  for (const item of nav.flat) {
    const match = pathname === item.href || pathname.startsWith(`${item.href}/`)
    if (match && (best === null || item.href.length > best.href.length)) best = item
  }
  return best?.id ?? null
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Entrées dont le libellé contient la saisie, sans tenir compte de la casse ni des accents. */
export function searchScreens(nav: Navigation, query: string): NavItem[] {
  const q = fold(query.trim())
  if (q === '') return []
  return nav.flat.filter((i) => fold(i.label).includes(q))
}
