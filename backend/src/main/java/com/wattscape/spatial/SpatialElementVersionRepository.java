package com.wattscape.spatial;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SpatialElementVersionRepository extends JpaRepository<SpatialElementVersion,UUID> {
    List<SpatialElementVersion> findAllByOrganizationIdAndSpatialElementIdOrderByVersionDesc(UUID organizationId, UUID spatialElementId);
}
