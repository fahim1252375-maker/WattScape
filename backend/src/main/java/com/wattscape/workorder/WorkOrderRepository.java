package com.wattscape.workorder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface WorkOrderRepository extends JpaRepository<WorkOrder,UUID> {
    List<WorkOrder> findTop500ByOrganizationIdAndSiteIdOrderByCreatedAtDesc(UUID organizationId,UUID siteId);
    List<WorkOrder> findTop500ByOrganizationIdAndSiteIdAndStatusOrderByCreatedAtDesc(UUID organizationId,UUID siteId,String status);
    Optional<WorkOrder> findByIdAndOrganizationIdAndSiteId(UUID id,UUID organizationId,UUID siteId);
    long countByOrganizationIdAndSiteIdAndStatusIn(UUID organizationId,UUID siteId,List<String> statuses);
}
