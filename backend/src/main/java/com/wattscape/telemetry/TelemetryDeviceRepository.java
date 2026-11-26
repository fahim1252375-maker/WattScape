package com.wattscape.telemetry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TelemetryDeviceRepository extends JpaRepository<TelemetryDevice,UUID> {
    Optional<TelemetryDevice> findByIdAndOrganizationIdAndSiteId(UUID id,UUID organizationId,UUID siteId);
    Optional<TelemetryDevice> findByIdAndStatus(UUID id,String status);
    boolean existsByOrganizationIdAndExternalId(UUID organizationId,String externalId);
    List<TelemetryDevice> findAllByOrganizationIdAndSiteIdOrderByDisplayNameAsc(UUID organizationId,UUID siteId);
}
