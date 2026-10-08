# Base de données : PostgreSQL 18, installé depuis les dépôts Alpine.
FROM luniqo/base:1.0

# postgresql18 : serveur (postgres, initdb, pg_ctl) ; il tire postgresql18-client
# (psql, pg_isready) et postgresql-common (liens vers la version par défaut).
# Le paquet crée /var/lib/postgresql pour son propre utilisateur « postgres »,
# en droits 750 : l'utilisateur app ne pourrait pas le traverser. On le donne
# à app, qui fait tourner le serveur.
# Le dossier de données appartient à app, droits 700 : PostgreSQL refuse de
# démarrer si d'autres utilisateurs peuvent le lire. Quand Docker crée le
# volume, il recopie ce dossier avec son propriétaire et ses droits.
RUN apk add --no-cache postgresql18 \
 && mkdir -p /var/lib/postgresql/data \
 && chown app:app /var/lib/postgresql /var/lib/postgresql/data \
 && chmod 700 /var/lib/postgresql/data

COPY --chmod=0755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Valeurs par défaut, modifiables au run (-e) ou dans le compose.
# PGDATA est lu par initdb, pg_ctl et postgres.
ENV PGDATA=/var/lib/postgresql/data \
    DB_NAME=luniqo \
    DB_USER=luniqo \
    DB_PASSWORD_FILE=/run/secrets/db_password \
    DB_MAX_CONNECTIONS=20 \
    DB_SHARED_BUFFERS=64MB

EXPOSE 5432/tcp
VOLUME ["/var/lib/postgresql/data"]
USER app

# SIGINT = « fast shutdown » : PostgreSQL annule les transactions en cours,
# écrit un point de reprise et s'arrête proprement. SIGTERM (« smart
# shutdown ») attendrait que tous les clients se déconnectent, ce qui peut
# dépasser le délai avant le SIGKILL de Docker.
STOPSIGNAL SIGINT

# pg_isready interroge le serveur en TCP : pendant l'initialisation, le serveur
# temporaire n'écoute que sur un socket local, le conteneur n'est donc déclaré
# sain qu'une fois le vrai serveur démarré.
HEALTHCHECK --interval=5s --timeout=3s --start-period=20s --retries=5 \
    CMD pg_isready -q -h 127.0.0.1 -p 5432 -U "$DB_USER" -d "$DB_NAME" || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
# listen_addresses=* : écoute sur toutes les interfaces du conteneur, qui
# n'est relié qu'au réseau interne. Les sockets locaux vont dans /tmp (tmpfs),
# le système de fichiers de l'image pouvant être en lecture seule.
# L'entrypoint ajoute max_connections et shared_buffers.
CMD ["postgres", "-c", "listen_addresses=*", "-c", "unix_socket_directories=/tmp"]
