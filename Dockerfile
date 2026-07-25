# =========================
# Distribution artifact
# =========================
FROM scratch AS dist-artifact

COPY yak-ops-dist/target/yak-ops-*.tar.gz \
     /yak-ops.tar.gz


# =========================
# Backend runtime
# =========================
FROM eclipse-temurin:21-jre-jammy AS backend-runtime

ARG VERSION=dev
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="Yak Ops API" \
      org.opencontainers.image.description="Yak Ops backend service" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

ENV YAK_OPS_HOME=/opt/yak-ops \
    JAVA_OPTS="" \
    APP_OPTS="" \
    SERVER_PORT=9527 \
    SPRING_PROFILES_ACTIVE=mysql \
    YAK_OPS_DATABASE_TYPE=mysql \
    YAK_OPS_DATABASE_HOST=mysql \
    YAK_OPS_DATABASE_PORT=3306 \
    YAK_OPS_DATABASE_NAME=yak_ops \
    SPRING_DATASOURCE_URL="jdbc:mysql://mysql:3306/yak_ops?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=GMT%2B8&allowPublicKeyRetrieval=true" \
    SPRING_DATASOURCE_USERNAME=linkup \
    SPRING_DATASOURCE_PASSWORD=linkup

WORKDIR ${YAK_OPS_HOME}

COPY --from=dist-artifact \
     /yak-ops.tar.gz \
     /tmp/yak-ops.tar.gz

RUN set -eux; \
    mkdir -p "${YAK_OPS_HOME}"; \
    tar -xzf /tmp/yak-ops.tar.gz \
        --strip-components=1 \
        -C "${YAK_OPS_HOME}"; \
    rm -f /tmp/yak-ops.tar.gz; \
    chmod +x "${YAK_OPS_HOME}"/bin/*.sh; \
    mkdir -p \
        "${YAK_OPS_HOME}/logs" \
        "${YAK_OPS_HOME}/jdbc-drivers"; \
    test -f "${YAK_OPS_HOME}/libs/yak-ops-api.jar"

EXPOSE 9527

VOLUME ["/opt/yak-ops/logs","/opt/yak-ops/jdbc-drivers"]

ENTRYPOINT ["/opt/yak-ops/bin/run-yak-ops.sh"]


# =========================
# Frontend runtime
# =========================
FROM nginx:latest AS frontend-runtime

ARG VERSION=dev
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="Yak Ops" \
      org.opencontainers.image.description="Yak Ops frontend and reverse proxy" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

COPY --from=dist-artifact \
     /yak-ops.tar.gz \
     /tmp/yak-ops.tar.gz

RUN set -eux; \
    mkdir -p /tmp/yak-ops; \
    tar -xzf /tmp/yak-ops.tar.gz \
        --strip-components=1 \
        -C /tmp/yak-ops; \
    test -f /tmp/yak-ops/web/index.html; \
    test -f /tmp/yak-ops/conf/nginx/default.conf; \
    rm -rf /usr/share/nginx/html/*; \
    cp -r /tmp/yak-ops/web/. /usr/share/nginx/html/; \
    cp /tmp/yak-ops/conf/nginx/default.conf \
       /etc/nginx/conf.d/default.conf; \
    rm -rf \
        /tmp/yak-ops \
        /tmp/yak-ops.tar.gz

EXPOSE 80

HEALTHCHECK \
    --interval=10s \
    --timeout=3s \
    --start-period=10s \
    --retries=6 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]