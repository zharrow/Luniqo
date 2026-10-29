# Banc de mesure : consommation CPU des conteneurs

Demande du cours (2026-10-29) : mesurer la consommation CPU due aux conteneurs
Docker. Le banc répond à trois questions :

1. Combien de CPU chaque conteneur consomme-t-il, au repos, sous charge et
   pendant la chaîne de CI ?
2. Les limites `cpus` du compose jouent-elles leur rôle ?
3. Combien coûte **Docker lui-même**, en plus du travail des conteneurs ?

```sh
docker compose up -d --wait        # ou ./pipeline.sh : la pile doit tourner
bench/bench.sh                     # environ 3 minutes ; résultat dans bench/resultats/
BENCH_DURATION=60 BENCH_CONNECTIONS=64 bench/bench.sh   # autre charge
STACK_PROJECT=luniqo-essai bench/bench.sh               # pile lancée avec -p luniqo-essai
```

## Méthode

| Quoi | Comment | Pourquoi |
|---|---|---|
| CPU d'un conteneur de la pile | Compteur `usage_usec` de son cgroup (`/sys/fs/cgroup/cpu.stat`), lu avec `docker exec` avant et après chaque phase | Temps CPU **exact** consommé par tous les processus du conteneur. `docker stats` ne donne qu'un pourcentage instantané, échantillonné. |
| CPU d'un conteneur éphémère (générateur, lint, test) | Le conteneur lit son propre `cpu.stat` à la fin de son travail et l'affiche ; `test-db` est lue avant sa suppression | Un conteneur arrêté n'a plus de cgroup à interroger. |
| CPU de la VM Docker | Temps CPU cumulé du processus de la VM vu depuis macOS (`ps -o time`, processus `OrbStack Helper`), avant et après | Sur macOS, Docker tourne dans une VM Linux. Son temps CPU couvre les conteneurs **et** le moteur Docker, le noyau de la VM et le réseau virtuel. |
| Coût de Docker | VM − somme des conteneurs (générateur compris) | Ce que la machine dépense en plus du travail des conteneurs. |
| Cœurs utilisés | temps CPU ÷ durée de la phase | 1,00 = un cœur occupé en permanence. Comparé à la limite `cpus` de chaque conteneur et aux 10 cœurs de la machine. |
| Charge | wrk dans l'image `luniqo/bench`, sur le réseau `edge` de la pile, contre `http://web:8080` | Même chemin qu'un navigateur (passerelle d'abord), sans le port publié de l'hôte. |

Phases, 30 s chacune sauf la CI :

1. **Repos** : aucune requête.
2. **Charge sur l'API** : `GET /api/health`, qui traverse web → api → db
   (`SELECT 1`).
3. **Charge sur le front** : `GET /connexion`, fichiers du front v2 servis par
   nginx.
4. **Chaîne de CI** : `lint` puis `test` (`docker-compose.ci.yml`), pendant que
   la pile tourne.

## Résultats `[RÉEL]`

Mesurés le 2026-10-29 sur un Mac Apple M4 (10 cœurs), Docker 29.8.2 sous
OrbStack (VM Linux 7.2, 7,8 Gio), wrk avec 32 connexions et 2 threads. Trois
passages par pile : les fourchettes donnent le plus petit et le plus grand des
trois. Fichiers bruts dans [resultats/](resultats/). Le code de la pile est
celui du commit indiqué dans chaque fichier ; le banc lui-même n'était pas
encore commité.

### Pile actuelle (`develop`, `f500052` : db, api, web avec le front v2)

| Phase | Conteneur le plus sollicité | Pile (total) | Générateur | VM Docker | **Coût de Docker** | Débit |
|---|---|---|---|---|---|---|
| Repos | api 0,007 cœur | 0,015 à 0,016 cœur | | 0,066 à 0,069 | **0,050 à 0,054 cœur** | |
| Charge API | **api 0,475 à 0,477 cœur, 95 % de sa limite (0,5)** ; db 0,034 à 0,041 ; web 0,039 à 0,046 | 0,551 à 0,555 | 0,010 à 0,011 | 0,714 à 0,720 | **0,150 à 0,154** | 466 à 486 req/s ; médiane 76 à 79 ms, 99e centile 117 à 164 ms |
| Charge front | **web 0,238 cœur, 95 % de sa limite (0,25)** | 0,246 à 0,247 | 0,164 à 0,170 | 0,761 à 0,780 | **0,351 à 0,363** | 14 291 à 14 720 req/s ; médiane 0,76 ms, 99e centile 74 à 76 ms |
| Chaîne de CI (58 à 60 s) | **test 45,5 à 47,5 s de CPU**, 0,79 cœur en moyenne sur la phase ; lint 0,6 à 0,7 s ; test-db 4,9 à 5,1 s | 0,011 à 0,014 | | 0,981 à 0,989 | **0,087 à 0,091** | 543 tests |

### Pile précédente (`3532e25` : db, api, front Next.js, web)

| Phase | Conteneur le plus sollicité | Pile (total) | VM Docker | **Coût de Docker** | Débit |
|---|---|---|---|---|---|
| Repos | api 0,007 cœur | 0,019 à 0,020 cœur | 0,066 à 0,081 | **0,046 à 0,062** | |
| Charge API | api 0,475 à 0,476 cœur (95 % de 0,5) | 0,557 à 0,565 | 0,732 à 0,740 | **0,157 à 0,166** | 471 à 494 req/s |
| Charge front (`/login`, rendu serveur Next.js) | **front 0,944 à 0,954 cœur, 95 % de sa limite (1,0)** | 0,982 à 0,992 | 1,105 à 1,114 | **0,110 à 0,117** | **163 à 183 pages/s** |
| Chaîne de CI (473 tests) | test 32,3 à 34,3 s de CPU ; lint 0,7 à 0,8 s ; test-db 3,9 à 4,2 s | 0,015 à 0,021 | 0,969 à 0,985 | **0,109 à 0,113** | 473 tests |

## Ce que les mesures montrent

**1. Au repos, les conteneurs ne coûtent presque rien.** Toute la pile
consomme 0,015 à 0,020 cœur (0,2 % de la machine au plus), et la VM Docker
entière 0,07 à 0,08 cœur, moteur compris. Un conteneur inactif est un processus endormi, pas un
système qui tourne à vide comme une VM.

**2. Les limites jouent leur rôle.** Sous charge, le conteneur sollicité
plafonne à 95 % de sa limite, à chaque passage : l'API à 0,475 cœur pour 0,5,
nginx à 0,238 pour 0,25, l'ancien Next.js à 0,95 pour 1. Les autres conteneurs
ne sont pas touchés (la base reste sous 0,05 cœur). Le goulot est toujours le
conteneur limité, jamais la machine (11 % des cœurs au plus).

**3. Le coût de Docker suit le trafic réseau, pas le calcul.**

| Situation | Travail des conteneurs | Coût de Docker | Surcoût |
|---|---|---|---|
| Chaîne de CI (calcul, peu de réseau) | 0,89 cœur | 0,09 cœur | ≈ 10 % |
| Charge API (≈ 475 req/s) | 0,56 cœur | 0,15 cœur | ≈ 27 % |
| Charge front (≈ 14 500 req/s) | 0,41 cœur | 0,36 cœur | ≈ 87 % |

Chaque requête traverse le réseau virtuel (pont, interfaces virtuelles) et le
noyau de la VM. Ce travail n'est compté dans le cgroup d'aucun conteneur. Pour
un calcul comme les tests, Docker ajoute environ 10 %. Pour des milliers de
petites requêtes par seconde, presque autant que le travail lui-même.

**4. Le front v2 coûte environ 340 fois moins de CPU par page.** L'ancien
front calculait chaque page sur le serveur : 5,8 ms de CPU par page (0,98 cœur
pour 170 pages/s). Le front v2 est un ensemble de fichiers servis par nginx :
17 µs par requête (0,246 cœur pour 14 500 req/s). C'est une conséquence
directe d'[ADR-002](../../M2/decisions/ADR-002-front-v2.md).

**5. Le générateur de charge pèse peu.** wrk consomme 0,01 cœur sous charge
API et 0,17 cœur à 14 500 req/s. Il tourne dans la même VM et reste loin de sa
limite (1 cœur) : il ne fausse pas la mesure.

Conséquence pour le dimensionnement : pour une micro-crèche (12 enfants, une
poignée d'utilisateurs simultanés), les limites actuelles (1,75 cœur au total
pour la pile) laissent une marge de plusieurs ordres de grandeur. Le premier
réglage à relever, si le trafic grandissait, serait `API_CPUS` avec
`API_WORKERS` (voir [le README du TP](../README.md#les-limitations-de-ressources-conteneur-par-conteneur)).

## Limites de la mesure

- **Une seule machine**, un Mac sous OrbStack : sur le VPS (Linux, sans VM),
  la ligne « VM Docker » n'existe pas et le coût du réseau virtuel sera
  différent. Le banc est à relancer sur le VPS ; sous Linux, il mesure les
  conteneurs et indique « non mesurée » pour la VM.
- **Le coût de Docker est un solde** : il contient aussi les services
  d'OrbStack et les `docker exec` du banc lui-même (une lecture de fichier par
  conteneur, avant et après chaque phase, hors de la fenêtre chronométrée de
  la VM).
- **wrk mesure en boucle fermée** : il attend la réponse avant d'envoyer la
  requête suivante sur une connexion. Les latences sont donc sous-estimées
  quand le serveur sature (biais dit de « coordinated omission » ; wrk2 envoie
  à débit constant pour l'éviter). Les débits et les consommations CPU ne sont
  pas concernés.
- **`/api/health` est une route légère** (`SELECT 1`) : elle mesure le coût
  du chemin passerelle → API → base, pas celui d'une route métier.

## Image `luniqo/bench`

Le générateur de charge, construit comme les autres images à partir de
`luniqo/base` (aucune image Docker Hub).

### Dépendances installées

| Dépendance | Source | Pourquoi |
|---|---|---|
| `wrk` 4.2.0 | apk (Alpine, `community`) | Générateur de charge HTTP en C, une boucle d'événements par thread : il produit des milliers de requêtes par seconde avec très peu de CPU (mesuré : 0,01 à 0,17 cœur). |

Non retenus, sans comparaison mesurée : `hey` (Go) et `ab` d'Apache
(`apache2-utils`, un seul thread). wrk donne en plus la distribution des
latences (`--latency`).

### Manipulations sur l'OS

Aucune en dehors de `apk add --no-cache wrk` et de `USER app` : le générateur
n'écrit rien sur le disque.

### Arguments attendus au run

| Variable | Défaut | Contrôle | Rôle |
|---|---|---|---|
| `BENCH_URL` | `http://web:8080/api/health` | commence par `http://` | Adresse chargée. |
| `BENCH_DURATION` | `30` | 1 à 600 | Durée de la charge, en secondes. |
| `BENCH_CONNECTIONS` | `32` | 1 à 1000, au moins `BENCH_THREADS` | Connexions ouvertes en même temps. |
| `BENCH_THREADS` | `2` | 1 à 16 | Threads de wrk. |

| Option `docker run` | Équivalent compose | Variable | Mesure |
|---|---|---|---|
| `--cpus 1.0` | `deploy.resources.limits.cpus` | `BENCH_CPUS` | 0,17 cœur au plus : la limite ne bride jamais la charge. |
| `--memory 32m` | `deploy.resources.limits.memory` | `BENCH_MEMORY` | 4 à 7 Mo au plus (`memory.peak`, 32 connexions). |
| `--pids-limit 8` | `deploy.resources.limits.pids` | `BENCH_PIDS` | 5 au plus (`pids.peak`) : tini, le script, wrk et ses 2 threads. |

Le conteneur rejoint le réseau `edge` de la pile (`external: true`, nommé
d'après `STACK_PROJECT`) : il joint la passerelle par son nom de service.

### Entrypoint et signaux

```dockerfile
STOPSIGNAL SIGINT
ENTRYPOINT ["/sbin/tini", "-g", "--", "/usr/local/bin/charge.sh"]
```

`charge.sh` vérifie les arguments, affiche les ressources allouées, lance wrk,
puis affiche le CPU consommé par le conteneur. Il ne fait pas `exec` : il doit
reprendre la main après wrk pour cet affichage.

wrk intercepte SIGINT : il arrête la charge et **affiche quand même ses
statistiques**. SIGTERM le tuerait sans résultat, d'où `STOPSIGNAL SIGINT`.
`tini -g` envoie le signal à tout le groupe, donc à wrk. Le script, lui,
ignore SIGINT (`trap '' INT`) pour survivre et afficher le CPU consommé. wrk
installe son propre gestionnaire et reçoit donc quand même le signal. Mesuré :
`docker stop` pendant une charge de 60 s, arrêt en 0,33 s, code 0, avec les
statistiques des 6 premières secondes (3 034 requêtes) et le CPU consommé.
