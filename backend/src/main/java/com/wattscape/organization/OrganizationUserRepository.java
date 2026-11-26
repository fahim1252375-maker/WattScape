package com.wattscape.organization;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional; import java.util.UUID;
public interface OrganizationUserRepository extends JpaRepository<OrganizationUser,UUID> {
 Optional<OrganizationUser> findByIdAndOrganizationId(UUID id,UUID organizationId);
 Optional<OrganizationUser> findByOrganizationIdAndIssuerAndSubjectAndStatus(UUID organizationId,String issuer,String subject,String status);
 Optional<OrganizationUser> findByOrganizationIdAndIssuerAndSubject(UUID organizationId,String issuer,String subject);
 java.util.List<OrganizationUser> findAllByIssuerAndSubjectAndStatus(String issuer,String subject,String status);
 java.util.List<OrganizationUser> findAllByOrganizationIdAndStatusOrderByDisplayNameAsc(UUID organizationId,String status);
}
