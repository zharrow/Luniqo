#!/bin/sh
# Régénère le contrat de l'API (src/api/openapi.json) depuis le code de l'API,
# puis ses types TypeScript (src/api/schema.d.ts). La CI lance ce script et
# échoue si le résultat diffère des fichiers versionnés : le front ne peut pas
# dériver de l'API sans que cela se voie (ADR-002 § 4).
#
# Prérequis : l'environnement Python de l'API (api/README.md), activé ou
# désigné par PYTHON.
set -eu
front=$(cd "$(dirname "$0")/.." && pwd)
cd "$front/../api"
"${PYTHON:-python}" - > "$front/src/api/openapi.json" <<'PY'
import json
import sys

from app.main import app

json.dump(app.openapi(), sys.stdout, ensure_ascii=False, indent=2)
print()
PY
cd "$front"
./node_modules/.bin/openapi-typescript src/api/openapi.json -o src/api/schema.d.ts
