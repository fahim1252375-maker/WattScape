package com.wattscape.floor;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.List; import java.util.Optional; import java.util.UUID;
public interface FloorRepository extends JpaRepository<Floor,UUID> { List<Floor> findAllByOrganizationIdAndBuildingIdOrderByLevelNumber(UUID organizationId,UUID buildingId); Optional<Floor> findByIdAndOrganizationId(UUID id,UUID organizationId); }
