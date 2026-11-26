package com.wattscape.site;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = "management.health.mail.enabled=false")
@AutoConfigureMockMvc
@Import(TenantIsolationIntegrationTest.TestJwtConfiguration.class)
class TenantIsolationIntegrationTest {
    private static final String ISSUER="https://issuer.example.test";
    @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:17.6-alpine");
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry){
      registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);
      registry.add("spring.datasource.username",POSTGRES::getUsername);
      registry.add("spring.datasource.password",POSTGRES::getPassword);
      registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri",()->ISSUER);
      registry.add("spring.security.oauth2.resourceserver.jwt.audiences",()->"wattscape-api");
    }
    @TestConfiguration static class TestJwtConfiguration {
      @Bean @Primary JwtDecoder jwtDecoder(){return token -> { throw new UnsupportedOperationException("Mock JWT request post-processors bypass decoding"); };}
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired com.wattscape.organization.InvitationRateLimiter invitationRateLimiter;
    private UUID orgA,orgB,siteB;
    private OffsetDateTime now(){return OffsetDateTime.now(ZoneOffset.UTC);}

    @BeforeEach void seed(){
      orgA=UUID.randomUUID();orgB=UUID.randomUUID();siteB=UUID.randomUUID();
      jdbc.update("INSERT INTO organizations(id,name,legal_name,created_at,updated_at) VALUES (?,?,?,?,?)",orgA,"Org A","Org A LLC",now(),now());
      jdbc.update("INSERT INTO organizations(id,name,legal_name,created_at,updated_at) VALUES (?,?,?,?,?)",orgB,"Org B","Org B LLC",now(),now());
      insertUser(orgA,"alice","Organization Owner");
      insertUser(orgA,"bob","Auditor/Read Only");
      insertUser(orgB,"charlie","Organization Owner");
      jdbc.update("INSERT INTO sites(id,organization_id,name,code,time_zone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",siteB,orgB,"B Site","B01","UTC","operational",now(),now());
    }
    private void insertUser(UUID org,String subject,String role){
      jdbc.update("INSERT INTO organization_users(id,organization_id,issuer,subject,email,display_name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",UUID.randomUUID(),org,ISSUER,subject,subject+"@example.test",subject,role,"active",now(),now());
    }
    private RequestPostProcessor admin(UUID org,String subject){return jwt().jwt(j->j.claim("iss",ISSUER).subject(subject).claim("email",subject+"@example.test").claim("email_verified",true).claim("organization_id",org.toString()).claim("aud",List.of("wattscape-api")).claim("realm_access",java.util.Map.of("roles",List.of("ADMIN")))).authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));}
    private RequestPostProcessor member(UUID org,String subject){return jwt().jwt(j->j.claim("iss",ISSUER).subject(subject).claim("email",subject+"@example.test").claim("email_verified",true).claim("organization_id",org.toString()).claim("aud",List.of("wattscape-api")).claim("realm_access",java.util.Map.of("roles",List.of("MEMBER")))).authorities(new SimpleGrantedAuthority("ROLE_MEMBER"));}
    private RequestPostProcessor roleless(){return jwt().jwt(j->j.claim("iss",ISSUER).subject("roleless-user").claim("aud",List.of("wattscape-api"))).authorities(List.of());}

    @Test void unauthenticatedApiRequestReturns401() throws Exception {
      mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
    }
    @Test void rolelessAuthenticatedUserCannotReadOrMutateApiResources() throws Exception {
      mvc.perform(get("/api/v1/sites").with(roleless())).andExpect(status().isForbidden());
      mvc.perform(post("/api/v1/sites").with(roleless()).contentType(MediaType.APPLICATION_JSON)
          .content("{\"name\":\"Denied\",\"code\":\"DEN\",\"timeZone\":\"UTC\"}"))
        .andExpect(status().isForbidden());
      mvc.perform(put("/api/v1/sites/"+siteB).with(roleless()).contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());
      mvc.perform(patch("/api/v1/sites/"+siteB).with(roleless()).contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());
      mvc.perform(delete("/api/v1/sites/"+siteB).with(roleless())).andExpect(status().isForbidden());
    }
    @Test void actuatorHealthIsPublicAndPrometheusIsAdminOnly() throws Exception {
      mvc.perform(get("/actuator/health")).andExpect(status().isOk());
      mvc.perform(get("/actuator/prometheus")).andExpect(status().isUnauthorized());
      mvc.perform(get("/actuator/prometheus").with(member(orgA,"bob"))).andExpect(status().isForbidden());
      mvc.perform(get("/actuator/prometheus").with(admin(orgA,"alice")))
          .andExpect(status().isOk()).andExpect(content().string(org.hamcrest.Matchers.containsString("# HELP")));
    }
    @Test void apiDocumentationRequiresAdminRole() throws Exception {
      mvc.perform(get("/api-docs")).andExpect(status().isUnauthorized());
      mvc.perform(get("/api-docs").with(member(orgA,"bob"))).andExpect(status().isForbidden());
      mvc.perform(get("/api-docs").with(admin(orgA,"alice")))
          .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }
    @Test void memberCanReadButCannotCreateSite() throws Exception {
      mvc.perform(get("/api/v1/me").with(member(orgA,"bob"))).andExpect(status().isOk()).andExpect(jsonPath("$.subject").value("bob"));
      mvc.perform(post("/api/v1/sites").with(member(orgA,"bob")).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"No\",\"code\":\"NO1\",\"timeZone\":\"UTC\"}"))
        .andExpect(status().isForbidden()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
    }
    @Test void adminCanCreateSiteButCannotAccessAnotherTenant() throws Exception {
      String body="{\"name\":\"A Site\",\"code\":\"A01\",\"timeZone\":\"UTC\",\"areaSqm\":1200,\"initialBuildingName\":\"Main Building\"}";
      mvc.perform(post("/api/v1/sites").with(admin(orgA,"alice")).contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.organizationId").doesNotExist()).andExpect(jsonPath("$.code").value("A01"));
      mvc.perform(get("/api/v1/sites").with(admin(orgA,"alice"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].code").value("A01"));
      mvc.perform(get("/api/v1/sites/"+siteB+"/twin").with(admin(orgA,"alice"))).andExpect(status().isNotFound());
    }
    @Test void databaseMembershipRoleStillRestrictsAdminToken() throws Exception {
      jdbc.update("UPDATE organization_users SET role='Auditor/Read Only' WHERE organization_id=? AND subject='alice'",orgA);
      mvc.perform(post("/api/v1/sites").with(admin(orgA,"alice")).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"No\",\"code\":\"NO1\",\"timeZone\":\"UTC\"}"))
        .andExpect(status().isForbidden());
    }
    @Test void selectedOrganizationIsOnlyASelectorAndMembershipIsCheckedOnEveryRequest() throws Exception {
      insertUser(orgB,"alice","Auditor/Read Only");
      mvc.perform(get("/api/v1/organizations/memberships").with(admin(orgA,"alice")))
        .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.organizationId == '"+orgA+"')]" ).isArray())
        .andExpect(jsonPath("$[?(@.organizationId == '"+orgB+"')]" ).isArray());
      mvc.perform(get("/api/v1/sites").with(admin(orgA,"alice")).header("X-Organization-Id",orgB.toString()))
        .andExpect(status().isOk()).andExpect(jsonPath("$[0].code").value("B01"));
      mvc.perform(post("/api/v1/organizations/active").with(admin(orgA,"alice")).contentType(MediaType.APPLICATION_JSON)
          .content("{\"organizationId\":\""+orgB+"\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.organizationId").value(orgB.toString())).andExpect(jsonPath("$.role").value("Auditor/Read Only"));
      mvc.perform(post("/api/v1/sites").with(admin(orgA,"alice")).header("X-Organization-Id",orgB.toString())
          .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Escalation\",\"code\":\"ESC\",\"timeZone\":\"UTC\"}"))
        .andExpect(status().isForbidden());
      mvc.perform(get("/api/v1/sites").with(admin(orgB,"charlie")).header("X-Organization-Id",orgA.toString()))
        .andExpect(status().isForbidden());
    }
    @Test void invitationRateLimitUsesPersistedIssuerAndSubjectWindow() {
      var jwt=org.springframework.security.oauth2.jwt.Jwt.withTokenValue("rate-test-token").header("alg","RS256")
          .issuer(ISSUER).subject("invitation-rate-test").build();
      var auth=new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken(jwt,List.of());
      for(int request=0;request<5;request++)org.junit.jupiter.api.Assertions.assertTrue(invitationRateLimiter.acquire(auth));
      org.junit.jupiter.api.Assertions.assertFalse(invitationRateLimiter.acquire(auth));
      var otherJwt=org.springframework.security.oauth2.jwt.Jwt.withTokenValue("other-rate-test-token").header("alg","RS256")
          .issuer(ISSUER).subject("other-invitation-rate-test").build();
      org.junit.jupiter.api.Assertions.assertTrue(invitationRateLimiter.acquire(new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken(otherJwt,List.of())));
    }
    @Test void ownerRevokesInvitationByTenantScopedIdAndTheCodeCanNoLongerBeAccepted() throws Exception {
      UUID invitationId=UUID.randomUUID();String rawCode="T".repeat(43);
      String tokenHash=java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(rawCode.getBytes(StandardCharsets.UTF_8)));
      jdbc.update("INSERT INTO organization_invitations(id,organization_id,email,token_hash,role,expires_at,created_by_subject,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
          invitationId,orgA,"bob@example.test",tokenHash,"Technician",now().plusDays(3),"alice",now(),now());

      mvc.perform(post("/api/v1/organizations/current/invitations/"+invitationId+"/revoke").with(admin(orgA,"alice")))
          .andExpect(status().isNoContent());
      org.junit.jupiter.api.Assertions.assertNotNull(jdbc.queryForObject("SELECT revoked_at FROM organization_invitations WHERE id=?",java.time.OffsetDateTime.class,invitationId));
      mvc.perform(post("/api/v1/onboarding/invitations/accept").with(member(orgA,"bob")).contentType(MediaType.APPLICATION_JSON)
          .content("{\"token\":\""+rawCode+"\"}"))
          .andExpect(status().isNotFound());
      mvc.perform(post("/api/v1/organizations/current/invitations/"+invitationId+"/revoke").with(admin(orgB,"charlie")))
          .andExpect(status().isNotFound());
      org.junit.jupiter.api.Assertions.assertEquals("Auditor/Read Only",jdbc.queryForObject(
          "SELECT role FROM organization_users WHERE organization_id=? AND subject='bob'",String.class,orgA));
    }
}
