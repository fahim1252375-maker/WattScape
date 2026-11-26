package com.wattscape.organization;

import com.wattscape.common.ApiException;
import com.wattscape.identity.CurrentIdentity;
import com.wattscape.identity.TenantContext;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class InvitationLifecycleTest {
 private static final java.util.UUID ORG=java.util.UUID.randomUUID();
 private final CurrentIdentity identity=new CurrentIdentity("organization_id");
 private final TenantContext tenant=mock(TenantContext.class);
 private final OrganizationRepository organizations=mock(OrganizationRepository.class);
 private final OrganizationUserRepository users=mock(OrganizationUserRepository.class);
 private final OrganizationInvitationRepository invitations=mock(OrganizationInvitationRepository.class);
 private final InvitationRateLimiter limiter=mock(InvitationRateLimiter.class);
 private final org.springframework.context.ApplicationEventPublisher events=mock(org.springframework.context.ApplicationEventPublisher.class);
 private final Organization targetOrganization=new Organization("Example Org","Example Inc");
 private final OnboardingService service=new OnboardingService(identity,tenant,organizations,users,invitations,limiter,events);

 @Test void invitationEmailIsScheduledAfterCommitAndRawTokenIsOmittedFromResponse(){
   var auth=auth("owner","owner@example.test");var owner=new OrganizationUser(ORG,"https://issuer.test","owner","owner@example.test","Owner","Organization Owner");
   when(tenant.requireRole(auth,"Organization Owner","Organization Admin")).thenReturn(owner);when(limiter.acquire(auth)).thenReturn(true);
   when(organizations.findById(ORG)).thenReturn(Optional.of(targetOrganization));
   when(invitations.save(any(OrganizationInvitation.class))).thenAnswer(call->call.getArgument(0));
   var result=service.createInvitation("invitee@example.test","Technician",auth);
   assertTrue(result.emailDispatchScheduled());assertEquals("invitee@example.test",result.email());assertEquals("Technician",result.role());
   var captor=org.mockito.ArgumentCaptor.forClass(OrganizationInvitation.class);verify(invitations).save(captor.capture());
   assertEquals(64,captor.getValue().getTokenHash().length());assertTrue(captor.getValue().getExpiresAt().isAfter(Instant.now().plusSeconds(71*3600)));
   var eventCaptor = org.mockito.ArgumentCaptor.forClass(Object.class);
   verify(events).publishEvent(eventCaptor.capture());
   Object publishedEvent = eventCaptor.getValue();
   assertTrue(publishedEvent instanceof InvitationEmailRequested);
   var requested = (InvitationEmailRequested) publishedEvent;
   assertEquals("invitee@example.test", requested.recipient());
   assertTrue(requested.token() != null && requested.token().length() >= 32);
 }

 @Test void invitationLimitIsEnforced(){
   var auth=auth("owner","owner@example.test");var owner=new OrganizationUser(ORG,"https://issuer.test","owner","owner@example.test","Owner","Organization Owner");
   when(tenant.requireRole(auth,"Organization Owner","Organization Admin")).thenReturn(owner);when(limiter.acquire(auth)).thenReturn(false);
   assertThrows(ApiException.class,()->service.createInvitation("invitee@example.test","Technician",auth));verifyNoInteractions(events);
 }

 @Test void acceptsValidInvitationAlongsideExistingMembershipAndMarksItUsed(){
   var auth=auth("member","invitee@example.test");var invitation=invitation(Instant.now().plusSeconds(300));
   when(invitations.findLockedByHash(hash(TOKEN))).thenReturn(Optional.of(invitation));
   when(users.findByOrganizationIdAndIssuerAndSubjectAndStatus(ORG,"https://issuer.test","member","active")).thenReturn(Optional.empty());
   when(users.save(any(OrganizationUser.class))).thenAnswer(call->call.getArgument(0));
   when(organizations.findById(ORG)).thenReturn(Optional.of(targetOrganization));
   service.acceptInvitation(TOKEN,auth);
   var membership=org.mockito.ArgumentCaptor.forClass(OrganizationUser.class);verify(users).save(membership.capture());
   assertEquals(targetOrganization.getId(),membership.getValue().getOrganizationId());assertEquals("Technician",membership.getValue().getRole());
   assertEquals("accepted",invitation.getStatus());
 }

 @Test void rejectsExpiredInvitation(){assertRejected(invitation(Instant.now().minusSeconds(5)),"invitee@example.test");}
 @Test void rejectsAlreadyUsedInvitation(){var invitation=invitation(Instant.now().plusSeconds(60));invitation.accept();assertRejected(invitation,"invitee@example.test");}
 @Test void rejectsInvitationForWrongVerifiedEmail(){assertRejected(invitation(Instant.now().plusSeconds(60)),"different@example.test");}
 @Test void rejectsRevokedInvitation(){assertRejected(revokedInvitation(),"invitee@example.test");}
 @Test void rejectsMalformedTokenBeforeRepositoryLookup(){assertThrows(ApiException.class,()->service.acceptInvitation("bad",auth("member","invitee@example.test")));verifyNoInteractions(invitations);}

 @Test void ownerCanRevokeInvitationWithinTheirOrganization(){
   var auth=auth("owner","owner@example.test");var owner=new OrganizationUser(ORG,"https://issuer.test","owner","owner@example.test","Owner","Organization Owner");
   var invitation=invitation(Instant.now().plusSeconds(3600));var id=java.util.UUID.randomUUID();
   when(tenant.requireRole(auth,"Organization Owner","Organization Admin")).thenReturn(owner);
   when(invitations.findLockedByIdAndOrganizationId(id,ORG)).thenReturn(Optional.of(invitation));
   service.revokeInvitation(id,auth);
   assertEquals("revoked",invitation.getStatus());assertFalse(invitation.usableAt(Instant.now()));
 }
 @Test void revocationIsIdempotentAndCannotUndoAcceptance(){
   var accepted=invitation(Instant.now().plusSeconds(3600));accepted.accept();
   assertThrows(IllegalStateException.class,accepted::revoke);
   var revoked=revokedInvitation();revoked.revoke();assertEquals("revoked",revoked.getStatus());
 }
 @Test void cannotRevokeInvitationFromAnotherOrganization(){
   var auth=auth("owner","owner@example.test");var owner=new OrganizationUser(ORG,"https://issuer.test","owner","owner@example.test","Owner","Organization Owner");var id=java.util.UUID.randomUUID();
   when(tenant.requireRole(auth,"Organization Owner","Organization Admin")).thenReturn(owner);
   when(invitations.findLockedByIdAndOrganizationId(id,ORG)).thenReturn(Optional.empty());
   assertThrows(ApiException.class,()->service.revokeInvitation(id,auth));
 }

 private void assertRejected(OrganizationInvitation invitation,String emailAddress){
   when(invitations.findLockedByHash(hash(TOKEN))).thenReturn(Optional.of(invitation));
   assertThrows(ApiException.class,()->service.acceptInvitation(TOKEN,auth("member",emailAddress)));
   verify(users,never()).save(any());
 }
 private static final String TOKEN="T".repeat(43);
 private static OrganizationInvitation invitation(Instant expiration){return new OrganizationInvitation(ORG,"invitee@example.test",hash(TOKEN),"Technician",expiration,"owner");}
 private static OrganizationInvitation revokedInvitation(){var invitation=invitation(Instant.now().plusSeconds(60));invitation.revoke();return invitation;}
 private static String hash(String value){try{return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private static JwtAuthenticationToken auth(String subject,String email){Jwt jwt=Jwt.withTokenValue("token").header("alg","RS256").issuer("https://issuer.test").subject(subject).claim("email",email).claim("email_verified",true).claim("name",subject).build();return new JwtAuthenticationToken(jwt,List.of());}
}
