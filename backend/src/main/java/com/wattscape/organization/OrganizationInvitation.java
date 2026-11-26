package com.wattscape.organization;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="organization_invitations")
public class OrganizationInvitation extends BaseEntity {
 @Column(name="organization_id",nullable=false) private UUID organizationId;
 @Column(nullable=false,length=320) private String email;
 @Column(name="token_hash",nullable=false,length=64,unique=true) private String tokenHash;
 @Column(nullable=false,length=48) private String role;
 @Column(name="expires_at",nullable=false) private Instant expiresAt;
 @Column(name="accepted_at") private Instant acceptedAt;
 @Column(name="revoked_at") private Instant revokedAt;
 @Column(name="created_by_subject",nullable=false,length=255) private String createdBySubject;
 protected OrganizationInvitation(){}
 public OrganizationInvitation(UUID org,String email,String tokenHash,String role,Instant expires,String creator){this.organizationId=org;this.email=email;this.tokenHash=tokenHash;this.role=role;this.expiresAt=expires;this.createdBySubject=creator;}
 public UUID getOrganizationId(){return organizationId;} public String getEmail(){return email;} public String getRole(){return role;} public String getTokenHash(){return tokenHash;} public String getStatus(){return acceptedAt!=null?"accepted":revokedAt!=null?"revoked":expiresAt.isBefore(Instant.now())?"expired":"pending";} public Instant getExpiresAt(){return expiresAt;}
 public boolean usableAt(Instant now){return acceptedAt==null&&revokedAt==null&&expiresAt.isAfter(now);}
 public void accept(){acceptedAt=Instant.now();}
 public void revoke(){if(acceptedAt!=null)throw new IllegalStateException("An accepted invitation cannot be revoked");if(revokedAt==null)revokedAt=Instant.now();}
}
