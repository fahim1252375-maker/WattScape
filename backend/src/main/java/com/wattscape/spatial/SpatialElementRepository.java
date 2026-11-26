package com.wattscape.spatial;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SpatialElementRepository extends JpaRepository<SpatialElement,UUID> {
    List<SpatialElement> findAllByOrganizationIdAndSiteIdAndFloorIdAndLifecycleStateOrderByEntityTypeAscCreatedAtAsc(UUID organizationId, UUID siteId, UUID floorId, String lifecycleState);
    Optional<SpatialElement> findByOrganizationIdAndSiteIdAndFloorIdAndEntityTypeAndRoomIdAndLifecycleState(UUID organizationId, UUID siteId, UUID floorId, String entityType, UUID roomId, String lifecycleState);
    Optional<SpatialElement> findByOrganizationIdAndSiteIdAndFloorIdAndEntityTypeAndAssetIdAndLifecycleState(UUID organizationId, UUID siteId, UUID floorId, String entityType, UUID assetId, String lifecycleState);
}
