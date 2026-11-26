package com.wattscape.building;
import com.wattscape.common.BaseEntity; import jakarta.persistence.*; import java.util.UUID;
@Entity @Table(name="buildings",uniqueConstraints=@UniqueConstraint(name="uq_building_site_code",columnNames={"site_id","code"}))
public class Building extends BaseEntity {
 @Column(name="organization_id",nullable=false) private UUID organizationId; @Column(name="site_id",nullable=false) private UUID siteId;
 @Column(nullable=false,length=32) private String code; @Column(nullable=false,length=160) private String name; @Column(name="model_state",nullable=false,length=24) private String modelState="draft";
 protected Building(){} public Building(UUID org,UUID site,String code,String name){organizationId=org;siteId=site;this.code=code;this.name=name;}
 public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;} public String getCode(){return code;} public String getName(){return name;}
}
