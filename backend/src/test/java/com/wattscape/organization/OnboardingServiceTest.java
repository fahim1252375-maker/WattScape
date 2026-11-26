package com.wattscape.organization;

import com.wattscape.common.ApiException;
import com.wattscape.identity.CurrentIdentity;
import com.wattscape.identity.TenantContext;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OnboardingServiceTest {
 private final CurrentIdentity identity=new CurrentIdentity("organization_id");
 private final TenantContext tenant=mock(TenantContext.class);
 private final OrganizationRepository organizations=mock(OrganizationRepository.class);
 private final OrganizationUserRepository users=mock(OrganizationUserRepository.class);
 private final OrganizationInvitationRepository invitations=mock(OrganizationInvitationRepository.class);
 private final InvitationRateLimiter rateLimiter=mock(InvitationRateLimiter.class);
 private final org.springframework.context.ApplicationEventPublisher events=mock(org.springframework.context.ApplicationEventPublisher.class);
 private final OnboardingService service=new OnboardingService(identity,tenant,organizations,users,invitations,rateLimiter,events);

 @Test void reportsMultipleMembershipsAsSelectionRequiredFromDatabase(){
   var auth=auth(true);when(users.findAllByIssuerAndSubjectAndStatus("https://issuer.test","new-user","active"))
     .thenReturn(List.of(new OrganizationUser(java.util.UUID.randomUUID(),"https://issuer.test","new-user","person@example.test","Person","Organization Owner"),
       new OrganizationUser(java.util.UUID.randomUUID(),"https://issuer.test","new-user","person@example.test","Person","Auditor/Read Only")));
   var status=service.status(auth);
   assertTrue(status.hasOrganization());assertTrue(status.needsOrganizationSelection());
 }

 @Test void reportsNewIdentityWithoutMembership(){
   var auth=auth(true);when(users.findAllByIssuerAndSubjectAndStatus("https://issuer.test","new-user","active")).thenReturn(List.of());
   var status=service.status(auth);
   assertFalse(status.hasOrganization());assertFalse(status.needsOrganizationSelection());
 }

 @Test void rejectsUnverifiedEmailBeforeCreatingOrganization(){
   var auth=auth(false);
   when(users.findAllByIssuerAndSubjectAndStatus("https://issuer.test","new-user","active")).thenReturn(List.of());
   assertThrows(ApiException.class,()->service.create(new OnboardingService.CreateOrganization("Example","Example Inc"),auth));
   verifyNoInteractions(organizations);
 }

 @Test void assignsOwnerRoleOnServerForVerifiedIdentity(){
   var auth=auth(true);
   when(users.findAllByIssuerAndSubjectAndStatus("https://issuer.test","new-user","active")).thenReturn(List.of());
   when(organizations.save(any(Organization.class))).thenAnswer(call->call.getArgument(0));
   when(users.save(any(OrganizationUser.class))).thenAnswer(call->call.getArgument(0));
   var result=service.create(new OnboardingService.CreateOrganization("Example","Example Inc"),auth);
   assertEquals("Example",result.name());
   var captor=org.mockito.ArgumentCaptor.forClass(OrganizationUser.class);
   verify(users).save(captor.capture());
   assertEquals("Organization Owner",captor.getValue().getRole());
   assertEquals("new-user",captor.getValue().getSubject());
 }

 private static JwtAuthenticationToken auth(boolean verified){
   Jwt jwt=Jwt.withTokenValue("signed-token").header("alg","RS256").issuer("https://issuer.test").subject("new-user")
     .claim("email","person@example.test").claim("email_verified",verified).claim("name","Person Example").build();
   return new JwtAuthenticationToken(jwt,List.of());
 }
}
