package com.wattscape.organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
public interface OrganizationInvitationRepository extends JpaRepository<OrganizationInvitation,UUID> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select i from OrganizationInvitation i where i.tokenHash=:hash") Optional<OrganizationInvitation> findLockedByHash(@Param("hash") String hash);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select i from OrganizationInvitation i where i.id=:id and i.organizationId=:organizationId") Optional<OrganizationInvitation> findLockedByIdAndOrganizationId(@Param("id") UUID id,@Param("organizationId") UUID organizationId);
}
