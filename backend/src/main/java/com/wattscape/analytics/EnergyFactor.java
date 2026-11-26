package com.wattscape.analytics;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="energy_factors")
public class EnergyFactor extends BaseEntity {
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="site_id",nullable=false) private UUID siteId;
    @Column(name="effective_from",nullable=false) private Instant effectiveFrom;
    @Column(nullable=false,length=3) private String currency;
    @Column(name="electricity_cost_per_kwh",precision=14,scale=6) private BigDecimal electricityCostPerKwh;
    @Column(name="grid_emissions_kg_per_kwh",precision=14,scale=8) private BigDecimal gridEmissionsKgPerKwh;
    @Column(name="water_cost_per_m3",precision=14,scale=6) private BigDecimal waterCostPerM3;
    @Column(name="created_by",nullable=false,length=255) private String createdBy;
    protected EnergyFactor() {}
    public EnergyFactor(UUID org,UUID site,Instant effective,String currency,BigDecimal cost,BigDecimal emissions,BigDecimal water,String actor){
        this.organizationId=org;this.siteId=site;this.effectiveFrom=effective;this.currency=currency;this.electricityCostPerKwh=cost;
        this.gridEmissionsKgPerKwh=emissions;this.waterCostPerM3=water;this.createdBy=actor;
    }
    public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;} public Instant getEffectiveFrom(){return effectiveFrom;}
    public String getCurrency(){return currency;} public BigDecimal getElectricityCostPerKwh(){return electricityCostPerKwh;}
    public BigDecimal getGridEmissionsKgPerKwh(){return gridEmissionsKgPerKwh;} public BigDecimal getWaterCostPerM3(){return waterCostPerM3;}
}
