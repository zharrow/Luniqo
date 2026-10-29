# Générateur de charge pour le banc de mesure (bench.sh) : wrk, lancé une
# fois contre la passerelle de la pile, depuis le réseau Docker de la pile.
# Il affiche à la fin le débit, les latences et le CPU qu'il a lui-même
# consommé (à retrancher de la consommation totale mesurée).
FROM luniqo/base:1.0

# wrk : générateur de charge HTTP en C (boucle d'événements epoll, un thread
# par -t). Paquet signé d'Alpine (community).
RUN apk add --no-cache wrk
COPY --chmod=0755 charge.sh /usr/local/bin/charge.sh

# Valeurs par défaut, modifiables au run (-e) ou dans le compose.
ENV BENCH_URL=http://web:8080/api/health \
    BENCH_DURATION=30 \
    BENCH_CONNECTIONS=32 \
    BENCH_THREADS=2

USER app

# wrk intercepte SIGINT : il arrête la charge et affiche quand même ses
# statistiques. SIGTERM le tuerait sans résultat. -g : le signal va à tout le
# groupe de processus, donc à wrk et pas seulement au script.
STOPSIGNAL SIGINT
ENTRYPOINT ["/sbin/tini", "-g", "--", "/usr/local/bin/charge.sh"]
