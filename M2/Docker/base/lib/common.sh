# Fonctions partagées par les scripts d'entrée (entrypoint.sh) des images.
# À charger avec : . /usr/local/lib/tp/common.sh

# Écrit un message préfixé par le nom du service sur la sortie d'erreur,
# que Docker récupère dans `docker logs`.
log() {
    printf '[%s] %s\n' "${SERVICE_NAME:-entrypoint}" "$*" >&2
}

# require_int NOM MIN MAX
# Arrête le conteneur (code 64 = erreur d'usage) si la variable NOM n'est pas
# un entier compris entre MIN et MAX. Mieux vaut refuser de démarrer que de
# tourner avec une configuration absurde.
require_int() {
    eval "value=\${$1:-}"
    case "$value" in
        '' | *[!0-9]*)
            log "erreur : $1 doit être un entier (reçu : '$value')"
            exit 64
            ;;
    esac
    if [ "$value" -lt "$2" ] || [ "$value" -gt "$3" ]; then
        log "erreur : $1 doit être compris entre $2 et $3 (reçu : $value)"
        exit 64
    fi
}

# require_addr NOM
# Vérifie que la variable NOM est de la forme "hôte:port".
require_addr() {
    eval "value=\${$1:-}"
    case "$value" in
        ?*:[0-9]*) ;;
        *)
            log "erreur : $1 doit être de la forme hote:port (reçu : '$value')"
            exit 64
            ;;
    esac
}

# require_ident NOM
# Vérifie que la variable NOM est un identifiant SQL simple (minuscules,
# chiffres, _), utilisable sans échappement comme nom de base ou de rôle.
require_ident() {
    eval "value=\${$1:-}"
    case "$value" in
        '' | [!a-z_]* | *[!a-z0-9_]*)
            log "erreur : $1 doit être un identifiant en minuscules [a-z_][a-z0-9_]* (reçu : '$value')"
            exit 64
            ;;
    esac
}

# require_size NOM
# Vérifie que la variable NOM est une taille au format PostgreSQL : un
# entier suivi de kB, MB ou GB (ex. 64MB).
require_size() {
    eval "value=\${$1:-}"
    case "$value" in
        [0-9]*kB | [0-9]*MB | [0-9]*GB)
            case "${value%?B}" in
                *[!0-9]*)
                    log "erreur : $1 doit être de la forme 64MB (reçu : '$value')"
                    exit 64
                    ;;
            esac
            ;;
        *)
            log "erreur : $1 doit être de la forme 64MB (reçu : '$value')"
            exit 64
            ;;
    esac
}

# require_bool NOM
# Vérifie que la variable NOM vaut true ou false.
require_bool() {
    eval "value=\${$1:-}"
    case "$value" in
        true | false) ;;
        *)
            log "erreur : $1 doit valoir true ou false (reçu : '$value')"
            exit 64
            ;;
    esac
}

# require_secret NOM
# Vérifie que la variable NOM désigne un fichier secret lisible et non vide.
require_secret() {
    eval "value=\${$1:-}"
    if [ -z "$value" ] || [ ! -r "$value" ] || [ ! -s "$value" ]; then
        log "erreur : $1 doit désigner un fichier secret lisible et non vide (reçu : '$value')"
        exit 64
    fi
}
