# API : Luniqo v2 (FastAPI), servie par uvicorn.
#
# Le code de l'API vit à la racine du dépôt (dossier api/), à côté de la v1 :
# le compose le fournit comme contexte de build nommé « luniqo-api ».

# --- Étape 1 : installation des dépendances Python dans un environnement virtuel.
FROM luniqo/base:1.0 AS build

# python3 : interpréteur, avec venv et ensurepip pour créer l'environnement.
RUN apk add --no-cache python3
COPY --from=luniqo-api requirements.txt /tmp/requirements.txt
# Environnement isolé dans /opt/venv, versions exactes de requirements.txt.
# Toutes les dépendances existent en paquets précompilés pour musl (Alpine) :
# aucun compilateur n'est nécessaire. pip est retiré une fois l'installation
# faite : l'image finale n'en a pas besoin.
RUN python3 -m venv /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt \
 && /opt/venv/bin/pip uninstall -y -q pip

# --- Étape 2 : image finale, sans les outils d'installation.
FROM luniqo/base:1.0

RUN apk add --no-cache python3
COPY --from=build /opt/venv /opt/venv
# WORKDIR crée /app (droits 755) avant les copies : un COPY --chmod=0644 qui
# crée lui-même le dossier lui appliquerait 644, le rendant impossible à
# parcourir.
WORKDIR /app
# Code de l'API, migrations et configuration Alembic. Lisible par app, mais
# pas modifiable (fichiers à root).
COPY --from=luniqo-api --chmod=0644 alembic.ini /app/alembic.ini
COPY --from=luniqo-api app/ /app/app/
COPY --from=luniqo-api migrations/ /app/migrations/
COPY --chmod=0755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Valeurs par défaut, modifiables au run (-e) ou dans le compose.
# - PATH : les commandes du venv (uvicorn, alembic) passent en premier.
# - PYTHONDONTWRITEBYTECODE : pas de .pyc (système de fichiers en lecture seule).
# - PYTHONUNBUFFERED : logs envoyés immédiatement à `docker logs`.
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    API_WORKERS=1 \
    DB_POOL_SIZE=8 \
    DB_ADDR=db:5432 \
    DB_NAME=luniqo \
    DB_USER=luniqo \
    DB_PASSWORD_FILE=/run/secrets/db_password \
    SEED_DEMO=false

EXPOSE 8000/tcp
USER app

# uvicorn intercepte SIGTERM : il cesse d'accepter des connexions, termine les
# requêtes en cours (au plus --timeout-graceful-shutdown secondes) puis arrête
# ses workers.
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
# --proxy-headers : uvicorn lit les en-têtes X-Forwarded-* ajoutés par la
# passerelle (adresse réelle du client). Le nombre de workers vient de
# WEB_CONCURRENCY, exporté par l'entrypoint à partir de API_WORKERS.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--timeout-graceful-shutdown", "10", "--no-server-header"]
