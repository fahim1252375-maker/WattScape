package com.wattscape.analytics;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class AnalyticsDtos {
    private AnalyticsDtos() {}
    public record FactorRequest(@NotNull Instant effectiveFrom,@NotBlank @Pattern(regexp="[A-Z]{3}") String currency,
        @DecimalMin("0") BigDecimal electricityCostPerKwh,@DecimalMin("0") BigDecimal gridEmissionsKgPerKwh,
        @DecimalMin("0") BigDecimal waterCostPerM3) {}
    public record FactorResponse(Instant effectiveFrom,String currency,BigDecimal electricityCostPerKwh,
        BigDecimal gridEmissionsKgPerKwh,BigDecimal waterCostPerM3) {
        static FactorResponse from(EnergyFactor f){return new FactorResponse(f.getEffectiveFrom(),f.getCurrency(),f.getElectricityCostPerKwh(),f.getGridEmissionsKgPerKwh(),f.getWaterCostPerM3());}
    }
    public record DailyPoint(LocalDate date,BigDecimal energyKwh,BigDecimal waterM3,BigDecimal averagePowerKw,BigDecimal peakPowerKw) {}
    public record EnergySummary(Instant from,Instant to,String currency,BigDecimal energyKwh,BigDecimal waterM3,
        BigDecimal averagePowerKw,BigDecimal peakPowerKw,BigDecimal electricityCost,BigDecimal waterCost,
        BigDecimal estimatedEmissionsKg,int energySamples,int waterSamples,int powerSamples,int sampledPoints,
        boolean truncated,List<String> caveats,List<DailyPoint> daily) {}
}
