package com.wattscape.building;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.List; import java.util.Optional; import java.util.UUID;
public interface BuildingRepository extends JpaRepository<Building,UUID> { List<Building> findAllBySiteIdAndOrganizationId(UUID siteId,UUID organizationId); Optional<Building> findByIdAndOrganizationIdAndSiteId(UUID id,UUID organizationId,UUID siteId); }
