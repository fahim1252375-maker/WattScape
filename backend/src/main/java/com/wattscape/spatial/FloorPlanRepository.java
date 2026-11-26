package com.wattscape.spatial;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FloorPlanRepository extends JpaRepository<FloorPlan,UUID> {
    Optional<FloorPlan> findFirstByOrganizationIdAndSiteIdAndFloorIdAndActiveTrueOrderByRevisionDesc(UUID organizationId, UUID siteId, UUID floorId);
    List<FloorPlan> findAllByOrganizationIdAndFloorIdOrderByRevisionDesc(UUID organizationId, UUID floorId);
}
