package com.wattscape.spatial;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "floor_plans")
public class FloorPlan extends BaseEntity {
    @Column(name = "organization_id", nullable = false) private UUID organizationId;
    @Column(name = "site_id", nullable = false) private UUID siteId;
    @Column(name = "floor_id", nullable = false) private UUID floorId;
    @Column(nullable = false) private int revision;
    @Column(name = "coordinate_system", nullable = false, length = 32) private String coordinateSystem;
    @Column(nullable = false, length = 8) private String unit;
    @Column(nullable = false, precision = 14, scale = 3) private BigDecimal width;
    @Column(nullable = false, precision = 14, scale = 3) private BigDecimal height;
    @Column(name = "origin_x", nullable = false, precision = 14, scale = 3) private BigDecimal originX;
    @Column(name = "origin_y", nullable = false, precision = 14, scale = 3) private BigDecimal originY;
    @Column(name = "rotation_degrees", nullable = false, precision = 8, scale = 3) private BigDecimal rotationDegrees;
    @Column(name = "plan_reference", length = 500) private String planReference;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    @Column(name = "created_by", nullable = false, length = 255) private String createdBy;

    protected FloorPlan() {}
    public FloorPlan(UUID org, UUID site, UUID floor, int revision, String unit, BigDecimal width,
                     BigDecimal height, BigDecimal originX, BigDecimal originY,
                     BigDecimal rotationDegrees, String planReference, String actor) {
        this.organizationId = org; this.siteId = site; this.floorId = floor; this.revision = revision;
        this.coordinateSystem = "LOCAL_CARTESIAN"; this.unit = unit; this.width = width; this.height = height;
        this.originX = originX; this.originY = originY; this.rotationDegrees = rotationDegrees;
        this.planReference = planReference; this.createdBy = actor;
    }
    public void deactivate() { this.active = false; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getSiteId() { return siteId; }
    public UUID getFloorId() { return floorId; }
    public int getRevision() { return revision; }
    public String getCoordinateSystem() { return coordinateSystem; }
    public String getUnit() { return unit; }
    public BigDecimal getWidth() { return width; }
    public BigDecimal getHeight() { return height; }
    public BigDecimal getOriginX() { return originX; }
    public BigDecimal getOriginY() { return originY; }
    public BigDecimal getRotationDegrees() { return rotationDegrees; }
    public String getPlanReference() { return planReference; }
    public boolean isActive() { return active; }
    public String getCreatedBy() { return createdBy; }
}
