package com.wattscape.room;
import com.wattscape.common.BaseEntity; import jakarta.persistence.*; import java.math.BigDecimal; import java.util.UUID;
@Entity @Table(name="rooms",uniqueConstraints=@UniqueConstraint(name="uq_room_site_code",columnNames={"site_id","code"}))
public class Room extends BaseEntity {
 @Column(name="organization_id",nullable=false) private UUID organizationId; @Column(name="site_id",nullable=false) private UUID siteId; @Column(name="floor_id",nullable=false) private UUID floorId;
 @Column(nullable=false,length=32) private String code; @Column(nullable=false,length=160) private String name; @Column(name="zone_type",nullable=false,length=24) private String zoneType; @Column(name="area_sqm",nullable=false,precision=12,scale=2) private BigDecimal areaSqm;
 @Column(name="model_state",nullable=false,length=24) private String modelState="draft"; @Column(name="provenance",nullable=false,length=80) private String provenance="operator_entered";
 protected Room(){} public Room(UUID org,UUID site,UUID floor,String code,String name,String zoneType,BigDecimal areaSqm){organizationId=org;siteId=site;floorId=floor;this.code=code;this.name=name;this.zoneType=zoneType;this.areaSqm=areaSqm;}
 public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;} public UUID getFloorId(){return floorId;} public String getCode(){return code;} public String getName(){return name;} public String getZoneType(){return zoneType;} public BigDecimal getAreaSqm(){return areaSqm;} public String getModelState(){return modelState;} public String getProvenance(){return provenance;}
}
