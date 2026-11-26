package com.wattscape.telemetry;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TelemetryPointRepository extends JpaRepository<TelemetryPoint,UUID> {
    boolean existsByDeviceIdAndSourceEventId(UUID deviceId,String sourceEventId);
    List<TelemetryPoint> findAllByOrganizationIdAndSiteIdOrderByObservedAtDesc(UUID organizationId,UUID siteId,Pageable pageable);
    List<TelemetryPoint> findAllByOrganizationIdAndSiteIdAndMetricKeyAndObservedAtBetweenOrderByObservedAtAsc(UUID organizationId,UUID siteId,String metricKey,Instant from,Instant to,Pageable pageable);
    List<TelemetryPoint> findAllByOrganizationIdAndSiteIdAndMetricKeyInAndObservedAtBetweenOrderByObservedAtAscIdAsc(UUID organizationId,UUID siteId,List<String> metricKeys,Instant from,Instant to,Pageable pageable);
    long countByOrganizationIdAndSiteIdAndMetricKeyInAndObservedAtBetween(UUID organizationId,UUID siteId,List<String> metricKeys,Instant from,Instant to);
}
