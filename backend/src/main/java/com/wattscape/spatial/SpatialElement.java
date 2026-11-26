package com.wattscape.spatial;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "spatial_elements")
public class SpatialElement extends BaseEntity {
    @Column(name="organization_id", nullable=false) private UUID organizationId;
    @Column(name="site_id", nullable=false) private UUID siteId;
    @Column(name="floor_id", nullable=false) private UUID floorId;
    @Column(name="plan_revision", nullable=false) private int planRevision;
    @Column(name="entity_type", nullable=false, length=16) private String entityType;
    @Column(name="room_id") private UUID roomId;
    @Column(name="asset_id") private UUID assetId;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false, columnDefinition="jsonb") private Map<String,Object> geometry;
    @Column(name="position_x", nullable=false, precision=14, scale=3) private BigDecimal positionX;
    @Column(name="position_y", nullable=false, precision=14, scale=3) private BigDecimal positionY;
    @Column(name="position_z", nullable=false, precision=14, scale=3) private BigDecimal positionZ;
    @Column(name="rotation_degrees", nullable=false, precision=8, scale=3) private BigDecimal rotationDegrees;
    @Column(nullable=false) private int version = 1;
    @Version @Column(name="lock_version", nullable=false) private long lockVersion;
    @Column(name="lifecycle_state", nullable=false, length=16) private String lifecycleState = "active";
    @Column(name="created_by", nullable=false, length=255) private String createdBy;
    @Column(name="updated_by", nullable=false, length=255) private String updatedBy;

    protected SpatialElement() {}
    public SpatialElement(UUID org, UUID site, UUID floor, int planRevision, String type, UUID roomId, UUID assetId,
                          Map<String,Object> geometry, BigDecimal x, BigDecimal y, BigDecimal z,
                          BigDecimal rotation, String actor) {
        this.organizationId=org; this.siteId=site; this.floorId=floor; this.planRevision=planRevision; this.entityType=type;
        this.roomId=roomId; this.assetId=assetId; this.geometry=Map.copyOf(geometry);
        this.positionX=x; this.positionY=y; this.positionZ=z; this.rotationDegrees=rotation;
        this.createdBy=actor; this.updatedBy=actor;
    }
    public void update(int planRevision, Map<String,Object> geometry, BigDecimal x, BigDecimal y, BigDecimal z,
                       BigDecimal rotation, String actor) {
        this.planRevision=planRevision; this.geometry=Map.copyOf(geometry); this.positionX=x; this.positionY=y; this.positionZ=z;
        this.rotationDegrees=rotation; this.updatedBy=actor; this.version++;
    }
    public void retire(String actor) { this.lifecycleState="retired"; this.updatedBy=actor; this.version++; }
    public Map<String,Object> snapshot() {
        return Map.ofEntries(Map.entry("id",getId().toString()), Map.entry("entityType",entityType),
            Map.entry("floorId",floorId.toString()), Map.entry("planRevision",planRevision), Map.entry("roomId",roomId == null ? "" : roomId.toString()),
            Map.entry("assetId",assetId == null ? "" : assetId.toString()), Map.entry("geometry",geometry),
            Map.entry("positionX",positionX), Map.entry("positionY",positionY), Map.entry("positionZ",positionZ),
            Map.entry("rotationDegrees",rotationDegrees), Map.entry("version",version), Map.entry("lifecycleState",lifecycleState));
    }
    public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;}
    public UUID getFloorId(){return floorId;} public int getPlanRevision(){return planRevision;} public String getEntityType(){return entityType;}
    public UUID getRoomId(){return roomId;} public UUID getAssetId(){return assetId;}
    public Map<String,Object> getGeometry(){return geometry;} public BigDecimal getPositionX(){return positionX;}
    public BigDecimal getPositionY(){return positionY;} public BigDecimal getPositionZ(){return positionZ;}
    public BigDecimal getRotationDegrees(){return rotationDegrees;} public int getVersion(){return version;}
    public String getLifecycleState(){return lifecycleState;} public String getCreatedBy(){return createdBy;}
    public String getUpdatedBy(){return updatedBy;}
}
