package com.wattscape.spatial;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "spatial_element_versions")
public class SpatialElementVersion extends BaseEntity {
    @Column(name="organization_id", nullable=false) private UUID organizationId;
    @Column(name="spatial_element_id", nullable=false) private UUID spatialElementId;
    @Column(nullable=false) private int version;
    @Column(nullable=false, length=16) private String action;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false, columnDefinition="jsonb") private Map<String,Object> snapshot;
    @Column(name="actor_subject", nullable=false, length=255) private String actorSubject;
    protected SpatialElementVersion() {}
    public SpatialElementVersion(UUID org, UUID element, int version, String action, Map<String,Object> snapshot, String actor) {
        this.organizationId=org; this.spatialElementId=element; this.version=version;
        this.action=action; this.snapshot=Map.copyOf(snapshot); this.actorSubject=actor;
    }
    public UUID getOrganizationId(){return organizationId;} public UUID getSpatialElementId(){return spatialElementId;}
    public int getVersion(){return version;} public String getAction(){return action;} public Map<String,Object> getSnapshot(){return snapshot;}
    public String getActorSubject(){return actorSubject;}
}
