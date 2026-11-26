package com.wattscape.telemetry;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="telemetry_points")
public class TelemetryPoint extends BaseEntity {
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="site_id",nullable=false) private UUID siteId;
    @Column(name="device_id",nullable=false) private UUID deviceId;
    @Column(name="asset_id") private UUID assetId;
    @Column(name="metric_key",nullable=false,length=64) private String metricKey;
    @Column(nullable=false,precision=20,scale=6) private BigDecimal value;
    @Column(nullable=false,length=24) private String unit;
    @Column(nullable=false,length=16) private String quality;
    @Column(name="source_event_id",length=120) private String sourceEventId;
    @Column(name="observed_at",nullable=false) private Instant observedAt;
    @Column(name="received_at",nullable=false) private Instant receivedAt;
    protected TelemetryPoint() {}
    public TelemetryPoint(UUID org,UUID site,UUID device,UUID asset,String key,BigDecimal value,String unit,String quality,String eventId,Instant observedAt,Instant receivedAt){
        this.organizationId=org;this.siteId=site;this.deviceId=device;this.assetId=asset;this.metricKey=key;this.value=value;
        this.unit=unit;this.quality=quality;this.sourceEventId=eventId;this.observedAt=observedAt;this.receivedAt=receivedAt;
    }
    public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;}
    public UUID getDeviceId(){return deviceId;} public UUID getAssetId(){return assetId;}
    public String getMetricKey(){return metricKey;} public BigDecimal getValue(){return value;}
    public String getUnit(){return unit;} public String getQuality(){return quality;}
    public String getSourceEventId(){return sourceEventId;} public Instant getObservedAt(){return observedAt;}
    public Instant getReceivedAt(){return receivedAt;}
}
