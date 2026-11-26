package com.wattscape.workorder;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface WorkOrderEventRepository extends JpaRepository<WorkOrderEvent,UUID> {
    List<WorkOrderEvent> findAllByOrganizationIdAndWorkOrderIdOrderByCreatedAtDesc(UUID organizationId,UUID workOrderId);
}
