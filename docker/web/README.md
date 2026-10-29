# Image `luniqo/web`

Le serveur web de Luniqo : une passerelle nginx, **seul point d'entrée** de la
plateforme. Elle sert le **front v2** (application monopage React + Vite,
[ADR-002](../../M2/decisions/ADR-002-front-v2.md)), dont elle construit les
fichiers dans une première étape, et relaie l'API ; ni l'API ni la base ne sont
exposées sur la machine hôte.

| Chemin | Servi par |
|---|---|
| `/api/*` | l'API (`API_ADDR`, `api:8000`), URI transmise telle quelle |
| `/assets/*` | fichiers du front produits par Vite (nom avec empreinte), cache immuable d'un an ; 404 si absent |
| tout le reste | le fichier demandé s'il existe, sinon `index.html` : le routeur du navigateur affiche la page (`/accueil`, `/connexion`…) |
| `/healthz` | réponse fixe de nginx, pour le healthcheck |

Si l'API ne répond pas, la passerelle sert une page « Luniqo est momentanément
indisponible » (code 502) au lieu d'une erreur brute, par exemple pendant son
redémarrage.

Jusqu'au tag `tp-docker-v1`, le front était un serveur Next.js dans sa propre
image (`luniqo/front`), vers lequel la passerelle relayait les pages.

## Construction

Le contexte de build est la **racine du dépôt** ; `Dockerfile.dockerignore` n'en
laisse passer que `front/` et `docker/web/`, sans dépendances ni artefacts locaux.

### Étape 1 : build du front (jetée)

| Paquet | Pourquoi |
|---|---|
| `nodejs` | Exécute Vite (Node 24 dans Alpine 3.24 ; Vite 8 demande 20.19 au moins). |
| `pnpm` | Installe les dépendances du front depuis `front/pnpm-lock.yaml` (`--frozen-lockfile`). Paquet d'Alpine en 11.20, même version majeure que le projet : même format de lockfile. `--pm-on-fail=warn` le garde au lieu d'en télécharger un autre pour suivre la version exacte du champ `packageManager`. Les scripts d'installation des dépendances restent ceux autorisés dans `front/pnpm-workspace.yaml`. |

`vite build` produit `dist/` (636 Kio, mesuré le 2026-10-27), copié dans l'image
finale. Node.js, pnpm, `node_modules` et les sources n'y entrent pas.

### Étape 2 : image finale — dépendances installées

| Paquet | Pourquoi |
|---|---|
| `nginx` | Reverse proxy. Léger (3 à 5 Mo de mémoire mesurés), et son modèle master + workers permet de régler précisément sa consommation par les arguments. Version 1.30.4 dans Alpine 3.24. |

Le healthcheck utilise `wget` et l'entrypoint `sed`, tous deux fournis par
BusyBox dans l'image de base.

### Manipulations sur l'OS

| Instruction | Pourquoi |
|---|---|
| `rm -rf /etc/nginx/nginx.conf /etc/nginx/http.d` | Configuration par défaut d'Alpine, remplacée par notre modèle : aucune ambiguïté sur la configuration utilisée. |
| `rm -rf /var/lib/nginx/html` | Page « Welcome to nginx » du paquet, inutile. |
| `rm -rf /etc/logrotate.d/nginx` | Rotation des logs inutile : ils partent sur la sortie standard, Docker les gère. |
| `COPY nginx.conf.template /etc/nginx/` | Modèle de configuration, complété au démarrage avec les arguments. |
| `COPY security-headers.conf /etc/nginx/` | En-têtes de sécurité du front, CSP comprise, inclus dans chaque bloc `location` du front : nginx n'hérite pas des `add_header` du niveau supérieur dans un bloc qui en pose. Pas appliqués à `/api/` : la CSP stricte bloquerait Swagger UI (`/api/docs`), qui charge ses scripts depuis un CDN. |
| `COPY --from=build dist/ /srv/front/` | Les fichiers du front v2. |
| `COPY www/ /srv/www/` | La page d'indisponibilité. Sans `--chmod` : appliqué à un dossier, `--chmod=0644` le rendrait impossible à parcourir. |
| `USER app` | nginx tourne entièrement sous l'utilisateur non-root, master compris. |

Tout ce que nginx écrit va dans `/tmp/nginx` (configuration générée, PID,
fichiers temporaires) ou sur la sortie standard (logs) : les chemins compilés
dans le nginx d'Alpine appartiennent à l'utilisateur `nginx` du paquet, et le
compose monte le système de fichiers en lecture seule.

### Port

`EXPOSE 8080/tcp` plutôt que 80 : nginx tourne en non-root, et seul root peut
normalement ouvrir un port inférieur à 1024. Le compose publie ce port sur
l'hôte (`WEB_PUBLISHED_PORT`).

## Arguments attendus au run

### Arguments de l'application (variables d'environnement)

| Variable | Défaut | Contrôle | Rôle |
|---|---|---|---|
| `NGINX_WORKER_PROCESSES` | `1` | 1 à 64 | Processus workers. La valeur suit la limite CPU (1 pour 0,25 CPU). `auto` compterait les cœurs de l'**hôte** et non la limite du conteneur. |
| `NGINX_WORKER_CONNECTIONS` | `512` | 16 à 65535 | Connexions simultanées par worker. Une requête relayée en consomme deux (client et service). |
| `API_ADDR` | `api:8000` | forme `hôte:port` | API FastAPI. |

### Arguments Docker (ressources)

| Option `docker run` | Équivalent compose | Valeur | Rôle |
|---|---|---|---|
| `--cpus 0.25` | `deploy.resources.limits.cpus` | `WEB_CPUS` | nginx ne fait que relayer. |
| `--memory 32m` | `deploy.resources.limits.memory` | `WEB_MEMORY` | 3 à 5 Mo mesurés en relais seul ; 10,5 Mo en servant aussi le front (2026-10-27, 400 requêtes). |
| `--pids-limit 16` | `deploy.resources.limits.pids` | `WEB_PIDS` | tini + master + worker + commandes du healthcheck (3 mesurés). |
| `-p 8080:8080` | `ports:` | `WEB_PUBLISHED_PORT` | Publication sur l'hôte. |

```sh
docker run -d --name web --network backend \
  --cpus 0.25 --memory 32m --pids-limit 16 \
  --read-only --tmpfs /tmp:size=16m \
  -e NGINX_WORKER_PROCESSES=1 -e NGINX_WORKER_CONNECTIONS=512 \
  -e API_ADDR=api:8000 \
  -p 8080:8080 luniqo/web:2.0
docker network connect edge web
```

## Entrypoint

```dockerfile
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-c", "/tmp/nginx/nginx.conf", "-e", "stderr", "-g", "daemon off;"]
```

1. **tini** (PID 1) lance `entrypoint.sh`.
2. **`entrypoint.sh`** :
   - vérifie les arguments ;
   - génère `/tmp/nginx/nginx.conf` en remplaçant avec `sed` les marqueurs
     `__WORKER_PROCESSES__`, `__WORKER_CONNECTIONS__` et `__API_ADDR__` du
     modèle (nginx ne lit pas les variables d'environnement) ;
   - **valide la configuration générée** (`nginx -t`) : une erreur arrête le
     conteneur avec un message clair ;
   - affiche les ressources allouées, puis fait `exec "$@"`.
3. nginx remplace le shell et reçoit directement le signal d'arrêt.

Options : `-e stderr` (nginx ouvre son log d'erreurs avant de lire sa
configuration, il essaierait sinon `/var/log/nginx`) et `-g "daemon off;"`
(nginx reste au premier plan, sinon le conteneur s'arrêterait).

## Résolution des services à chaque requête

Dans le premier TP, nginx résolvait l'adresse du back **une seule fois, au
démarrage** : il refusait de démarrer si le back n'existait pas
(`host not found in upstream`), et gardait l'ancienne IP si le back était recréé.

Ici, les adresses sont placées dans des variables (`set $api_upstream ...`) et
nginx interroge le DNS de Docker (`resolver 127.0.0.11 valid=10s`) **au moment
des requêtes**. La passerelle démarre donc même si un service est absent, et
retrouve un service recréé avec une nouvelle IP sans redémarrer.

## Sécurité

| Réglage | Effet |
|---|---|
| `server_tokens off` | La version de nginx n'apparaît ni dans les en-têtes ni dans les pages d'erreur. |
| `X-Content-Type-Options: nosniff` | Le navigateur respecte le type déclaré des réponses. |
| `X-Frame-Options: SAMEORIGIN` | Les pages ne peuvent pas être intégrées dans un site tiers (clickjacking). |
| `Referrer-Policy: strict-origin-when-cross-origin` | Limite les informations transmises aux sites externes. |
| `client_max_body_size 10m` | Borne la taille des envois. |
| `X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto` | Les services connaissent l'adresse réelle du client. |

## Gestion des signaux d'arrêt

| Signal | Comportement de nginx |
|---|---|
| `SIGTERM` | arrêt **immédiat** : les requêtes en cours sont coupées |
| `SIGQUIT` | arrêt **propre** : plus de nouvelles connexions, les requêtes en cours se terminent |

L'image déclare `STOPSIGNAL SIGQUIT`. Arrêt mesuré : moins d'une seconde, code
de sortie 0.

## Healthcheck

```dockerfile
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
```

Le healthcheck ne dépend que de nginx : une passerelle saine peut relayer vers
un service en panne, et c'est voulu (elle affiche alors la page d'indisponibilité).
