package com.wattscape.organization;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.*;

@Entity @Table(name="organizations")
public class Organization extends BaseEntity {
    @Column(nullable=false, length=160) private String name;
    @Column(name="legal_name", nullable=false, length=240) private String legalName;
    @Column(name="default_currency", nullable=false, length=3) private String defaultCurrency = "USD";
    @Column(name="unit_system", nullable=false, length=16) private String unitSystem = "metric";
    @Column(name="time_zone_policy", nullable=false, length=80) private String timeZonePolicy = "UTC";
    @Column(nullable=false, length=16) private String locale = "en-US";
    @Column(name="retention_days", nullable=false) private int retentionDays = 365;
    @Column(nullable=false, length=80) private String region = "unspecified";
    protected Organization() {}
    public Organization(String name,String legalName){this.name=name;this.legalName=legalName;}
    public String getName(){return name;} public String getLegalName(){return legalName;} public String getDefaultCurrency(){return defaultCurrency;}
    public String getUnitSystem(){return unitSystem;} public String getTimeZonePolicy(){return timeZonePolicy;} public String getLocale(){return locale;}
    public int getRetentionDays(){return retentionDays;} public String getRegion(){return region;}
}
