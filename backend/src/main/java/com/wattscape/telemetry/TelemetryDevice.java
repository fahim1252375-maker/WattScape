package com.wattscape.telemetry;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="telemetry_devices")
public class TelemetryDevice extends BaseEntity {
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="site_id",nullable=false) private UUID siteId;
    @Column(name="asset_id") private UUID assetId;
    @Column(name="external_id",nullable=false,length=120) private String externalId;
    @Column(name="display_name",nullable=false,length=160) private String displayName;
    @Column(nullable=false,length=16) private String protocol;
    @Column(nullable=false,length=16) private String status="active";
    @Column(name="secret_hash",nullable=false,length=64) private String secretHash;
    @Column(name="last_seen_at") private Instant lastSeenAt;
    @Column(name="created_by",nullable=false,length=255) private String createdBy;
    protected TelemetryDevice() {}
    public TelemetryDevice(UUID org,UUID site,UUID asset,String externalId,String name,String protocol,String secretHash,String actor){
        this.organizationId=org;this.siteId=site;this.assetId=asset;this.externalId=externalId;this.displayName=name;
        this.protocol=protocol;this.secretHash=secretHash;this.createdBy=actor;
    }
    public void revoke(){status="revoked";}
    public void touch(Instant at){lastSeenAt=at;}
    public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;}
    public UUID getAssetId(){return assetId;} public String getExternalId(){return externalId;}
    public String getDisplayName(){return displayName;} public String getProtocol(){return protocol;}
    public String getStatus(){return status;} public String getSecretHash(){return secretHash;}
    public Instant getLastSeenAt(){return lastSeenAt;} public String getCreatedBy(){return createdBy;}
}
