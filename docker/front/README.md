# Image `luniqo/front`

Le front de Luniqo : l'application Next.js + React (la v1, à la racine du
dépôt), servie par le serveur autonome de Next.js. On y accède par la passerelle
`web`, pour tout ce qui n'est pas `/api/`.

Le front utilise encore **Supabase Cloud** pour la connexion et les données
(v1) : ce sont les variables `FRONT_SUPABASE_*` qui le relient au projet Supabase.
Sans elles, toutes les pages s'affichent mais la connexion échoue.

## Adaptations de l'application pour le TP

| Fichier | Changement | Pourquoi |
|---|---|---|
| `next.config.mjs` | `output: 'standalone'` | Next.js produit `.next/standalone` : un `server.js` et uniquement les dépendances réellement utilisées. Pas besoin de tout `node_modules` dans l'image. |
| `app/healthz/route.ts` | Nouvelle route `GET /healthz` → `ok` | Sonde pour le healthcheck, qui prouve que le serveur répond sans appeler Supabase. |
| `proxy.ts` | `/healthz` exclu du middleware | Le middleware interroge Supabase à chaque requête : la sonde ne doit pas en dépendre. |

## Construction

Le **contexte de build est la racine du dépôt** (`context: ../..` dans le
compose), car c'est là que vit le code Next.js. Le fichier
`Dockerfile.dockerignore`, placé à côté du Dockerfile, est une liste blanche :
seuls `app/`, `components/`, `lib/`, `hooks/`, `types/`, `public/` et les
fichiers de configuration entrent dans le build. Ni `node_modules`, ni `.git`,
ni les `.env`, ni la documentation, ni l'API v2.

L'image est construite en **deux étapes** :

1. **`build`** : installe Node.js et pnpm, installe les dépendances, puis
   `next build`.
2. **image finale** : Node.js seul, plus le résultat du build. Ni pnpm, ni les
   sources, ni les dépendances de développement (TypeScript, Tailwind...).

### Dépendances installées

| Paquet | Étape | Pourquoi |
|---|---|---|
| `nodejs` (24.18) | build et finale | Exécute Next.js. Next 16 demande Node 20.9 ou plus. |
| `pnpm` (11.20) | build seulement | Gestionnaire de paquets du projet : installe les versions exactes de `pnpm-lock.yaml` (`--frozen-lockfile`). |

**Scripts d'installation bloqués.** pnpm 11 refuse par défaut d'exécuter les
scripts d'installation des dépendances (protection contre les paquets
malveillants) et en faisait une erreur pour `core-js`, `protobufjs`, `sharp` et
`unrs-resolver`. Aucun n'est nécessaire ici : `sharp` utilise des binaires
précompilés pour musl, les autres scripts n'affichent qu'un message ou
préparent une solution de repli. Les scripts restent donc bloqués, et
`--config.strict-dep-builds=false` empêche seulement d'en faire une erreur. Pour
la même raison, le build appelle `next build` directement plutôt que
`pnpm build`, qui revérifie l'installation sans cette option.

### Manipulations sur l'OS

| Instruction | Pourquoi |
|---|---|
| `COPY package.json pnpm-lock.yaml` puis `pnpm install`, **avant** `COPY . .` | Cette couche reste en cache tant que les dépendances ne changent pas : modifier le code ne relance pas l'installation. |
| `ARG NEXT_PUBLIC_*` + `ENV` | Next.js inscrit les variables `NEXT_PUBLIC_*` dans le code envoyé au navigateur **au moment du build** : ce sont des arguments de build, pas de run. |
| `ENV NEXT_TELEMETRY_DISABLED=1` | Pas d'envoi de statistiques d'usage à Vercel pendant le build ni à l'exécution. |
| `COPY .next/standalone`, `.next/static`, `public` | Le serveur autonome ne contient ni les fichiers statiques ni `public/` : on les place là où `server.js` les cherche. |
| `ln -s /tmp/next-cache /app/.next/cache` | Next.js écrit son cache (images optimisées, données) dans `.next/cache`. Le système de fichiers est en lecture seule : le cache part dans `/tmp`, un tmpfs en mémoire. |
| `USER app` | Node.js ne tourne pas en root. |

### Port

`EXPOSE 3000/tcp`. Non publié sur l'hôte : seule la passerelle y accède.

## Arguments attendus

### Arguments de build

| Argument | Variable du `.env` / de la commande | Défaut | Rôle |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `FRONT_SUPABASE_URL` | `http://127.0.0.1:54321` (aucun Supabase) | URL du projet Supabase de la v1. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `FRONT_SUPABASE_ANON_KEY` | valeur factice | Clé publique du projet. |
| `NEXT_PUBLIC_APP_URL` | dérivée de `WEB_PUBLISHED_PORT` | `http://localhost:8080` | Adresse publique de l'application. |

Les valeurs réelles ne sont pas écrites dans le dépôt : on les passe à la commande.

```sh
FRONT_SUPABASE_URL=https://xxx.supabase.co FRONT_SUPABASE_ANON_KEY=... docker compose up -d --build
```

### Arguments de l'application (run)

| Variable | Défaut | Contrôle | Rôle |
|---|---|---|---|
| `NODE_HEAP_MB` | `192` | 64 à 4096 | Taille maximum du tas JavaScript (`--max-old-space-size`). Elle reste sous la limite mémoire du conteneur, dont le reste sert au code natif de Node.js, aux tampons et au tmpfs. |
| `PORT` | `3000` | 1024 à 65535 | Port d'écoute. |

### Arguments Docker (ressources)

| Option `docker run` | Équivalent compose | Valeur | Rôle |
|---|---|---|---|
| `--cpus 1.0` | `deploy.resources.limits.cpus` | `FRONT_CPUS` | Le rendu des pages côté serveur est le travail le plus coûteux en CPU. |
| `--memory 384m` | `deploy.resources.limits.memory` | `FRONT_MEMORY` | 72 à 122 Mo au repos, 151 Mo au plus sous charge (mesuré), tas plafonné à 192 Mo, tmpfs de 64 Mo. |
| `--pids-limit 48` | `deploy.resources.limits.pids` | `FRONT_PIDS` | 12 mesurés : Node.js a ses propres threads (pool de libuv, ramasse-miettes de V8). |
| `--tmpfs /tmp:size=64m` | `tmpfs:` | | Cache de Next.js. |

## Entrypoint

```dockerfile
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
```

1. **tini** (PID 1) lance `entrypoint.sh`.
2. **`entrypoint.sh`** :
   - vérifie les arguments ;
   - crée `/tmp/next-cache`, la cible du lien `.next/cache` ;
   - exporte `NODE_OPTIONS=--max-old-space-size=$NODE_HEAP_MB` ;
   - exporte `HOSTNAME=0.0.0.0` : Docker fixe `HOSTNAME` au nom du conteneur, et
     Next.js n'écouterait alors que sur cette adresse ;
   - affiche les ressources allouées, puis fait `exec "$@"`.
3. Node.js remplace le shell et reçoit directement `SIGTERM`.

## Gestion des signaux d'arrêt

`STOPSIGNAL SIGTERM`. Le serveur autonome de Next.js intercepte `SIGTERM` et
s'arrête de lui-même. Arrêt mesuré : 0,2 s, code de sortie 0. Le compose laisse
10 s avant le `SIGKILL`.

Non vérifié à ce jour : si une requête en cours de rendu au moment du signal est
terminée ou coupée.

## Healthcheck

```dockerfile
HEALTHCHECK --interval=5s --timeout=3s --start-period=15s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
```

À ne pas confondre avec le `/healthz` de la passerelle : celui-ci est interne au
conteneur front, celui de `web` est servi par nginx.

## Mesures (2026-10-08)

| Mesure | Résultat |
|---|---|
| Taille de l'image | 302 Mo (Node.js 24 + serveur autonome) |
| Démarrage du serveur | « Ready in 39ms » |
| Mémoire au repos | 72 Mo juste après le démarrage, 122 Mo après quelques pages rendues |
| Charge : 1 000 rendus de `/login`, 30 simultanés | 1 000 réponses 200 en 5,7 s ; 151 Mo, 12 pids, **102 % de CPU, soit sa limite d'un cœur** |
| Arrêt | 0,2 s, code 0 |
