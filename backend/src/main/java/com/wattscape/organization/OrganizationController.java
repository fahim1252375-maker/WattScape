package com.wattscape.organization;

import com.wattscape.identity.TenantContext;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController @RequestMapping("/api/v1")
public class OrganizationController {
    private final TenantContext tenant; private final OrganizationRepository organizations; private final OnboardingService onboarding;
    public OrganizationController(TenantContext tenant, OrganizationRepository organizations,OnboardingService onboarding){this.tenant=tenant;this.organizations=organizations;this.onboarding=onboarding;}
    @GetMapping("/onboarding/status") public OnboardingService.OnboardingStatus onboardingStatus(Authentication auth){return onboarding.status(auth);}
    @PostMapping("/onboarding/organizations") public OrganizationResponse createOrganization(@Valid @RequestBody CreateOrganizationRequest request,Authentication auth){return onboarding.create(new OnboardingService.CreateOrganization(request.name(),request.legalName()),auth);}
    @PostMapping("/onboarding/invitations/accept") public org.springframework.http.ResponseEntity<Void> acceptInvitation(@Valid @RequestBody AcceptInvitationRequest request,Authentication auth){onboarding.acceptInvitation(request.token(),auth);return org.springframework.http.ResponseEntity.noContent().build();}
    @PostMapping("/organizations/current/invitations") public OnboardingService.InvitationDelivery createInvitation(@Valid @RequestBody CreateInvitationRequest request,Authentication auth){return onboarding.createInvitation(request.email(),request.role(),auth);}
    @PostMapping("/organizations/current/invitations/{invitationId}/revoke") public org.springframework.http.ResponseEntity<Void> revokeInvitation(@PathVariable UUID invitationId,Authentication auth){onboarding.revokeInvitation(invitationId,auth);return org.springframework.http.ResponseEntity.noContent().build();}
    @GetMapping("/me") public MeResponse me(Authentication auth){
        OrganizationUser user=tenant.requireActiveMember(auth);
        boolean verified=auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwt && Boolean.TRUE.equals(jwt.getToken().getClaim("email_verified"));
        return new MeResponse(user.getSubject(), user.getEmail(), user.getDisplayName(), user.getRole(), user.getOrganizationId(),verified);
    }
    @GetMapping("/organizations/current") public OrganizationResponse current(Authentication auth){
        UUID orgId=tenant.requireActiveMember(auth).getOrganizationId();
        Organization o=organizations.findById(orgId).orElseThrow(()->com.wattscape.common.ApiException.notFound("Organization not found"));
        return OrganizationResponse.from(o);
    }
    public record MeResponse(String subject,String email,String displayName,String role,UUID organizationId,boolean emailVerified){}
    public record CreateOrganizationRequest(@NotBlank @Size(max=160) String name,@NotBlank @Size(max=240) String legalName){}
    public record AcceptInvitationRequest(@NotBlank @Size(min=32,max=128) String token){}
    public record CreateInvitationRequest(@jakarta.validation.constraints.Email @NotBlank @Size(max=320) String email,@NotBlank String role){}
    public record OrganizationResponse(UUID id,String name,String legalName,String defaultCurrency,String unitSystem,String timeZonePolicy,String locale,int retentionDays,String region){
      static OrganizationResponse from(Organization o){return new OrganizationResponse(o.getId(),o.getName(),o.getLegalName(),o.getDefaultCurrency(),o.getUnitSystem(),o.getTimeZonePolicy(),o.getLocale(),o.getRetentionDays(),o.getRegion());}
    }
}
