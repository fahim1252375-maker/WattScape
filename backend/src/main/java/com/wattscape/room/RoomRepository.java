package com.wattscape.room;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.List; import java.util.UUID;
public interface RoomRepository extends JpaRepository<Room,UUID> { java.util.Optional<Room> findByIdAndSiteIdAndOrganizationId(UUID id,UUID siteId,UUID organizationId); List<Room> findAllBySiteIdAndOrganizationIdOrderByCode(UUID siteId,UUID organizationId); }
