package com.wattscape.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class AiDtos {
    private AiDtos() {}
    public record InsightRequest(@NotBlank @Pattern(regexp="energy_review|maintenance_review") String task,
        @Size(max=800) String question) {}
    public record InsightResponse(UUID siteId,String task,String provider,String model,String insight,
        Instant generatedAt,long latencyMs,String advisoryNote) {}
    public record ProviderInfo(boolean enabled,String provider,String model) {}
}
