package com.wattscape.site;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class SiteDtos {
 private SiteDtos(){}
 public record CreateSiteRequest(@NotBlank @Size(max=160) String name,@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{2,32}") String code,
   @Size(max=80) String regionTag,@Size(max=320) String address,@NotBlank @Size(max=80) String timeZone,
   @Size(max=100) String buildingUse,@DecimalMin("0.01") @DecimalMax("100000000") BigDecimal areaSqm,
   @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,@DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
   @Size(max=160) String initialBuildingName){}
 public record SiteResponse(UUID id,String name,String code,String regionTag,String address,String timeZone,String buildingUse,BigDecimal areaSqm,String status,Instant createdAt,Instant updatedAt){
  public static SiteResponse from(Site s){return new SiteResponse(s.getId(),s.getName(),s.getCode(),s.getRegionTag(),s.getAddress(),s.getTimeZone(),s.getBuildingUse(),s.getAreaSqm(),s.getStatus(),s.getCreatedAt(),s.getUpdatedAt());}
 }
}
