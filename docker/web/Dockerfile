# Serveur web : passerelle nginx, seul point d'entrée de la plateforme.
# Elle sert le front v2 (fichiers statiques construits par Vite) et relaie
# /api/ vers l'API (ADR-002 : application monopage servie par nginx).
#
# Le contexte de build est la racine du dépôt (voir docker-compose.yml) ;
# Dockerfile.dockerignore n'en laisse passer que front/ et docker/web/.

# --- Étape 1 : build du front v2.
FROM luniqo/base:1.0 AS build

# nodejs : exécute Vite (Node 24 dans Alpine 3.24, Vite 8 demande >= 20.19).
# pnpm : gestionnaire de paquets du front (front/pnpm-lock.yaml). Le paquet
# d'Alpine est en 11.x comme celui du projet : même format de lockfile.
RUN apk add --no-cache nodejs pnpm
WORKDIR /src/front

# Les dépendances d'abord : cette couche reste en cache tant que les fichiers
# de pnpm ne changent pas. --frozen-lockfile : versions exactes du lockfile.
# Les scripts d'installation restent ceux autorisés dans pnpm-workspace.yaml.
# --pm-on-fail=warn : on garde le pnpm d'Alpine (paquet signé de la
# distribution) au lieu d'en télécharger un autre pour suivre la version
# exacte du champ packageManager ; même version majeure, même lockfile.
# PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD : aucun navigateur de test dans l'image.
COPY front/package.json front/pnpm-lock.yaml front/pnpm-workspace.yaml ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --frozen-lockfile --pm-on-fail=warn

COPY front/ ./
# vite build directement, plutôt que « pnpm build » : le typage est vérifié en
# CI, l'image n'a besoin que des fichiers produits.
RUN ./node_modules/.bin/vite build

# --- Étape 2 : image finale, nginx seul, sans Node ni sources.
FROM luniqo/base:1.0

# nginx : serveur web et reverse proxy.
# On supprime ce que le paquet installe par défaut et qu'on n'utilise pas :
# - /etc/nginx/nginx.conf : remplacé par notre modèle, rendu au démarrage ;
# - /etc/nginx/http.d : configuration par défaut incluse par l'ancien fichier ;
# - /var/lib/nginx/html : page d'accueil "Welcome to nginx" ;
# - /etc/logrotate.d/nginx : les logs partent sur stdout, Docker les gère.
RUN apk add --no-cache nginx \
 && rm -rf /etc/nginx/nginx.conf /etc/nginx/http.d /var/lib/nginx/html /etc/logrotate.d/nginx

COPY --chmod=0644 docker/web/nginx.conf.template /etc/nginx/nginx.conf.template
COPY --chmod=0644 docker/web/security-headers.conf /etc/nginx/security-headers.conf
COPY --chmod=0755 docker/web/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/web/www/ /srv/www/
COPY --from=build /src/front/dist/ /srv/front/

# Valeurs par défaut, modifiables au run (-e) ou dans le compose.
ENV NGINX_WORKER_PROCESSES=1 \
    NGINX_WORKER_CONNECTIONS=512 \
    API_ADDR=api:8000

# 8080 et non 80 : nginx tourne sous un utilisateur non-root.
EXPOSE 8080/tcp
USER app

# Pour nginx, SIGTERM = arrêt immédiat, SIGQUIT = arrêt propre (il termine
# les requêtes en cours). docker stop enverra donc SIGQUIT.
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
# -e stderr : nginx ouvre son log d'erreurs avant de lire la configuration ;
# sans cette option il essaierait d'écrire dans /var/log/nginx.
# daemon off : nginx reste au premier plan, sinon le conteneur s'arrêterait.
CMD ["nginx", "-c", "/tmp/nginx/nginx.conf", "-e", "stderr", "-g", "daemon off;"]
