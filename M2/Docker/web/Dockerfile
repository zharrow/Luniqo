# Serveur web : passerelle nginx, seul point d'entrée de la plateforme.
# Elle relaie / vers le front Next.js et /api/ vers l'API.
FROM luniqo/base:1.0

# nginx : serveur web et reverse proxy.
# On supprime ce que le paquet installe par défaut et qu'on n'utilise pas :
# - /etc/nginx/nginx.conf : remplacé par notre modèle, rendu au démarrage ;
# - /etc/nginx/http.d : configuration par défaut incluse par l'ancien fichier ;
# - /var/lib/nginx/html : page d'accueil "Welcome to nginx" ;
# - /etc/logrotate.d/nginx : les logs partent sur stdout, Docker les gère.
RUN apk add --no-cache nginx \
 && rm -rf /etc/nginx/nginx.conf /etc/nginx/http.d /var/lib/nginx/html /etc/logrotate.d/nginx

COPY --chmod=0644 nginx.conf.template /etc/nginx/nginx.conf.template
COPY --chmod=0755 entrypoint.sh /usr/local/bin/entrypoint.sh
COPY www/ /srv/www/

# Valeurs par défaut, modifiables au run (-e) ou dans le compose.
ENV NGINX_WORKER_PROCESSES=1 \
    NGINX_WORKER_CONNECTIONS=512 \
    FRONT_ADDR=front:3000 \
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
