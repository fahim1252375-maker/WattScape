package com.wattscape.twin;
import com.wattscape.common.BaseEntity; import jakarta.persistence.*; import java.util.UUID;
@Entity @Table(name="twin_nodes",uniqueConstraints=@UniqueConstraint(name="uq_twin_node_org_kind_source",columnNames={"organization_id","kind","source_id"}))
public class TwinNode extends BaseEntity {
 @Column(name="organization_id",nullable=false) private UUID organizationId; @Column(name="site_id") private UUID siteId; @Column(nullable=false,length=32) private String kind; @Column(nullable=false,length=200) private String name; @Column(name="lifecycle_state",nullable=false,length=24) private String lifecycleState="active"; @Column(name="source_id",nullable=false,length=120) private String sourceId;
 protected TwinNode(){} public TwinNode(UUID org,UUID site,String kind,String name,String sourceId){organizationId=org;siteId=site;this.kind=kind;this.name=name;this.sourceId=sourceId;} public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;} public String getKind(){return kind;} public String getName(){return name;} public String getLifecycleState(){return lifecycleState;} public String getSourceId(){return sourceId;}
}
