package com.wattscape.floor;
import com.wattscape.common.BaseEntity; import jakarta.persistence.*; import java.math.BigDecimal; import java.util.UUID;
@Entity @Table(name="floors",uniqueConstraints=@UniqueConstraint(name="uq_floor_building_level",columnNames={"building_id","level_number"}))
public class Floor extends BaseEntity {
 @Column(name="organization_id",nullable=false) private UUID organizationId; @Column(name="site_id",nullable=false) private UUID siteId; @Column(name="building_id",nullable=false) private UUID buildingId;
 @Column(name="level_number",nullable=false) private int levelNumber; @Column(nullable=false,length=100) private String name; @Column(name="elevation_m",precision=8,scale=2) private BigDecimal elevationM; @Column(name="area_sqm",precision=12,scale=2) private BigDecimal areaSqm; @Column(name="model_state",nullable=false,length=24) private String modelState="draft";
 protected Floor(){} public Floor(UUID org,UUID site,UUID building,int level,String name,BigDecimal elevation,BigDecimal area){organizationId=org;siteId=site;buildingId=building;levelNumber=level;this.name=name;elevationM=elevation;areaSqm=area;} public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;} public UUID getBuildingId(){return buildingId;} public int getLevelNumber(){return levelNumber;} public String getName(){return name;} public BigDecimal getElevationM(){return elevationM;} public BigDecimal getAreaSqm(){return areaSqm;}
}
