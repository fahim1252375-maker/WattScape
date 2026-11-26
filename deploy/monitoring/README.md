# WattScape monitoring templates

These are provider-neutral configuration examples. They are not connected to a live Prometheus or Grafana service.

1. Restrict the API metrics route to a private network and valid HTTPS certificate.
2. The current `/actuator/prometheus` policy requires an ADMIN realm role. The example reads a rotating bearer token from a file mounted into Prometheus. Keep that token out of this repository, rotate it through a secret manager, and isolate the scraper because ADMIN also grants API privileges.
3. Replace the target, environment label, CA path, and token-file path before loading the scrape config. Never expose the endpoint publicly.
4. Review thresholds in `wattscape-alerts.yml.example` against measured traffic before paging anyone. Readiness is best monitored with a private platform probe or blackbox exporter.
5. Import `wattscape-dashboard.json.example` and bind its Prometheus datasource variable.

Current application instrumentation supports HTTP request counters/histograms, JVM meters, Hikari meters, and scrape target health. Per-device telemetry lag, work-order outcomes, SMTP delivery counters, AI usage/cost, and a GC pause alert are not instrumented in the current source. Those require application or platform instrumentation before reliable alerts can be built. Avoid high-cardinality identity and tenant labels.
