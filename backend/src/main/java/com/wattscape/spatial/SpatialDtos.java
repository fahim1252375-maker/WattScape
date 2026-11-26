package com.wattscape.spatial;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public final class SpatialDtos {
    private SpatialDtos() {}
    public record FloorPlanRequest(
        @NotBlank @Pattern(regexp="m|ft") String unit,
        @NotNull @DecimalMin("0.001") BigDecimal width,
        @NotNull @DecimalMin("0.001") BigDecimal height,
        BigDecimal originX,
        BigDecimal originY,
        @DecimalMin("-360") @DecimalMax("360") BigDecimal rotationDegrees,
        @Size(max=500) String planReference
    ) {}
    public record FloorPlanResponse(UUID id, UUID floorId, int revision, String coordinateSystem,
        String unit, BigDecimal width, BigDecimal height, BigDecimal originX, BigDecimal originY,
        BigDecimal rotationDegrees, String planReference, boolean active, Instant createdAt) {
        static FloorPlanResponse from(FloorPlan p) { return new FloorPlanResponse(p.getId(),p.getFloorId(),p.getRevision(),p.getCoordinateSystem(),p.getUnit(),p.getWidth(),p.getHeight(),p.getOriginX(),p.getOriginY(),p.getRotationDegrees(),p.getPlanReference(),p.isActive(),p.getCreatedAt()); }
    }
    public record SpatialElementRequest(
        @NotNull Map<String,Object> geometry,
        @NotNull @DecimalMin("-1000000") @DecimalMax("1000000") BigDecimal positionX,
        @NotNull @DecimalMin("-1000000") @DecimalMax("1000000") BigDecimal positionY,
        @DecimalMin("-1000000") @DecimalMax("1000000") BigDecimal positionZ,
        @DecimalMin("-360") @DecimalMax("360") BigDecimal rotationDegrees,
        @Min(0) Integer expectedVersion
    ) {}
    public record SpatialVersionResponse(UUID id,int version,String action,Map<String,Object> snapshot,String actorSubject,Instant createdAt) {
        static SpatialVersionResponse from(SpatialElementVersion v){return new SpatialVersionResponse(v.getId(),v.getVersion(),v.getAction(),v.getSnapshot(),v.getActorSubject(),v.getCreatedAt());}
    }
    public record SpatialElementResponse(UUID id, String entityType, int planRevision, UUID roomId, UUID assetId,
        Map<String,Object> geometry, BigDecimal positionX, BigDecimal positionY, BigDecimal positionZ,
        BigDecimal rotationDegrees, int version, String lifecycleState, Instant updatedAt) {
        static SpatialElementResponse from(SpatialElement e) { return new SpatialElementResponse(e.getId(),e.getEntityType(),e.getPlanRevision(),e.getRoomId(),e.getAssetId(),e.getGeometry(),e.getPositionX(),e.getPositionY(),e.getPositionZ(),e.getRotationDegrees(),e.getVersion(),e.getLifecycleState(),e.getUpdatedAt()); }
    }
}
