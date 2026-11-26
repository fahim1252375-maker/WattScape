package com.wattscape.site;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity @Table(name="sites", uniqueConstraints=@UniqueConstraint(name="uq_site_org_code", columnNames={"organization_id","code"}))
public class Site extends BaseEntity {
    @Column(name="organization_id", nullable=false) private UUID organizationId;
    @Column(nullable=false,length=160) private String name;
    @Column(nullable=false,length=32) private String code;
    @Column(name="region_tag",length=80) private String regionTag;
    @Column(length=320) private String address;
    @Column(name="time_zone",nullable=false,length=80) private String timeZone;
    @Column(name="building_use",length=100) private String buildingUse;
    @Column(name="area_sqm",precision=14,scale=2) private BigDecimal areaSqm;
    @Column(nullable=false,length=24) private String status="commissioning";
    @Column(precision=10,scale=7) private BigDecimal latitude;
    @Column(precision=10,scale=7) private BigDecimal longitude;
    protected Site() {}
    public Site(UUID organizationId,String name,String code,String regionTag,String address,String timeZone,String buildingUse,BigDecimal areaSqm,BigDecimal latitude,BigDecimal longitude) {
      this.organizationId=organizationId;this.name=name;this.code=code;this.regionTag=regionTag;this.address=address;this.timeZone=timeZone;this.buildingUse=buildingUse;this.areaSqm=areaSqm;this.latitude=latitude;this.longitude=longitude;
    }
    public UUID getOrganizationId(){return organizationId;} public String getName(){return name;} public String getCode(){return code;} public String getRegionTag(){return regionTag;}
    public String getAddress(){return address;} public String getTimeZone(){return timeZone;} public String getBuildingUse(){return buildingUse;} public BigDecimal getAreaSqm(){return areaSqm;}
    public String getStatus(){return status;} public BigDecimal getLatitude(){return latitude;} public BigDecimal getLongitude(){return longitude;}
}
