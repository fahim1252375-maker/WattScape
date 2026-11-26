# Production Keycloak image for WattScape identity (Keycloak 26.x).
# Build-time options are fixed here; secrets and hostnames are supplied at runtime from the
# host's secret store (see docker-compose.production.example.yml). This image does NOT import
# the local development realm (backend/keycloak/wattscape-local-realm.json).
#
# Never run `start-dev` in production: it uses insecure defaults and an embedded dev database.
FROM quay.io/keycloak/keycloak:26.8.2 AS builder
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
WORKDIR /opt/keycloak
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.8.2
COPY --from=builder /opt/keycloak/ /opt/keycloak/
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized"]
