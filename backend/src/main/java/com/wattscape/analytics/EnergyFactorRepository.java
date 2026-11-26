package com.wattscape.analytics;
import java.time.Instant;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface EnergyFactorRepository extends JpaRepository<EnergyFactor,UUID> {
    Optional<EnergyFactor> findFirstByOrganizationIdAndSiteIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(UUID organizationId,UUID siteId,Instant at);
    List<EnergyFactor> findAllByOrganizationIdAndSiteIdAndEffectiveFromLessThanEqualOrderByEffectiveFromAsc(UUID organizationId,UUID siteId,Instant at);
}
