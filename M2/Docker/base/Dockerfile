# Image de base commune à toutes les images du projet.
#
# Elle part de "scratch" (une image vide) et y décompresse le système de
# fichiers minimal d'Alpine Linux, téléchargé depuis alpinelinux.org par
# fetch-rootfs.sh. Aucune image n'est donc récupérée depuis Docker Hub.
#
# Pas de directive "# syntax=" en tête de fichier : elle téléchargerait le
# frontend docker/dockerfile depuis Docker Hub. On utilise celui intégré à Docker.

ARG ALPINE_VERSION=3.24.2

# Une étape par architecture : BuildKit ne construit que celle qui correspond
# à la plateforme cible (TARGETARCH vaut "amd64" sur un PC, "arm64" sur un Mac
# Apple Silicon). L'image se construit donc nativement sur les deux.
FROM scratch AS rootfs-amd64
ARG ALPINE_VERSION
ADD rootfs/alpine-minirootfs-${ALPINE_VERSION}-x86_64.tar.gz /

FROM scratch AS rootfs-arm64
ARG ALPINE_VERSION
ADD rootfs/alpine-minirootfs-${ALPINE_VERSION}-aarch64.tar.gz /

FROM rootfs-${TARGETARCH}

ARG ALPINE_VERSION
LABEL org.opencontainers.image.title="luniqo/base" \
      org.opencontainers.image.description="Alpine ${ALPINE_VERSION} construite depuis scratch, avec tini et un utilisateur non-root" \
      org.opencontainers.image.base.name="scratch"

ENV LANG=C.UTF-8

# - apk upgrade : applique les correctifs publiés depuis la sortie du rootfs.
# - tini : mini "init" qui tourne en PID 1, transmet les signaux (SIGTERM...)
#   au processus principal et récupère les processus zombies.
# - utilisateur "app" (uid/gid 10001) sans mot de passe, sans shell de connexion
#   ni dossier personnel : les services ne tournent jamais en root.
# - /usr/local/lib/tp : créé ici (droits 755) car un COPY --chmod=0644 qui crée
#   lui-même le dossier lui applique aussi 644, ce qui le rend impossible à
#   parcourir.
# --no-cache : apk ne garde pas l'index des paquets dans l'image.
RUN apk upgrade --no-cache \
 && apk add --no-cache tini \
 && addgroup -S -g 10001 app \
 && adduser -S -D -H -u 10001 -G app -h /nonexistent -s /sbin/nologin app \
 && mkdir -p /usr/local/lib/tp
# Outils communs utilisés par les scripts d'entrée des autres images.
COPY --chmod=0755 bin/tp-resources /usr/local/bin/tp-resources
COPY --chmod=0644 lib/common.sh /usr/local/lib/tp/common.sh

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/bin/sh"]
