package com.wattscape.twin;
import com.wattscape.common.BaseEntity; import jakarta.persistence.*; import java.util.UUID; import java.util.Map; import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
@Entity @Table(name="twin_edges",uniqueConstraints=@UniqueConstraint(name="uq_twin_edge",columnNames={"organization_id","source_node_id","target_node_id","edge_type"}))
public class TwinEdge extends BaseEntity {
 @Column(name="organization_id",nullable=false) private UUID organizationId; @Column(name="source_node_id",nullable=false) private UUID sourceNodeId; @Column(name="target_node_id",nullable=false) private UUID targetNodeId; @Column(name="edge_type",nullable=false,length=32) private String edgeType; @JdbcTypeCode(SqlTypes.JSON) @Column(name="attributes",columnDefinition="jsonb",nullable=false) private Map<String,Object> attributes=Map.of();
 protected TwinEdge(){} public TwinEdge(UUID org,UUID source,UUID target,String type){organizationId=org;sourceNodeId=source;targetNodeId=target;edgeType=type;} public UUID getOrganizationId(){return organizationId;} public UUID getSourceNodeId(){return sourceNodeId;} public UUID getTargetNodeId(){return targetNodeId;} public String getEdgeType(){return edgeType;} public Map<String,Object> getAttributes(){return attributes;}
}
