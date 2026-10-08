# Front : Luniqo v1 (Next.js + React), servi par le serveur autonome de Next.js.
#
# Le contexte de build est la racine du dépôt (voir docker-compose.yml) ;
# Dockerfile.dockerignore n'en laisse passer que le code du front.

# --- Étape 1 : installation des dépendances et build de production.
FROM luniqo/base:1.0 AS build

# nodejs : exécute Next.js (Node 24 dans Alpine 3.24, Next 16 demande >= 20.9).
# pnpm : gestionnaire de paquets du projet (pnpm-lock.yaml).
RUN apk add --no-cache nodejs pnpm
WORKDIR /src

# Les dépendances d'abord : cette couche reste en cache tant que
# package.json et pnpm-lock.yaml ne changent pas, même si le code change.
# --frozen-lockfile : versions exactes du lockfile, échec s'il n'est pas à jour.
# Les scripts d'installation des dépendances restent bloqués (protection de
# pnpm contre les paquets malveillants) ; strict-dep-builds=false évite d'en
# faire une erreur. Aucun n'est nécessaire : sharp utilise des binaires
# précompilés pour musl, core-js, protobufjs et unrs-resolver n'y font
# qu'afficher un message ou préparer une solution de repli.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --config.strict-dep-builds=false

COPY . .

# Next.js inscrit les variables NEXT_PUBLIC_* dans le code envoyé au
# navigateur au moment du build : ce sont des arguments de build, pas de run.
# Les valeurs par défaut ne pointent vers aucun Supabase réel : l'application
# démarre et affiche ses pages, mais la connexion échoue.
ARG NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=cle-publique-non-configuree
ARG NEXT_PUBLIC_APP_URL=http://localhost:8080
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1
# next build directement, plutôt que « pnpm build » : pnpm revérifierait
# l'installation avant de lancer le script, sans l'option ci-dessus.
RUN ./node_modules/.bin/next build

# --- Étape 2 : image finale, sans pnpm, sans node_modules complet, sans sources.
FROM luniqo/base:1.0

# nodejs seul : le serveur autonome contient déjà les dépendances utilisées.
RUN apk add --no-cache nodejs
WORKDIR /app

# .next/standalone : server.js + le strict nécessaire de node_modules.
# Les fichiers statiques et public/ ne sont pas inclus par Next.js : on les
# ajoute à côté, là où server.js les cherche.
COPY --from=build /src/.next/standalone ./
COPY --from=build /src/.next/static ./.next/static
COPY --from=build /src/public ./public
# Next.js écrit son cache (images optimisées, données) dans .next/cache. Le
# système de fichiers étant en lecture seule, ce dossier pointe vers /tmp.
RUN ln -s /tmp/next-cache /app/.next/cache
COPY --chmod=0755 M2/Docker/front/entrypoint.sh /usr/local/bin/entrypoint.sh

# Valeurs par défaut, modifiables au run (-e) ou dans le compose.
# NODE_HEAP_MB : taille maximum du tas JavaScript (voir entrypoint.sh).
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    NODE_HEAP_MB=192

EXPOSE 3000/tcp
USER app

# Next.js intercepte SIGTERM et arrête son serveur (comportement mesuré dans
# le README de l'image).
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=5s --timeout=3s --start-period=15s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
