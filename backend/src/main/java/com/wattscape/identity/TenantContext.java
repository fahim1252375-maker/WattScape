package com.wattscape.identity;

import com.wattscape.common.ApiException;
import com.wattscape.organization.OrganizationUser;
import com.wattscape.organization.OrganizationUserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import java.util.UUID;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
public class TenantContext {
    private final CurrentIdentity identity; private final OrganizationUserRepository users;
    public TenantContext(CurrentIdentity identity, OrganizationUserRepository users) { this.identity=identity; this.users=users; }
    public UUID organizationId(Authentication auth) { return requireActiveMember(auth).getOrganizationId(); }
    public OrganizationUser requireActiveMember(Authentication auth) {
        if (!(auth instanceof JwtAuthenticationToken jwt)) throw ApiException.unauthorized("JWT identity is required");
        UUID selected=selectedOrganization();
        if(selected!=null)return requireMembership(auth,selected);
        UUID claimed=identity.claimedOrganization(auth);
        if(claimed!=null) return requireMembership(auth,claimed);
        var memberships=users.findAllByIssuerAndSubjectAndStatus(jwt.getToken().getIssuer().toString(),identity.subject(auth),"active");
        if(memberships.size()==1)return memberships.get(0);
        if(memberships.size()>1)throw ApiException.forbidden("Multiple organization memberships require explicit organization switching");
        throw ApiException.forbidden("An active organization membership is required");
    }
    public OrganizationUser requireMembership(Authentication auth,UUID organizationId) {
        if(!(auth instanceof JwtAuthenticationToken jwt))throw ApiException.unauthorized("JWT identity is required");
        return users.findByOrganizationIdAndIssuerAndSubjectAndStatus(organizationId,jwt.getToken().getIssuer().toString(),identity.subject(auth),"active")
            .orElseThrow(()->ApiException.forbidden("Active membership is required for the selected organization"));
    }
    public java.util.List<OrganizationUser> memberships(Authentication auth) {
        if(!(auth instanceof JwtAuthenticationToken jwt))throw ApiException.unauthorized("JWT identity is required");
        return users.findAllByIssuerAndSubjectAndStatus(jwt.getToken().getIssuer().toString(),identity.subject(auth),"active");
    }
    private static UUID selectedOrganization() {
        if(!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes))return null;
        String value=attributes.getRequest().getHeader("X-Organization-Id");
        if(value==null||value.isBlank())return null;
        try{return UUID.fromString(value.trim());}catch(IllegalArgumentException exception){throw ApiException.badRequest("Selected organization identifier is invalid");}
    }
    public OrganizationUser requireRole(Authentication auth, String... allowedRoles) {
        OrganizationUser user=requireActiveMember(auth);
        if (java.util.Arrays.stream(allowedRoles).noneMatch(user.getRole()::equals)) throw ApiException.forbidden("Insufficient organization role");
        return user;
    }
}
