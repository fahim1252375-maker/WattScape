package com.wattscape.asset;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.List; import java.util.UUID;
public interface AssetRepository extends JpaRepository<Asset,UUID> { java.util.Optional<Asset> findByIdAndSiteIdAndOrganizationId(UUID id,UUID siteId,UUID organizationId); boolean existsByOrganizationIdAndSourceId(UUID organizationId,String sourceId); List<Asset> findAllBySiteIdAndOrganizationIdOrderByName(UUID siteId,UUID organizationId); }
