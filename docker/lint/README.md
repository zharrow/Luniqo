# Image `luniqo/lint`

Conteneur de **lint** de la chaîne d'intégration (consigne supplémentaire du
TP). Il ne tourne pas en continu : il est lancé une fois, vérifie le code, puis
s'arrête avec un code de sortie qui décide de la suite de la chaîne (0 :
conforme, le test peut démarrer ; 1 : la chaîne s'arrête et rien n'est
déployé).

Trois contrôles, tous exécutés même si l'un échoue, pour un rapport complet :

| Contrôle | Outil | Sur quoi | Rapport |
|---|---|---|---|
| Code Python de l'API | `ruff check`, règles de `api/ruff.toml` (style, erreurs, imports, pièges courants, **sécurité** avec les règles de Bandit) | `api/` | `reports/ruff.txt` |
| Scripts shell | ShellCheck (variables non protégées, erreurs de syntaxe POSIX, pièges) | entrypoints et scripts communs des images, `pipeline.sh`, `bench/`, `api/scripts/` | `reports/shellcheck.txt` |
| **Zéro image Docker Hub** | règle maison (`awk`) | chaque `Dockerfile` de `docker/` | `reports/images.txt` |

Le troisième contrôle transforme la contrainte principale du TP en règle
vérifiée à chaque passage. Un `FROM` n'est accepté que s'il vise `scratch`,
une image `luniqo/*` ou une étape déclarée plus haut dans le même Dockerfile
(`AS build`). Essai du 2026-10-29 avec un Dockerfile contenant
`FROM python:3.12-alpine` :

```
lint-1  | docker/zz-essai/Dockerfile:1: FROM python:3.12-alpine : image extérieure au projet (autorisé : scratch, luniqo/*, étapes du Dockerfile)
lint-1  | [lint] FROM autorisés : ÉCHEC
Résultat : lint=1 test=absent (5 s)
✗ Chaîne en échec : rien n'est déployé, la version en place continue de tourner.
```

Dès son premier passage, le lint a trouvé un vrai défaut dans
`test/entrypoint.sh` : `SERVICE_NAME=test` (ShellCheck SC2209, `test` est
aussi le nom d'une commande), corrigé en `SERVICE_NAME='test'`.

## Construction

Deux étapes (*multi-stage build*) :

1. **`build`** : installe `python3`, lit la version de ruff dans
   `api/requirements-dev.txt` et l'installe avec pip dans un environnement
   virtuel.
2. **image finale** : repart de `luniqo/base`, ajoute ShellCheck et ne recopie
   que le **binaire** `ruff`. ruff est un programme Rust autonome : le paquet
   PyPI n'est qu'un emballage. L'image livrée ne contient **ni Python ni pip**
   (83 Mo : 18 Mo de `luniqo/base`, 21,6 Mo pour ruff, 21,1 Mo pour ShellCheck,
   selon `docker history`).

### Dépendances installées

| Dépendance | Source | Pourquoi |
|---|---|---|
| `ruff` 0.16.10 | PyPI (paquet `musllinux` précompilé pour Alpine) | Linter Python, le même que celui de la CI GitHub et des postes de développement. La version vient de `requirements-dev.txt` : une seule source de vérité, pas de version qui diverge entre la CI et le conteneur. |
| `shellcheck` 0.11.0 | apk (Alpine, dépôt `community`, paquets signés) | Analyse statique des scripts sh, référence du domaine. |
| `python3` | apk, **étape `build` seulement** | Nécessaire à pip pour télécharger ruff, absent de l'image finale. |

Outil écarté : **hadolint** (lint des Dockerfiles). Il n'existe ni dans les
dépôts Alpine ni sur PyPI : il aurait fallu télécharger un binaire de 60 Mo
depuis GitHub et le vérifier à la main. La règle maison sur les `FROM` couvre
ce qui compte le plus pour ce TP.

### Manipulations sur l'OS

| Instruction | Pourquoi |
|---|---|
| `sed -n 's/^ruff==//p' requirements-dev.txt` | Lit la version figée de ruff. `test -n` arrête le build si la ligne a disparu, plutôt que d'installer la dernière version. |
| `pip install --only-binary=:all:` | Refuse toute compilation : seul un paquet précompilé est accepté. |
| `COPY --from=build /opt/venv/bin/ruff /usr/local/bin/ruff` | Seul le binaire passe dans l'image finale. |
| `install -d -o app -g app -m 0755 /reports` | Dossier des rapports, à l'utilisateur `app`. Un volume nommé vide recopie à sa création le contenu et le **propriétaire** du dossier de l'image : sans cette ligne, le volume appartiendrait à root et `app` ne pourrait pas y écrire. |
| `USER app` | Le lint ne tourne pas en root. |

### Ports

Aucun. Le conteneur n'a même **aucun réseau** (`network_mode: none`) : il lit
des fichiers et écrit des rapports, rien de plus.

## Arguments attendus au run

### Montages

| Montage | Rôle |
|---|---|
| `../api:/workspace/api:ro` | Code de l'API à vérifier, **en lecture seule** : le lint ne peut pas modifier ce qu'il contrôle. |
| `.:/workspace/docker:ro` | Dossier `docker/` (Dockerfiles, scripts), en lecture seule. Ni le `.env` de l'application ni le reste du dépôt ne sont montés. |
| volume `reports:/reports` | Rapports, partagés avec le conteneur `test` et récupérés par `pipeline.sh`. |

### Arguments de l'application

| Variable | Défaut | Contrôle | Rôle |
|---|---|---|---|
| `LINT_RUFF_FORMAT` | `concise` | `concise`, `full`, `github`, `grouped`, `pylint` | Format des erreurs de ruff. `github` les transforme en annotations sur les lignes de la PR. |

### Arguments Docker (ressources)

| Option `docker run` | Équivalent compose | Variable | Mesure (2026-10-29) |
|---|---|---|---|
| `--cpus 1.0` | `deploy.resources.limits.cpus` | `LINT_CPUS` | 0,66 à 0,77 s de CPU en tout, pour un passage de quelques secondes. |
| `--memory 128m` | `deploy.resources.limits.memory` | `LINT_MEMORY` | Pic de 29 à 71 Mo (`memory.peak`, cache des fichiers lus compris : il varie selon ce que le noyau garde en cache). |
| `--pids-limit 16` | `deploy.resources.limits.pids` | `LINT_PIDS` | 6 au plus (`pids.peak`) : tini, le shell, l'outil en cours et ses threads. |
| `--network none` | `network_mode: none` | | Aucun accès réseau. |

## Entrypoint

```dockerfile
ENTRYPOINT ["/sbin/tini", "-g", "--", "/usr/local/bin/lint.sh"]
```

Contrairement aux images de la pile, il n'y a pas de `CMD` remplacé par
`exec` : le script enchaîne trois outils et doit reprendre la main après
chacun pour lancer le suivant et calculer le code de sortie. `lint.sh` :

1. vérifie ses arguments et la présence des montages (sinon code 64) ;
2. affiche les ressources allouées (`tp-resources`) ;
3. lance ruff, ShellCheck, puis la règle sur les `FROM` ; chaque rapport va
   dans `/reports`, et sur la sortie standard en cas d'échec ;
4. affiche le CPU consommé par le conteneur (lu dans son cgroup) ;
5. sort avec 0 si les trois contrôles passent, 1 sinon.

`shellcheck -x` suit les `. /usr/local/lib/tp/common.sh` des entrypoints : ce
fichier se trouve dans cette image (héritée de `luniqo/base`) au même chemin
que dans les autres. Aucune directive n'a été ajoutée aux scripts vérifiés.

## Gestion des signaux d'arrêt

`STOPSIGNAL SIGTERM` et **`tini -g`** : le signal est envoyé à tout le groupe
de processus, au script **et** à l'outil en cours, au lieu du seul script.
Mesuré : arrêt en 0,17 s, code 143 (128 + 15). Sans `-g`, l'arrêt prend le
même temps, car le shell meurt et la fin du conteneur emporte l'outil. Mais
l'outil est alors tué d'office au lieu de recevoir SIGTERM. Un lint dure
quelques secondes : `stop_grace_period: 5s` suffit.
