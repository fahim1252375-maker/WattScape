package com.wattscape.room;
import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.time.Instant; import java.util.UUID;
public final class RoomDtos {
 private RoomDtos(){}
 public record CreateRoomRequest(@NotNull UUID floorId,@NotBlank @Size(max=32) String code,@NotBlank @Size(max=160) String name,@NotBlank @Pattern(regexp="lab|office|plant|lobby|storage|server|corridor") String zoneType,@NotNull @DecimalMin("0.01") @DecimalMax("10000") BigDecimal areaSqm){}
 public record RoomResponse(UUID id,UUID floorId,String code,String name,String zoneType,BigDecimal areaSqm,String modelState,String provenance,Instant createdAt,Instant updatedAt){public static RoomResponse from(Room r){return new RoomResponse(r.getId(),r.getFloorId(),r.getCode(),r.getName(),r.getZoneType(),r.getAreaSqm(),r.getModelState(),r.getProvenance(),r.getCreatedAt(),r.getUpdatedAt());}}
}
