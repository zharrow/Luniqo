# Lint : conteneur de CI lancé une fois. Il vérifie le code Python de l'API
# (ruff), les scripts shell des images (ShellCheck) et l'origine de chaque
# image (aucun FROM hors de scratch et luniqo/*), puis sort avec 0 si tout est
# conforme, 1 sinon. Le code est monté en lecture seule au run.

# --- Étape 1 : récupération du binaire ruff.
FROM luniqo/base:1.0 AS build

# python3 : seulement pour pip, qui télécharge ruff depuis PyPI.
RUN apk add --no-cache python3
COPY --from=luniqo-api requirements-dev.txt /tmp/requirements-dev.txt
# Version de ruff lue dans requirements-dev.txt : la même que celle de la CI
# GitHub et des postes de développement, une seule source de vérité.
# --only-binary : paquet précompilé pour musl (Alpine), jamais de compilation.
# ruff est un programme Rust autonome : le paquet Python n'en est que l'emballage.
RUN ruff_version=$(sed -n 's/^ruff==//p' /tmp/requirements-dev.txt) \
 && test -n "$ruff_version" \
 && python3 -m venv /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir --only-binary=:all: "ruff==$ruff_version"

# --- Étape 2 : image finale, sans Python.
FROM luniqo/base:1.0

# shellcheck : analyse statique des scripts sh (paquet signé d'Alpine).
# /reports : dossier des rapports, à app, recopié dans le volume nommé à sa
# création (le volume hérite ainsi du propriétaire).
RUN apk add --no-cache shellcheck \
 && install -d -o app -g app -m 0755 /reports
# Seul le binaire ruff est recopié : ni Python ni pip dans l'image livrée.
COPY --from=build /opt/venv/bin/ruff /usr/local/bin/ruff
COPY --chmod=0755 lint.sh /usr/local/bin/lint.sh

# Valeurs par défaut, modifiables au run (-e) ou dans le compose.
# - LINT_RUFF_FORMAT : format des erreurs de ruff (github : annotations dans les PR).
ENV LINT_RUFF_FORMAT=concise

WORKDIR /workspace
USER app

# Le script enchaîne plusieurs outils : -g fait suivre le signal d'arrêt à tout
# le groupe de processus (le shell et l'outil en cours), pas seulement au shell.
STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "-g", "--", "/usr/local/bin/lint.sh"]
