package com.wattscape.telemetry;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
@Import(TelemetrySecurityIntegrationTest.TestJwtConfiguration.class)
class TelemetrySecurityIntegrationTest {
    private static final String ISSUER = "https://telemetry-issuer.example.test";
    private static final String DEVICE_SECRET = "synthetic-device-secret-never-log";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> ISSUER);
        registry.add("spring.security.oauth2.resourceserver.jwt.audiences", () -> "wattscape-api");
    }

    @TestConfiguration
    static class TestJwtConfiguration {
        @Bean @Primary JwtDecoder jwtDecoder() {
            return token -> { throw new BadJwtException("Invalid test bearer token"); };
        }
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    private UUID organizationA, organizationB, siteA, siteB, deviceA, deviceB;
    private OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC); }

    @BeforeEach
    void seedSyntheticTenantsAndDevices() throws Exception {
        organizationA = UUID.randomUUID(); organizationB = UUID.randomUUID();
        siteA = UUID.randomUUID(); siteB = UUID.randomUUID();
        deviceA = UUID.randomUUID(); deviceB = UUID.randomUUID();
        insertOrganization(organizationA, "Telemetry Tenant A");
        insertOrganization(organizationB, "Telemetry Tenant B");
        insertUser(organizationA, "telemetry-admin-a", "Organization Owner");
        insertUser(organizationA, "telemetry-member-a", "Auditor/Read Only");
        insertUser(organizationB, "telemetry-admin-b", "Organization Owner");
        insertSite(siteA, organizationA, "TEL-A");
        insertSite(siteB, organizationB, "TEL-B");
        insertDevice(deviceA, organizationA, siteA, "device-a", sha256(DEVICE_SECRET));
        insertDevice(deviceB, organizationB, siteB, "device-b", sha256("synthetic-device-secret-b"));
    }

    @Test
    void validDeviceCredentialIngestsMeasurement() throws Exception {
        mvc.perform(ingest(deviceA, "Device " + DEVICE_SECRET, measurement("evt-valid", "energy_kwh", "1.25", "kWh", Instant.now())))
            .andExpect(status().isOk()).andExpect(jsonPath("$.accepted").value(1)).andExpect(jsonPath("$.duplicates").value(0));
        assertEquals(1, pointCount(deviceA));
    }

    @Test
    void missingMalformedUnknownAndIncorrectCredentialsAreUnauthorized() throws Exception {
        mvc.perform(ingest(deviceA, null, measurement("evt-missing", "energy_kwh", "1", "kWh", Instant.now())))
            .andExpect(status().isUnauthorized());
        mvc.perform(ingest(deviceA, "Bearer " + DEVICE_SECRET, measurement("evt-malformed", "energy_kwh", "1", "kWh", Instant.now())))
            .andExpect(status().isUnauthorized());
        mvc.perform(ingest(UUID.randomUUID(), "Device " + DEVICE_SECRET, measurement("evt-unknown", "energy_kwh", "1", "kWh", Instant.now())))
            .andExpect(status().isUnauthorized());
        mvc.perform(ingest(deviceA, "Device incorrect-secret", measurement("evt-wrong", "energy_kwh", "1", "kWh", Instant.now())))
            .andExpect(status().isUnauthorized());
        assertEquals(0, pointCount(deviceA));
    }

    @Test
    void revokedDeviceCannotIngest() throws Exception {
        jdbc.update("UPDATE telemetry_devices SET status='revoked' WHERE id=?", deviceA);
        mvc.perform(ingest(deviceA, "Device " + DEVICE_SECRET, measurement("evt-revoked", "energy_kwh", "1", "kWh", Instant.now())))
            .andExpect(status().isUnauthorized());
        assertEquals(0, pointCount(deviceA));
    }

    @Test
    void sequentialDuplicateEventIsReportedAsDuplicate() throws Exception {
        String body = measurement("evt-sequential", "energy_kwh", "1", "kWh", Instant.now());
        mvc.perform(ingest(deviceA, "Device " + DEVICE_SECRET, body)).andExpect(status().isOk())
            .andExpect(jsonPath("$.accepted").value(1)).andExpect(jsonPath("$.duplicates").value(0));
        mvc.perform(ingest(deviceA, "Device " + DEVICE_SECRET, body)).andExpect(status().isOk())
            .andExpect(jsonPath("$.accepted").value(0)).andExpect(jsonPath("$.duplicates").value(1));
        assertEquals(1, pointCount(deviceA));
    }

    @Test
    void duplicateEventIdsWithinBatchCountOnlyOneAccepted() throws Exception {
        Instant observed = Instant.now();
        String body = "{\"measurements\":[" + measurementObject("evt-batch", "1", observed) + "," + measurementObject("evt-batch", "2", observed) + "]}";
        mvc.perform(ingest(deviceA, "Device " + DEVICE_SECRET, body)).andExpect(status().isOk())
            .andExpect(jsonPath("$.accepted").value(1)).andExpect(jsonPath("$.duplicates").value(1));
        assertEquals(1, pointCount(deviceA));
    }

    @Test
    void telemetryQueriesAreScopedToAuthenticatedTenantAndSite() throws Exception {
        insertPoint(deviceA, organizationA, siteA, "evt-a-query");
        insertPoint(deviceB, organizationB, siteB, "evt-b-query");
        mvc.perform(get("/api/v1/sites/{site}/telemetry/latest", siteA).with(admin(organizationA, "telemetry-admin-a")))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].deviceId").value(deviceA.toString()));
        mvc.perform(get("/api/v1/sites/{site}/telemetry/latest", siteB).with(admin(organizationA, "telemetry-admin-a")))
            .andExpect(status().isNotFound());
        Instant from = Instant.now().minusSeconds(60), to = Instant.now().plusSeconds(60);
        mvc.perform(get("/api/v1/sites/{site}/telemetry", siteA).param("metricKey", "energy_kwh")
                .param("from", from.toString()).param("to", to.toString()).with(admin(organizationA, "telemetry-admin-a")))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].deviceId").value(deviceA.toString()));
    }


    @Test
    void invalidMeasurementsAreRejectedBeforeAnyPointIsPersisted() throws Exception {
        Instant current = Instant.now();
        assertBadRequest(measurement("evt-invalid-metric", "unsupported_metric", "1", "unit", current));
        assertBadRequest(measurement("evt-invalid-unit", "energy_kwh", "1", "Wh", current));
        assertBadRequest(measurement("evt-negative-energy", "energy_kwh", "-1", "kWh", current));
        assertBadRequest(measurement("evt-invalid-humidity", "humidity_pct", "101", "%", current));
        assertBadRequest(measurement("evt-fractional-occupancy", "occupancy_count", "1.5", "people", current));
        assertBadRequest(measurement("evt-old-timestamp", "energy_kwh", "1", "kWh", current.minusSeconds(366L * 24 * 60 * 60)));
        assertBadRequest(measurement("evt-value-over-limit", "energy_kwh", "1000000000001", "kWh", current));
        assertEquals(0, pointCount(deviceA), "rejected measurements must not be persisted");
    }

    @Test
    void readOnlyMemberCannotRegisterOrRevokeTelemetryDevices() throws Exception {
        var readOnlyMember = member(organizationA, "telemetry-member-a");
        String createBody = "{\"externalId\":\"member-created-device\",\"displayName\":\"Member Device\",\"protocol\":\"HTTPS\"}";

        mvc.perform(post("/api/v1/sites/{siteId}/telemetry/devices", siteA)
                .with(readOnlyMember).contentType("application/json").content(createBody))
            .andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/sites/{siteId}/telemetry/devices/{deviceId}/revoke", siteA, deviceA)
                .with(readOnlyMember))
            .andExpect(status().isForbidden());

        assertEquals("active", jdbc.queryForObject("SELECT status FROM telemetry_devices WHERE id=?", String.class, deviceA));
    }

    @Test
    void databaseRejectsCrossOrganizationTelemetryOwnership() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
            "INSERT INTO telemetry_devices(id,organization_id,site_id,asset_id,external_id,display_name,protocol,status,secret_hash,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            UUID.randomUUID(), organizationA, siteB, null, "cross-org-device", "Cross Org Device", "HTTPS", "active", "0".repeat(64), "synthetic-test", now(), now()));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
            "INSERT INTO telemetry_points(id,organization_id,site_id,device_id,asset_id,metric_key,value,unit,quality,source_event_id,observed_at,received_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            UUID.randomUUID(), organizationA, siteB, deviceA, null, "energy_kwh", 1, "kWh", "good", "evt-cross-org-site", now(), now(), now(), now()));

        assertEquals(0, pointCount(deviceA));
    }

    @Test
    void concurrentDuplicateRequestsPersistOneRowAndReportActualResponses() throws Exception {
        String body = measurement("evt-concurrent", "energy_kwh", "1", "kWh", Instant.now());
        CyclicBarrier start = new CyclicBarrier(2);
        var first = CompletableFuture.supplyAsync(() -> performConcurrent(start, body));
        var second = CompletableFuture.supplyAsync(() -> performConcurrent(start, body));
        int status1 = first.get(30, TimeUnit.SECONDS);
        int status2 = second.get(30, TimeUnit.SECONDS);
        System.out.println("TELEMETRY_CONCURRENT_DUPLICATE outcomes=" + status1 + "," + status2 + " persistedRows=" + pointCount(deviceA));
        assertTrue(List.of(200, 409).contains(status1));
        assertTrue(List.of(200, 409).contains(status2));
        assertTrue(status1 == 200 || status2 == 200, "one request must be accepted");
        assertEquals(1, pointCount(deviceA), "unique event constraint must prevent duplicate persistence");
    }

    private int performConcurrent(CyclicBarrier barrier, String body) {
        try {
            barrier.await(10, TimeUnit.SECONDS);
            return mvc.perform(ingest(deviceA, "Device " + DEVICE_SECRET, body)).andReturn().getResponse().getStatus();
        } catch (Exception ex) { throw new IllegalStateException(ex); }
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder ingest(UUID device, String credential, String body) {
        var request = post("/api/v1/telemetry/ingest/{deviceId}", device).contentType("application/json").content(body);
        if (credential != null) request.header("Authorization", credential);
        return request;
    }

    private void assertBadRequest(String body) throws Exception {
        mvc.perform(ingest(deviceA, "Device " + DEVICE_SECRET, body)).andExpect(status().isBadRequest());
    }

    private RequestPostProcessor member(UUID org, String subject) {
        return jwt().jwt(j -> j.claim("iss", ISSUER).subject(subject).claim("organization_id", org.toString())
                .claim("aud", List.of("wattscape-api")).claim("realm_access", Map.of("roles", List.of("MEMBER"))))
            .authorities(new SimpleGrantedAuthority("ROLE_MEMBER"));
    }

    private RequestPostProcessor admin(UUID org, String subject) {
        return jwt().jwt(j -> j.claim("iss", ISSUER).subject(subject).claim("organization_id", org.toString())
                .claim("aud", List.of("wattscape-api")).claim("realm_access", Map.of("roles", List.of("ADMIN"))))
            .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private void insertOrganization(UUID id, String name) {
        jdbc.update("INSERT INTO organizations(id,name,legal_name,created_at,updated_at) VALUES (?,?,?,?,?)", id, name, name + " LLC", now(), now());
    }
    private void insertUser(UUID org, String subject, String role) {
        jdbc.update("INSERT INTO organization_users(id,organization_id,issuer,subject,email,display_name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                UUID.randomUUID(), org, ISSUER, subject, subject + "@example.test", subject, role, "active", now(), now());
    }
    private void insertSite(UUID id, UUID org, String code) {
        jdbc.update("INSERT INTO sites(id,organization_id,name,code,time_zone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
                id, org, code + " Site", code, "UTC", "operational", now(), now());
    }
    private void insertDevice(UUID id, UUID org, UUID site, String externalId, String secretHash) {
        jdbc.update("INSERT INTO telemetry_devices(id,organization_id,site_id,external_id,display_name,protocol,status,secret_hash,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                id, org, site, externalId, externalId, "HTTPS", "active", secretHash, "synthetic-test", now(), now());
    }
    private void insertPoint(UUID device, UUID org, UUID site, String eventId) {
        jdbc.update("INSERT INTO telemetry_points(id,organization_id,site_id,device_id,metric_key,value,unit,quality,source_event_id,observed_at,received_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                UUID.randomUUID(), org, site, device, "energy_kwh", 1, "kWh", "good", eventId, now(), now(), now(), now());
    }
    private int pointCount(UUID device) { return jdbc.queryForObject("SELECT count(*) FROM telemetry_points WHERE device_id=?", Integer.class, device); }
    private static String sha256(String raw) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
    }
    private static String measurement(String eventId, String metric, String value, String unit, Instant at) {
        return "{\"measurements\":[" + measurementObject(eventId, value, at, metric, unit) + "]}";
    }
    private static String measurementObject(String eventId, String value, Instant at) { return measurementObject(eventId, value, at, "energy_kwh", "kWh"); }
    private static String measurementObject(String eventId, String value, Instant at, String metric, String unit) {
        return "{\"metricKey\":\"" + metric + "\",\"value\":" + value + ",\"unit\":\"" + unit + "\",\"quality\":\"good\",\"observedAt\":\"" + at + "\",\"eventId\":\"" + eventId + "\"}";
    }
}
