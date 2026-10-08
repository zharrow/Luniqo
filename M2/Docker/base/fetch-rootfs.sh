#!/bin/sh
# Télécharge le système de fichiers minimal d'Alpine Linux (minirootfs) depuis
# le site officiel d'Alpine, pour les deux architectures supportées, et vérifie
# chaque archive avec son empreinte SHA-256.
#
# Ces archives servent de point de départ à l'image de base (FROM scratch) :
# aucune image n'est récupérée depuis Docker Hub.
#
# Usage : ./fetch-rootfs.sh [version]     (défaut : 3.24.2)
set -eu

VERSION="${1:-3.24.2}"
BRANCH="v$(echo "$VERSION" | cut -d. -f1,2)"
MIRROR="https://dl-cdn.alpinelinux.org/alpine"
DEST="$(cd "$(dirname "$0")" && pwd)/rootfs"

mkdir -p "$DEST"
cd "$DEST"

for ARCH in x86_64 aarch64; do
    FILE="alpine-minirootfs-${VERSION}-${ARCH}.tar.gz"
    URL="${MIRROR}/${BRANCH}/releases/${ARCH}/${FILE}"

    echo ">> ${FILE}"
    curl -fsSLO "$URL"
    curl -fsSLO "${URL}.sha256"

    # Le fichier .sha256 publié par Alpine contient "<empreinte>  <fichier>".
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum -c "${FILE}.sha256"
    else
        shasum -a 256 -c "${FILE}.sha256"
    fi
done
