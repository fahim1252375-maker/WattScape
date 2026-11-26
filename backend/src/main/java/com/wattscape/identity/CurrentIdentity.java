package com.wattscape.identity;

import com.wattscape.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
public class CurrentIdentity {
    private final String organizationClaim;
    public CurrentIdentity(@Value("${wattscape.security.organization-claim}") String organizationClaim) { this.organizationClaim = organizationClaim; }
    public UUID organizationId(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken token)) throw ApiException.unauthorized("JWT identity is required");
        Object raw = token.getToken().getClaims().get(organizationClaim);
        if (raw == null) throw ApiException.forbidden("Token is missing the required organization claim");
        try { return UUID.fromString(raw.toString()); }
        catch (IllegalArgumentException ex) { throw ApiException.forbidden("Token organization claim is invalid"); }
    }
    public String subject(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken token) || token.getToken().getSubject() == null)
            throw ApiException.unauthorized("JWT subject is required");
        return token.getToken().getSubject();
    }
    public org.springframework.security.oauth2.jwt.Jwt jwt(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken token)) throw ApiException.unauthorized("JWT identity is required");
        return token.getToken();
    }
    public String issuer(Authentication authentication) { return jwt(authentication).getIssuer().toString(); }
    public UUID claimedOrganization(Authentication authentication) {
        Object raw = jwt(authentication).getClaims().get(organizationClaim);
        if (raw == null) return null;
        try { return UUID.fromString(raw.toString()); }
        catch (IllegalArgumentException ex) { throw ApiException.forbidden("Token organization claim is invalid"); }
    }
}
