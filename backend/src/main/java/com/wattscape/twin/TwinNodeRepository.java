package com.wattscape.twin;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.List; import java.util.UUID;
public interface TwinNodeRepository extends JpaRepository<TwinNode,UUID> { List<TwinNode> findAllBySiteIdAndOrganizationIdOrderByKindAscNameAsc(UUID siteId,UUID organizationId); }
