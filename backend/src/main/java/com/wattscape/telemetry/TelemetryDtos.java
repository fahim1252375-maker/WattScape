package com.wattscape.telemetry;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class TelemetryDtos {
    private TelemetryDtos() {}
    public record CreateDeviceRequest(@NotBlank @Size(max=120) @Pattern(regexp="[A-Za-z0-9._:-]+") String externalId,
        @NotBlank @Size(max=160) String displayName,@NotBlank @Pattern(regexp="HTTPS") String protocol,UUID assetId) {}
    public record DeviceCreated(UUID id,String externalId,String displayName,String protocol,String status,String ingestSecret,Instant createdAt) {}
    public record DeviceResponse(UUID id,UUID siteId,UUID assetId,String externalId,String displayName,String protocol,String status,Instant lastSeenAt,Instant createdAt) {
        static DeviceResponse from(TelemetryDevice d){return new DeviceResponse(d.getId(),d.getSiteId(),d.getAssetId(),d.getExternalId(),d.getDisplayName(),d.getProtocol(),d.getStatus(),d.getLastSeenAt(),d.getCreatedAt());}
    }
    public record MeasurementInput(@NotBlank @Pattern(regexp="[a-z][a-z0-9_.-]{1,63}") String metricKey,
        @NotNull @DecimalMin("-1000000000000") @DecimalMax("1000000000000") BigDecimal value,
        @NotBlank @Size(max=24) String unit,@Pattern(regexp="good|uncertain|bad") String quality,
        @NotNull Instant observedAt,@Size(max=120) String eventId) {}
    public record IngestRequest(@NotNull @Size(min=1,max=250) List<@Valid MeasurementInput> measurements) {}
    public record IngestResponse(int accepted,int duplicates,Instant receivedAt) {}
    public record PointResponse(UUID id,UUID deviceId,UUID assetId,String metricKey,BigDecimal value,String unit,String quality,Instant observedAt,Instant receivedAt) {
        static PointResponse from(TelemetryPoint p){return new PointResponse(p.getId(),p.getDeviceId(),p.getAssetId(),p.getMetricKey(),p.getValue(),p.getUnit(),p.getQuality(),p.getObservedAt(),p.getReceivedAt());}
    }
}
