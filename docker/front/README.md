# Image `luniqo/front`

Le **front** de Luniqo : l'application v2 (React + Vite,
[ADR-002](../../M2/decisions/ADR-002-front-v2.md)), construite dans une
première étape puis servie par un nginx dédié. C'est une application
monopage : le conteneur ne livre que des fichiers (HTML, JavaScript, CSS,
polices) que le navigateur exécute ; toute la logique est dans l'API.

Le conteneur n'est relié qu'au réseau interne `frontend` : seule la passerelle
[`web`](../web/README.md) le joint, et lui relaie tout ce qui n'est pas
`/api/`. Il n'a aucun port publié et aucun accès à internet, ni à l'API ou à
la base (vérifié le 2026-10-29 : `wget` vers `api:8000` ou `example.com`
répond `bad address`).

| Chemin | Réponse |
|---|---|
| `/assets/*` | fichiers produits par Vite (nom avec empreinte), cache immuable d'un an ; 404 si absent |
| tout le reste | le fichier demandé s'il existe, sinon `index.html` : le routeur du navigateur affiche la page (`/accueil`, `/connexion`…) |
| `/healthz` | réponse fixe de nginx, pour le healthcheck |

**Historique.** Au tag `tp-docker-v1`, `luniqo/front:1.0` était le serveur
Next.js de la v1 (302 Mo, jusqu'à un cœur sous charge). Le squelette du front
v2 (LUN-107) avait ensuite intégré ces fichiers à l'image `web`. Le sujet du TP
demandant une image front distincte, ils ont retrouvé la leur (LUN-117) :
`luniqo/front:2.0`.

## Construction

Le contexte de build est la **racine du dépôt** ; `Dockerfile.dockerignore`
n'en laisse passer que `front/` et `docker/front/`, sans dépendances ni
artefacts locaux.

### Étape 1 : build du front (jetée)

| Paquet | Pourquoi |
|---|---|
| `nodejs` | Exécute Vite (Node 24 dans Alpine 3.24 ; Vite 8 demande 20.19 au moins). |
| `pnpm` | Installe les dépendances du front depuis `front/pnpm-lock.yaml` (`--frozen-lockfile`). Paquet d'Alpine en 11.x, même version majeure que le projet : même format de lockfile. `--pm-on-fail=warn` le garde au lieu d'en télécharger un autre pour suivre la version exacte du champ `packageManager`. Les scripts d'installation restent ceux autorisés dans `front/pnpm-workspace.yaml`. |

`vite build` produit `dist/` : 19 fichiers, 636 Kio (affiché par l'entrypoint,
2026-10-29), copiés dans l'image finale. Node.js, pnpm, `node_modules` et les
sources n'y entrent pas.

### Étape 2 : image finale — dépendances installées

| Paquet | Pourquoi |
|---|---|
| `nginx` | Sert des fichiers statiques avec très peu de mémoire et de CPU, pose les en-têtes de sécurité et de cache, et renvoie `index.html` pour les routes de l'application (`try_files`). Version 1.30 dans Alpine 3.24. |

Même serveur que la passerelle : une seule configuration à connaître, et les
réglages du front (en-têtes, `try_files`) étaient déjà éprouvés dans l'image
`web`, qui servait ces fichiers jusqu'à LUN-117. Aucun autre serveur n'a été
essayé.

### Manipulations sur l'OS

| Instruction | Pourquoi |
|---|---|
| `rm -rf /etc/nginx/nginx.conf /etc/nginx/http.d` | Configuration par défaut d'Alpine, remplacée par notre modèle : aucune ambiguïté sur la configuration utilisée. |
| `rm -rf /var/lib/nginx/html` | Page « Welcome to nginx » du paquet, inutile. |
| `rm -rf /etc/logrotate.d/nginx` | Rotation des logs inutile : ils partent sur la sortie standard, Docker les gère. |
| `COPY nginx.conf.template /etc/nginx/` | Modèle de configuration, complété au démarrage avec les arguments. |
| `COPY security-headers.conf /etc/nginx/` | En-têtes de sécurité du front, inclus dans chaque bloc `location` : nginx n'hérite pas des `add_header` du niveau supérieur dans un bloc qui en pose. |
| `COPY --from=build dist/ /srv/front/` | Les fichiers du front, à root : lisibles par `app`, pas modifiables. |
| `USER app` | nginx tourne entièrement sous l'utilisateur non-root, master compris. |

Tout ce que nginx écrit va dans `/tmp/nginx` (configuration générée, PID,
fichiers temporaires) ou sur la sortie standard : le compose monte le système
de fichiers en lecture seule.

### Port

`EXPOSE 8080/tcp` (non-root : pas de port inférieur à 1024). Jamais publié sur
l'hôte : la passerelle le joint sous le nom `front:8080`.

## Sécurité : en-têtes posés par le front

Le front pose ses propres en-têtes ; la passerelle les transmet sans en ajouter
(vérifié : un seul `X-Frame-Options` par réponse, contrôlé aussi par la CI).

| En-tête | Valeur | Pourquoi |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'` … `frame-ancestors 'none'` | Tout vient de Luniqo même : Vite ne produit aucun script en ligne, la police est servie par le front (ADR-002 § 5). |
| `X-Frame-Options` | `DENY` | Aucune page de Luniqo n'a à être affichée dans un cadre. |
| `X-Content-Type-Options` | `nosniff` | Le navigateur respecte le type déclaré. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite les informations transmises aux sites externes. |
| `Permissions-Policy` | caméra, micro, géolocalisation, paiement, USB refusés | Fonctions dont Luniqo n'a pas besoin. |
| `Cache-Control` | `no-cache` pour les pages ; `public, max-age=31536000, immutable` pour `/assets/` | Une nouvelle version est prise au chargement suivant ; les fichiers à empreinte ne sont jamais retéléchargés. |

## Arguments attendus au run

### Arguments de l'application (variables d'environnement)

| Variable | Défaut | Contrôle | Rôle |
|---|---|---|---|
| `NGINX_WORKER_PROCESSES` | `1` | 1 à 64 | Processus workers. La valeur suit la limite CPU (1 pour 0,25 CPU). `auto` compterait les cœurs de l'**hôte**. |
| `NGINX_WORKER_CONNECTIONS` | `512` | 16 à 65535 | Connexions simultanées par worker. |

### Arguments Docker (ressources)

| Option `docker run` | Équivalent compose | Variable | Mesure |
|---|---|---|---|
| `--cpus 0.25` | `deploy.resources.limits.cpus` | `FRONT_CPUS` | 0,004 cœur au repos ; 0,19 à 0,20 cœur (77 à 79 % de la limite) pour environ 11 900 requêtes/s relayées par la passerelle (banc du 2026-10-29, trois passages). Le goulot est alors la passerelle, pas le front. |
| `--memory 32m` | `deploy.resources.limits.memory` | `FRONT_MEMORY` | 2,4 à 3,0 Mo au repos comme sous charge (`docker stats`, fin de phase) : nginx ne fait que lire des fichiers. |
| `--pids-limit 16` | `deploy.resources.limits.pids` | `FRONT_PIDS` | tini, master et worker nginx, commandes du healthcheck. |

```sh
docker run -d --name front --network frontend \
  --cpus 0.25 --memory 32m --pids-limit 16 \
  --read-only --tmpfs /tmp:size=16m --cap-drop ALL \
  -e NGINX_WORKER_PROCESSES=1 -e NGINX_WORKER_CONNECTIONS=512 \
  luniqo/front:2.0
```

## Entrypoint

```dockerfile
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-c", "/tmp/nginx/nginx.conf", "-e", "stderr", "-g", "daemon off;"]
```

1. **tini** (PID 1) lance `entrypoint.sh`.
2. **`entrypoint.sh`** vérifie les arguments, génère `/tmp/nginx/nginx.conf`
   à partir du modèle (`sed`, nginx ne lisant pas les variables
   d'environnement), affiche les ressources allouées et le nombre de fichiers
   servis, **valide la configuration** (`nginx -t`), puis fait `exec "$@"`.
3. nginx remplace le shell et reçoit directement le signal d'arrêt.

## Gestion des signaux d'arrêt

`STOPSIGNAL SIGQUIT` : pour nginx, SIGQUIT est l'arrêt propre (les requêtes en
cours se terminent) et SIGTERM l'arrêt immédiat. Arrêt mesuré le 2026-10-29 :
0,32 s, code 0. Pendant l'arrêt, la passerelle affiche sa page
d'indisponibilité (502) sur les pages, et l'API continue de répondre ;
relancé, le front est sain en 5,3 s et les pages reviennent.

## Healthcheck

```dockerfile
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
```

La passerelle attend que le front soit sain avant de démarrer
(`depends_on: condition: service_healthy`).
