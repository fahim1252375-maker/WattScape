package com.wattscape.site;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.List; import java.util.Optional; import java.util.UUID;
public interface SiteRepository extends JpaRepository<Site,UUID> { List<Site> findAllByOrganizationIdOrderByName(UUID organizationId); Optional<Site> findByIdAndOrganizationId(UUID id,UUID organizationId); boolean existsByOrganizationIdAndCode(UUID organizationId,String code); }
