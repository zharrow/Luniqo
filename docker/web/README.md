# Image `luniqo/web`

Le serveur web de Luniqo : une passerelle nginx, **seul point d'entrée** de la
plateforme. C'est un **reverse proxy** : il relaie l'API et le front, chacun
dans son conteneur, et ne sert lui-même que sa page d'indisponibilité et son
healthcheck. Ni l'API, ni le front, ni la base ne sont exposés sur la machine
hôte.

| Chemin | Relayé vers |
|---|---|
| `/api/*` | l'API (`API_ADDR`, `api:8000`), URI transmise telle quelle |
| tout le reste | le front (`FRONT_ADDR`, `front:8080`) : pages et fichiers du front v2 |
| `/healthz` | réponse fixe de nginx, pour le healthcheck |

Si un service ne répond pas, la passerelle sert une page « Luniqo est
momentanément indisponible » (code 502) au lieu d'une erreur brute. Mesuré le
2026-10-29 : front arrêté, les pages affichent cette page et l'API continue de
répondre.

**Historique.** Au tag `tp-docker-v1`, la passerelle relayait vers le serveur
Next.js de la v1. Le squelette du front v2 (LUN-107) lui avait ensuite confié
la construction et le service des fichiers du front (`luniqo/web:2.0`). Pour
le TP, ils sont repassés dans leur propre image, [`luniqo/front`](../front/README.md)
(LUN-117) : `luniqo/web:3.0` redevient une passerelle seule, sans Node.js ni
fichiers du front.

## Construction

Une seule étape. Contexte : `docker/web/` ; `.dockerignore` n'en laisse passer
que l'entrypoint, le modèle de configuration et la page d'indisponibilité.

### Dépendances installées

| Paquet | Pourquoi |
|---|---|
| `nginx` | Reverse proxy. Léger (3 à 5 Mo de mémoire mesurés en relais seul), et son modèle master + workers permet de régler précisément sa consommation par les arguments. Version 1.30 dans Alpine 3.24. |

Le healthcheck utilise `wget` et l'entrypoint `sed`, tous deux fournis par
BusyBox dans l'image de base.

### Manipulations sur l'OS

| Instruction | Pourquoi |
|---|---|
| `rm -rf /etc/nginx/nginx.conf /etc/nginx/http.d` | Configuration par défaut d'Alpine, remplacée par notre modèle : aucune ambiguïté sur la configuration utilisée. |
| `rm -rf /var/lib/nginx/html` | Page « Welcome to nginx » du paquet, inutile. |
| `rm -rf /etc/logrotate.d/nginx` | Rotation des logs inutile : ils partent sur la sortie standard, Docker les gère. |
| `COPY nginx.conf.template /etc/nginx/` | Modèle de configuration, complété au démarrage avec les arguments. |
| `COPY www/ /srv/www/` | La page d'indisponibilité. Sans `--chmod` : appliqué à un dossier, `--chmod=0644` le rendrait impossible à parcourir. |
| `USER app` | nginx tourne entièrement sous l'utilisateur non-root, master compris. |

Tout ce que nginx écrit va dans `/tmp/nginx` (configuration générée, PID,
fichiers temporaires) ou sur la sortie standard (logs) : le compose monte le
système de fichiers en lecture seule.

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
| `FRONT_ADDR` | `front:8080` | forme `hôte:port` | Conteneur du front. |
| `API_ADDR` | `api:8000` | forme `hôte:port` | API FastAPI. |

### Arguments Docker (ressources)

| Option `docker run` | Équivalent compose | Variable | Mesure |
|---|---|---|---|
| `--cpus 0.25` | `deploy.resources.limits.cpus` | `WEB_CPUS` | 0,004 cœur au repos ; 0,03 cœur sous charge API ; 0,24 cœur (94 à 96 % de la limite) pour environ 11 900 pages/s : la passerelle est le goulot des pages (banc du 2026-10-29). Relever `WEB_CPUS` avec `WEB_WORKER_PROCESSES` si le trafic l'exigeait. |
| `--memory 32m` | `deploy.resources.limits.memory` | `WEB_MEMORY` | 2,5 à 3,4 Mo au repos comme sous charge (`docker stats`, 2026-10-29). |
| `--pids-limit 16` | `deploy.resources.limits.pids` | `WEB_PIDS` | tini + master + worker + commandes du healthcheck (3 mesurés). |
| `-p 8080:8080` | `ports:` | `WEB_PUBLISHED_PORT` | Publication sur l'hôte. |

```sh
docker run -d --name web --network edge \
  --cpus 0.25 --memory 32m --pids-limit 16 \
  --read-only --tmpfs /tmp:size=16m --cap-drop ALL \
  -e FRONT_ADDR=front:8080 -e API_ADDR=api:8000 \
  -p 8080:8080 luniqo/web:3.0
docker network connect frontend web
docker network connect backend web
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
     `__WORKER_PROCESSES__`, `__WORKER_CONNECTIONS__`, `__FRONT_ADDR__` et
     `__API_ADDR__` du modèle (nginx ne lit pas les variables d'environnement) ;
   - **valide la configuration générée** (`nginx -t`) : une erreur arrête le
     conteneur avec un message clair ;
   - affiche les ressources allouées, puis fait `exec "$@"`.
3. nginx remplace le shell et reçoit directement le signal d'arrêt.

Options : `-e stderr` (nginx ouvre son log d'erreurs avant de lire sa
configuration, il essaierait sinon `/var/log/nginx`) et `-g "daemon off;"`
(nginx reste au premier plan, sinon le conteneur s'arrêterait).

## Résolution des services et connexions persistantes

Dans le premier TP, nginx résolvait l'adresse du back **une seule fois, au
démarrage** : il refusait de démarrer si le back n'existait pas
(`host not found in upstream`), et gardait l'ancienne IP si le back était recréé.

Ici, chaque service est un groupe `upstream` dont le serveur porte le
paramètre `resolve` (disponible dans la version libre de nginx depuis la
1.27.3) : nginx réinterroge le DNS de Docker (`resolver 127.0.0.11 valid=10s`)
et met l'adresse à jour sans redémarrer.

```nginx
upstream front {
    zone front 64k;            # mémoire partagée, exigée par resolve
    server front:8080 resolve;
    keepalive 16;              # connexions gardées ouvertes vers le front
}
```

Vérifié le 2026-10-29 : la passerelle démarre et reste saine sans le front
(journal : `front could not be resolved`, pages en 502, API en 200), puis
retrouve le front dès qu'il démarre, et après sa recréation.

**Ce que la mesure a fait changer.** La première version de la passerelle
relayait vers une variable (`proxy_pass $front_upstream`), ce qui donnait la
même résolution dynamique mais **aucune connexion persistante** : nginx
ouvrait une connexion TCP vers le front à chaque requête. Le banc de mesure l'a
montré (trois passages, 2026-10-29) : la passerelle plafonnait à 95 % de sa
limite de 0,25 cœur pour 822 à 882 requêtes/s, contre environ 14 500 quand elle
servait elle-même les fichiers du front. Avec les groupes `upstream` et leurs connexions persistantes (trois passages) : **11 596 à 11 940 requêtes/s**, 13 à 14 fois plus pour le même CPU de la passerelle, qui reste le goulot ; sous charge API, son CPU est divisé par deux (0,026 à 0,030 cœur contre 0,041 à 0,043).

`proxy_http_version 1.1` et `proxy_set_header Connection ""`, nécessaires aux
connexions persistantes, sont posés au niveau `http` : un `proxy_set_header`
dans un bloc `location` remplacerait tous ceux du niveau supérieur
(`X-Forwarded-For`…).

## Sécurité

| Réglage | Effet |
|---|---|
| `server_tokens off` | La version de nginx n'apparaît ni dans les en-têtes ni dans les pages d'erreur. |
| En-têtes de l'API (bloc `/api/` seulement) | `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`. Pas la CSP stricte du front : elle bloquerait Swagger UI (`/api/docs`), qui charge ses scripts depuis un CDN. |
| Aucun en-tête ajouté aux pages du front | Le front pose les siens (CSP, `X-Frame-Options: DENY`…). S'ils étaient aussi posés au niveau `http`, nginx les ajouterait aux réponses relayées : `X-Frame-Options` arriverait deux fois, avec deux valeurs contradictoires. Vérifié par la CI (un seul `X-Frame-Options` sur `/connexion`). |
| `client_max_body_size 10m` | Borne la taille des envois. |
| `X-Forwarded-For` remplacé, `X-Real-IP`, `X-Forwarded-Proto` | Les services connaissent l'adresse réelle du client ; un client ne peut pas choisir celle que voit l'API (limitation des tentatives de connexion, LUN-41). |

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
