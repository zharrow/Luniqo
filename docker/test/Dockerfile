# Tests : conteneur de CI lancé une fois. Il exécute les tests de l'API
# (pytest), unitaires et d'intégration, ces derniers sur une vraie PostgreSQL
# (service test-db, image luniqo/db). Sortie 0 si tous les tests passent.
# Le code est monté en lecture seule au run : la même image teste n'importe
# quelle version du code.

# --- Étape 1 : installation des dépendances Python dans un environnement virtuel.
FROM luniqo/base:1.0 AS build

RUN apk add --no-cache python3
COPY --from=luniqo-api requirements.txt requirements-dev.txt /tmp/
# Dépendances de l'API et outils de test (pytest, httpx2), versions exactes de
# requirements-dev.txt, celles de la CI GitHub. --only-binary : uniquement des
# paquets précompilés (musllinux), aucun compilateur. pip est retiré ensuite.
WORKDIR /tmp
RUN python3 -m venv /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir --only-binary=:all: -r requirements-dev.txt \
 && /opt/venv/bin/pip uninstall -y -q pip

# --- Étape 2 : image finale, sans les outils d'installation.
FROM luniqo/base:1.0

# /reports : rapport JUnit, à app (voir lint/Dockerfile pour le volume).
RUN apk add --no-cache python3 \
 && install -d -o app -g app -m 0755 /reports
COPY --from=build /opt/venv /opt/venv
COPY --chmod=0755 entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chmod=0644 run_pytest.py /usr/local/lib/tp/run_pytest.py

# Valeurs par défaut, modifiables au run (-e) ou dans le compose.
# - PYTHONDONTWRITEBYTECODE : pas de .pyc dans le code monté en lecture seule.
# - CI=true : les tests d'intégration ne peuvent pas être ignorés en silence
#   (api/tests/integration/conftest.py échoue si la base manque).
# - TEST_DB_* : base de test ; son nom doit finir par _test (elle est vidée).
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CI=true \
    TEST_DB_ADDR=test-db:5432 \
    TEST_DB_NAME=luniqo_test \
    TEST_DB_USER=luniqo \
    TEST_DB_PASSWORD_FILE=/run/secrets/db_password \
    TEST_STOP_TIMEOUT=5

WORKDIR /workspace/api
USER app

# SIGINT plutôt que SIGTERM : pytest traite SIGINT comme un Ctrl-C (il
# interrompt le test en cours, exécute les nettoyages des fixtures et écrit
# quand même son rapport). SIGTERM le tuerait net, sans rapport.
STOPSIGNAL SIGINT
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
# run_pytest.py : pytest, puis sortie immédiate une fois les rapports écrits
# (voir le fichier : threads d'anyio qui bloquaient l'arrêt).
# -p no:cacheprovider : pas de dossier .pytest_cache dans le code en lecture seule.
CMD ["python", "/usr/local/lib/tp/run_pytest.py", "-ra", "-p", "no:cacheprovider", \
     "--junitxml=/reports/pytest.xml"]
