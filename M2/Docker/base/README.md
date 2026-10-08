# Image `luniqo/base`

Image de base commune à toutes les images de Luniqo (db, api, web, puis front).
Reprise sans changement fonctionnel du premier TP, seuls le nom de l'image et les
fonctions de vérification partagées ont évolué.
C'est elle qui garantit qu'**aucune image ne vient de Docker Hub** : elle part
d'une image vide (`scratch`) et y dépose le système de fichiers d'Alpine Linux.

## Construction

### D'où vient le système d'exploitation ?

`fetch-rootfs.sh` télécharge l'archive *minirootfs* d'Alpine 3.24.2 directement
depuis `dl-cdn.alpinelinux.org` (le miroir officiel d'Alpine) pour les deux
architectures, puis vérifie chaque archive avec l'empreinte SHA-256 publiée par
Alpine. Les archives sont versionnées dans `rootfs/` pour que le projet se
construise sans étape préalable.

Dans le Dockerfile, `ADD` décompresse automatiquement une archive `.tar.gz`
locale. On obtient ainsi un Alpine complet sans aucun `FROM alpine`.

### Pourquoi deux étapes `rootfs-amd64` et `rootfs-arm64` ?

Une archive minirootfs contient des binaires compilés pour une seule
architecture. Le Dockerfile déclare donc une étape par architecture, et
`FROM rootfs-${TARGETARCH}` choisit la bonne. `TARGETARCH` est une variable
fournie automatiquement par BuildKit (`amd64` sur un PC classique, `arm64` sur
un Mac Apple Silicon). Le projet se construit ainsi nativement sur les deux.

### Pourquoi pas de ligne `# syntax=docker/dockerfile:1` ?

Cette directive demande à Docker de télécharger le frontend
`docker/dockerfile` **depuis Docker Hub** avant la construction. On s'en passe
et on utilise le frontend intégré à Docker.

### Dépendances installées

| Paquet | Pourquoi |
|---|---|
| `tini` | Petit programme « init » qui tourne en PID 1. Le noyau Linux ne déclenche aucune action par défaut pour les signaux reçus par le PID 1 : un programme qui n'installe pas lui-même de gestionnaire de `SIGTERM` l'ignorerait et serait tué brutalement (`SIGKILL`) au bout de 10 s par `docker stop`. tini, lui, relaie les signaux au processus principal et récupère les processus zombies. |

Aucun autre paquet : le minirootfs contient déjà BusyBox, qui fournit `sh`,
`wget`, `nc` et `awk` utilisés par les scripts et les healthchecks.

### Manipulations sur l'OS

| Commande | Pourquoi |
|---|---|
| `apk upgrade --no-cache` | Applique les correctifs de sécurité publiés depuis la sortie de l'archive minirootfs. |
| `apk add --no-cache ...` | `--no-cache` évite de stocker l'index des paquets dans l'image (image plus petite). |
| `addgroup -S -g 10001 app` | Crée un groupe système `app`. |
| `adduser -S -D -H -u 10001 -G app -h /nonexistent -s /sbin/nologin app` | Crée l'utilisateur `app` : système (`-S`), sans mot de passe (`-D`), sans dossier personnel (`-H`, `-h /nonexistent`) et sans shell de connexion (`-s /sbin/nologin`). Tous les services tournent sous cet utilisateur, jamais en root. L'UID fixe 10001 évite toute collision avec les utilisateurs créés par les paquets Alpine (UID < 1000). |
| `mkdir -p /usr/local/lib/tp` | Crée le dossier des outils partagés avec des droits normaux (755). Sans ça, `COPY --chmod=0644` crée lui-même le dossier et lui applique aussi 644 : sans le bit `x`, plus personne ne peut entrer dedans. |
| `ENV LANG=C.UTF-8` | Encodage UTF-8 par défaut pour les messages en français. |

### Outils ajoutés

| Fichier | Rôle |
|---|---|
| `/usr/local/bin/tp-resources` | Lit les fichiers cgroup v2 (`/sys/fs/cgroup/cpu.max`, `memory.max`, `pids.max`) et affiche en JSON les ressources réellement allouées au conteneur. Chaque service l'appelle au démarrage : on voit dans les logs (et sur la page web) que les limites passées au `docker run` / compose sont bien appliquées. |
| `/usr/local/lib/tp/common.sh` | Fonctions shell partagées par les `entrypoint.sh` : `log` ; `require_int` (entier dans un intervalle) ; `require_addr` (forme `hôte:port`) ; `require_ident` (identifiant SQL `[a-z_][a-z0-9_]*`, pour les noms de base et de rôle) ; `require_size` (taille PostgreSQL comme `64MB`) ; `require_bool` (`true`/`false`) ; `require_secret` (fichier secret lisible et non vide). Un conteneur mal configuré refuse de démarrer avec un message clair (code de sortie 64). |

`COPY --chmod` fixe les permissions au moment de la copie : les scripts restent
exécutables même si le dépôt est cloné sous Windows (qui perd le bit `+x`).

## Arguments

| Argument de build | Défaut | Rôle |
|---|---|---|
| `ALPINE_VERSION` | `3.24.2` | Version du minirootfs à utiliser (l'archive doit être présente dans `rootfs/`). |

L'image n'est pas destinée à tourner seule, elle ne prend donc pas d'argument
au `run`.

## Entrypoint

```dockerfile
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/bin/sh"]
```

tini est le PID 1 et lance la commande passée en `CMD` (ici un shell, pour
pouvoir explorer l'image). Les images filles redéfinissent l'entrypoint en
gardant tini en tête : `["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]`.

On utilise la forme *exec* (tableau JSON) et non la forme *shell*
(`ENTRYPOINT /sbin/tini`) : la forme shell lancerait `/bin/sh -c ...` en PID 1,
et `sh` ne relaie pas les signaux à ses enfants.

## Commandes utiles

```sh
./fetch-rootfs.sh                                   # (re)télécharger le rootfs
docker build -t luniqo/base:1.0 .                # construire l'image
docker build --platform linux/amd64 -t luniqo/base:1.0 .   # forcer l'architecture
docker run --rm --cpus 0.5 --memory 64m luniqo/base:1.0 tp-resources
# {"cpus": 0.50, "memory_mb": 64, "pids": null}
```
