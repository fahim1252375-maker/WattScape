package com.wattscape.identity;

import com.wattscape.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.net.URI;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class CurrentIdentityTest {
    private final CurrentIdentity identity = new CurrentIdentity("organization_id");
    @Test void organizationComesFromVerifiedJwtClaim() {
        UUID expected=UUID.randomUUID();
        var auth=new JwtAuthenticationToken(Jwt.withTokenValue("opaque-test-token").header("alg","RS256").claim("iss","https://id.example/issuer").subject("subject-1").claim("organization_id",expected.toString()).build());
        assertEquals(expected,identity.organizationId(auth));
    }
    @Test void rejectsMissingOrganizationClaim() {
        var auth=new JwtAuthenticationToken(Jwt.withTokenValue("opaque-test-token").header("alg","RS256").claim("iss","https://id.example/issuer").subject("subject-1").build());
        assertEquals(403,assertThrows(ApiException.class,()->identity.organizationId(auth)).status().value());
    }
    @Test void rejectsMalformedOrganizationClaim() {
        var auth=new JwtAuthenticationToken(Jwt.withTokenValue("opaque-test-token").header("alg","RS256").claim("iss","https://id.example/issuer").subject("subject-1").claim("organization_id","org-1").build());
        assertEquals(403,assertThrows(ApiException.class,()->identity.organizationId(auth)).status().value());
    }
}
