package com.wattscape.ai;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AiUsageEventRepository extends JpaRepository<AiUsageEvent,UUID> {
    long countByOrganizationIdAndActorSubjectAndCreatedAtAfter(UUID organizationId,String actorSubject,Instant after);
}
