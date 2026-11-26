package com.wattscape.identity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.wattscape.site.SiteService;
import java.math.BigInteger;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Exercises the production Spring Security bearer filter and Boot JWT decoder with real RS256 tokens. */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
class SignedJwtSecurityIntegrationTest {
    private static final String ISSUER = "http://127.0.0.1:0/issuer";
    private static final String AUDIENCE = "wattscape-api";
    private static final String KEY_ID = "ephemeral-test-rsa";
    private static KeyPair signingPair;
    private static KeyPair wrongPair;
    private static HttpServer jwksServer;
    private static String issuer;
    private static String jwksUri;

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");

    @BeforeAll
    static void startEphemeralJwks() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        signingPair = generator.generateKeyPair();
        wrongPair = generator.generateKeyPair();
        jwksServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        String publicJwk = new RSAKey.Builder((RSAPublicKey) signingPair.getPublic())
            .keyID(KEY_ID).algorithm(JWSAlgorithm.RS256).build().toPublicJWK().toJSONString();
        byte[] response = ("{\"keys\":[" + publicJwk + "]}").getBytes(StandardCharsets.UTF_8);
        jwksServer.createContext("/jwks", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/jwk-set+json");
            exchange.sendResponseHeaders(200, response.length);
            try (var body = exchange.getResponseBody()) { body.write(response); }
        });
        jwksServer.start();
        int port = jwksServer.getAddress().getPort();
        issuer = "http://127.0.0.1:" + port + "/issuer";
        jwksUri = "http://127.0.0.1:" + port + "/jwks";
    }

    @AfterAll
    static void stopEphemeralJwks() {
        if (jwksServer != null) jwksServer.stop(0);
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> issuer);
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri", () -> jwksUri);
        registry.add("spring.security.oauth2.resourceserver.jwt.audiences", () -> AUDIENCE);
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    private UUID orgA, orgB, siteA, siteB;
    private OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC); }

    @BeforeEach
    void seedTenants() {
        orgA = UUID.randomUUID(); orgB = UUID.randomUUID();
        siteA = UUID.randomUUID(); siteB = UUID.randomUUID();
        insertOrganization(orgA, "Signed JWT Tenant A");
        insertOrganization(orgB, "Signed JWT Tenant B");
        insertUser(orgA, "signed-admin", "Organization Owner");
        insertUser(orgA, "signed-member", "Auditor/Read Only");
        insertUser(orgB, "signed-other", "Organization Owner");
        insertSite(siteA, orgA, "JWT-A");
        insertSite(siteB, orgB, "JWT-B");
    }

    @Test
    void validSignedJwtAndRealmRoleMappingPermitMemberReadButDenyAdminWrite() throws Exception {
        mvc.perform(get("/api/v1/sites").header("Authorization", bearer(token(signingPair, issuer, AUDIENCE,
                "signed-member", orgA, List.of("MEMBER"), Instant.now().minusSeconds(5), Instant.now().plusSeconds(120), null))))
            .andExpect(safeStatus(200));
        mvc.perform(post("/api/v1/sites").header("Authorization", bearer(token(signingPair, issuer, AUDIENCE,
                "signed-member", orgA, List.of("MEMBER"), Instant.now().minusSeconds(5), Instant.now().plusSeconds(120), null)))
                .contentType("application/json").content("{\"name\":\"Denied\",\"code\":\"DENIED\",\"timeZone\":\"UTC\"}"))
            .andExpect(safeStatus(403));
    }

    @Test
    void wrongSigningKeyAndTamperedSignatureAreRejected() throws Exception {
        String wrongKeyToken = token(wrongPair, issuer, AUDIENCE, "signed-admin", orgA, List.of("ADMIN"),
            Instant.now().minusSeconds(5), Instant.now().plusSeconds(120), null);
        mvc.perform(get("/api/v1/sites").header("Authorization", bearer(wrongKeyToken))).andExpect(safeStatus(401));
        String valid = token(signingPair, issuer, AUDIENCE, "signed-admin", orgA, List.of("ADMIN"),
            Instant.now().minusSeconds(5), Instant.now().plusSeconds(120), null);
        String[] parts = valid.split("\\.");
        String tampered = parts[0] + "." + parts[1] + "." + (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);
        mvc.perform(get("/api/v1/sites").header("Authorization", bearer(tampered))).andExpect(safeStatus(401));
    }

    @Test
    void incorrectIssuerAudienceExpiredAndNotYetValidTokensAreRejected() throws Exception {
        assertUnauthorized(token(signingPair, issuer + "/wrong", AUDIENCE, "signed-admin", orgA, List.of("ADMIN"), Instant.now().minusSeconds(5), Instant.now().plusSeconds(120)));
        assertUnauthorized(token(signingPair, issuer, "wrong-api", "signed-admin", orgA, List.of("ADMIN"), Instant.now().minusSeconds(5), Instant.now().plusSeconds(120)));
        assertUnauthorized(token(signingPair, issuer, AUDIENCE, "signed-admin", orgA, List.of("ADMIN"), Instant.now().minusSeconds(120), Instant.now().minusSeconds(30)));
        assertUnauthorized(token(signingPair, issuer, AUDIENCE, "signed-admin", orgA, List.of("ADMIN"), Instant.now().plusSeconds(300), Instant.now().plusSeconds(480)));
    }

    @Test
    void organizationClaimAndMembershipAreBothRequiredForTenantAccess() throws Exception {
        // A signed claim for an organization without an active issuer/subject membership is denied.
        mvc.perform(get("/api/v1/sites").header("Authorization", bearer(token(signingPair, issuer, AUDIENCE, "unknown-subject", orgA, List.of("ADMIN"), Instant.now().minusSeconds(5), Instant.now().plusSeconds(120))))).andExpect(safeStatus(403))
            .andExpect(result -> {
                if (!result.getResponse().getContentAsString().contains("Active membership is required"))
                    throw new AssertionError("Expected active-membership denial without returning tenant data");
            });
        // Missing claim falls back to membership lookup; this subject has two memberships and must select explicitly.
        insertUser(orgB, "signed-admin", "Organization Owner");
        mvc.perform(get("/api/v1/sites").header("Authorization", bearer(token(signingPair, issuer, AUDIENCE,
                "signed-admin", null, List.of("ADMIN"), Instant.now().minusSeconds(5), Instant.now().plusSeconds(120), null))))
            .andExpect(safeStatus(403));
    }

    @Test
    void activeMembershipAllowsOnlyItsTenantAndRejectsCrossTenantSelection() throws Exception {
        String signed = bearer(token(signingPair, issuer, AUDIENCE, "signed-admin", orgA, List.of("ADMIN"),
            Instant.now().minusSeconds(5), Instant.now().plusSeconds(120)));
        mvc.perform(get("/api/v1/sites").header("Authorization", signed)).andExpect(safeStatus(200));
        mvc.perform(get("/api/v1/sites/{id}/twin", siteB).header("Authorization", signed)).andExpect(safeStatus(404));
        mvc.perform(get("/api/v1/sites").header("Authorization", signed).header("X-Organization-Id", orgB.toString()))
            .andExpect(safeStatus(403));
    }

    @Test
    void missingSubjectAndUnauthenticatedRequestsAreRejected() throws Exception {
        assertUnauthorized(token(signingPair, issuer, AUDIENCE, null, orgA, List.of("ADMIN"), Instant.now().minusSeconds(5), Instant.now().plusSeconds(120)));
        mvc.perform(get("/api/v1/sites")).andExpect(safeStatus(401));
    }

    private void assertUnauthorized(String compact) throws Exception {
        mvc.perform(get("/api/v1/sites").header("Authorization", bearer(compact))).andExpect(safeStatus(401));
    }
    private static org.springframework.test.web.servlet.ResultMatcher safeStatus(int expected) {
        return result -> {
            int actual = result.getResponse().getStatus();
            if (actual != expected) throw new AssertionError("Expected HTTP " + expected + " but received HTTP " + actual + " for " + result.getRequest().getRequestURI());
        };
    }
    private static String bearer(String compact) { return "Bearer " + compact; }

    private static String token(KeyPair pair, String tokenIssuer, String audience, String subject, UUID organization,
                                 List<String> roles, Instant notBefore, Instant expires) throws Exception {
        return token(pair, tokenIssuer, audience, subject, organization, roles, notBefore, expires, null);
    }

    private static String token(KeyPair pair, String tokenIssuer, String audience, String subject, UUID organization,
                                 List<String> roles, Instant notBefore, Instant expires, String ignored) throws Exception {
        var claims = new JWTClaimsSet.Builder().issuer(tokenIssuer).audience(audience)
            .issueTime(Date.from(Instant.now().minusSeconds(2))).notBeforeTime(Date.from(notBefore))
            .expirationTime(Date.from(expires));
        if (subject != null) claims.subject(subject);
        if (organization != null) claims.claim("organization_id", organization.toString());
        if (roles != null) claims.claim("realm_access", Map.of("roles", roles));
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY_ID).build(), claims.build());
        jwt.sign(new RSASSASigner((RSAPrivateKey) pair.getPrivate()));
        return jwt.serialize();
    }

    private void insertOrganization(UUID id, String name) {
        jdbc.update("INSERT INTO organizations(id,name,legal_name,created_at,updated_at) VALUES (?,?,?,?,?)", id, name, name + " LLC", now(), now());
    }
    private void insertUser(UUID org, String subject, String role) {
        jdbc.update("INSERT INTO organization_users(id,organization_id,issuer,subject,email,display_name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            UUID.randomUUID(), org, issuer, subject, subject + "@example.test", subject, role, "active", now(), now());
    }
    private void insertSite(UUID id, UUID org, String code) {
        jdbc.update("INSERT INTO sites(id,organization_id,name,code,time_zone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
            id, org, code + " Site", code, "UTC", "operational", now(), now());
    }
}
