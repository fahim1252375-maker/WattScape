package com.wattscape.organization;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name="organization_users", uniqueConstraints=@UniqueConstraint(name="uq_org_user_subject", columnNames={"organization_id","issuer","subject"}))
public class OrganizationUser extends BaseEntity {
    @Column(name="organization_id", nullable=false) private UUID organizationId;
    @Column(nullable=false, length=500) private String issuer;
    @Column(nullable=false, length=255) private String subject;
    @Column(length=320) private String email;
    @Column(name="display_name", length=160) private String displayName;
    @Column(nullable=false, length=48) private String role;
    @Column(nullable=false, length=16) private String status="active";
    protected OrganizationUser() {}
    public OrganizationUser(UUID organizationId,String issuer,String subject,String email,String displayName,String role){this.organizationId=organizationId;this.issuer=issuer;this.subject=subject;this.email=email;this.displayName=displayName;this.role=role;}
    public void reactivateFromInvitation(String email,String displayName,String role){this.email=email;this.displayName=displayName;this.role=role;this.status="active";}
    public UUID getOrganizationId(){return organizationId;} public String getIssuer(){return issuer;} public String getSubject(){return subject;}
    public String getEmail(){return email;} public String getDisplayName(){return displayName;} public String getRole(){return role;} public String getStatus(){return status;}
}
