package com.wattscape.organization;

import com.wattscape.common.ApiException;
import com.wattscape.identity.CurrentIdentity;
import com.wattscape.identity.TenantContext;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class OnboardingService {
 private static final SecureRandom RANDOM=new SecureRandom();
 private final CurrentIdentity identity; private final TenantContext tenant; private final OrganizationRepository organizations; private final OrganizationUserRepository users; private final OrganizationInvitationRepository invitations; private final InvitationRateLimiter rateLimiter; private final org.springframework.context.ApplicationEventPublisher events;
 public OnboardingService(CurrentIdentity identity,TenantContext tenant,OrganizationRepository organizations,OrganizationUserRepository users,OrganizationInvitationRepository invitations,InvitationRateLimiter rateLimiter,org.springframework.context.ApplicationEventPublisher events){this.identity=identity;this.tenant=tenant;this.organizations=organizations;this.users=users;this.invitations=invitations;this.rateLimiter=rateLimiter;this.events=events;}
 @Transactional(readOnly=true) public OnboardingStatus status(Authentication auth){
   var existing=users.findAllByIssuerAndSubjectAndStatus(identity.issuer(auth),identity.subject(auth),"active");
   return new OnboardingStatus(!existing.isEmpty(),existing.size()>1);
 }
 @Transactional public OrganizationController.OrganizationResponse create(CreateOrganization request,Authentication auth){
   var jwt=identity.jwt(auth);requireVerifiedEmail(jwt.getClaimAsString("email"),Boolean.TRUE.equals(jwt.getClaim("email_verified")));
   Organization org=organizations.save(new Organization(request.name().trim(),request.legalName().trim()));
   users.save(new OrganizationUser(org.getId(),identity.issuer(auth),identity.subject(auth),jwt.getClaimAsString("email"),displayName(jwt),"Organization Owner"));
   return OrganizationController.OrganizationResponse.from(org);
 }
 @Transactional public InvitationDelivery createInvitation(String email,String role,Authentication auth){
   var owner=tenant.requireRole(auth,"Organization Owner","Organization Admin");
   if(!java.util.Set.of("Facilities Operator","Energy/Sustainability Analyst","Technician","Auditor/Read Only").contains(role))throw ApiException.badRequest("Invitation role is not permitted");
   if(!rateLimiter.acquire(auth))throw ApiException.tooManyRequests("Invitation limit reached. Try again in an hour.");
   byte[] bytes=new byte[32];RANDOM.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
   String address=email.trim().toLowerCase(java.util.Locale.ROOT);
   var invitation=invitations.save(new OrganizationInvitation(owner.getOrganizationId(),address,hash(token),role,Instant.now().plus(72,ChronoUnit.HOURS),identity.subject(auth)));
   var organization=organizations.findById(owner.getOrganizationId()).orElseThrow(()->ApiException.notFound("Organization not found"));
   events.publishEvent(new InvitationEmailRequested(address,organization.getName(),role,token,invitation.getExpiresAt()));
   return new InvitationDelivery(true,invitation.getExpiresAt(),address,role);
 }
 @Transactional public void revokeInvitation(java.util.UUID invitationId,Authentication auth){
   var owner=tenant.requireRole(auth,"Organization Owner","Organization Admin");
   var invitation=invitations.findLockedByIdAndOrganizationId(invitationId,owner.getOrganizationId()).orElseThrow(()->ApiException.notFound("Invitation not found"));
   if("accepted".equals(invitation.getStatus()))throw ApiException.conflict("An accepted invitation cannot be revoked");
   invitation.revoke();
 }
 @Transactional public void acceptInvitation(String token,Authentication auth){
   var jwt=identity.jwt(auth);String email=jwt.getClaimAsString("email");requireVerifiedEmail(email,Boolean.TRUE.equals(jwt.getClaim("email_verified")));
   var invitation=invitations.findLockedByHash(hash(token)).orElseThrow(()->ApiException.notFound("Invitation is invalid or expired"));
   if(!invitation.usableAt(Instant.now())||!invitation.getEmail().equalsIgnoreCase(email))throw ApiException.notFound("Invitation is invalid or expired");
   var org=organizations.findById(invitation.getOrganizationId()).orElseThrow(()->ApiException.notFound("Organization not found"));
   var existing=users.findByOrganizationIdAndIssuerAndSubject(org.getId(),identity.issuer(auth),identity.subject(auth));
   if(existing.isPresent()){
     if(existing.get().getStatus().equals("active"))throw ApiException.conflict("This identity is already a member of this organization");
     existing.get().reactivateFromInvitation(email,displayName(jwt),invitation.getRole());
   } else users.save(new OrganizationUser(org.getId(),identity.issuer(auth),identity.subject(auth),email,displayName(jwt),invitation.getRole()));
   invitation.accept();
 }
 private static void requireVerifiedEmail(String email,boolean verified){if(email==null||email.isBlank()||!verified)throw ApiException.forbidden("A verified email address is required for organization onboarding");}
 private static String displayName(org.springframework.security.oauth2.jwt.Jwt jwt){String name=jwt.getClaimAsString("name");return name!=null?name:jwt.getClaimAsString("preferred_username");}
 private static String hash(String token){if(token==null||token.length()<32||token.length()>128)throw ApiException.badRequest("Invitation token is invalid");try{return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));}catch(Exception ex){throw new IllegalStateException(ex);}}
 public record CreateOrganization(String name,String legalName){}
 public record OnboardingStatus(boolean hasOrganization,boolean needsOrganizationSelection){}
 public record InvitationDelivery(boolean emailDispatchScheduled,Instant expiresAt,String email,String role){}
}
