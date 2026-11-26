package com.wattscape.analytics;

import com.wattscape.audit.AuditEvent;
import com.wattscape.audit.AuditEventRepository;
import com.wattscape.common.ApiException;
import com.wattscape.identity.TenantContext;
import com.wattscape.site.Site;
import com.wattscape.site.SiteService;
import com.wattscape.telemetry.TelemetryPoint;
import com.wattscape.telemetry.TelemetryPointRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnergyAnalyticsService {
    private static final int PAGE_SIZE=2000;
    private final SiteService sites; private final TenantContext tenant; private final TelemetryPointRepository points;
    private final EnergyFactorRepository factors; private final AuditEventRepository audit;
    public EnergyAnalyticsService(SiteService sites,TenantContext tenant,TelemetryPointRepository points,EnergyFactorRepository factors,AuditEventRepository audit){
        this.sites=sites;this.tenant=tenant;this.points=points;this.factors=factors;this.audit=audit;
    }
    @Transactional
    public AnalyticsDtos.FactorResponse setFactors(UUID siteId,AnalyticsDtos.FactorRequest request,Authentication auth){
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Energy/Sustainability Analyst");
        if(request.electricityCostPerKwh()==null && request.gridEmissionsKgPerKwh()==null && request.waterCostPerM3()==null)
            throw ApiException.badRequest("Configure at least one electricity, water, or emissions factor");
        Site site=sites.requireSite(siteId,auth);
        EnergyFactor factor=factors.save(new EnergyFactor(site.getOrganizationId(),siteId,request.effectiveFrom(),request.currency(),request.electricityCostPerKwh(),request.gridEmissionsKgPerKwh(),request.waterCostPerM3(),member.getSubject()));
        audit.save(new AuditEvent(site.getOrganizationId(),member.getSubject(),"ENERGY_FACTORS_CREATED","energy_factor",factor.getId(),"allowed",MDC.get("requestId"),Map.of("effectiveFrom",request.effectiveFrom().toString(),"currency",request.currency())));
        return AnalyticsDtos.FactorResponse.from(factor);
    }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public AnalyticsDtos.EnergySummary summarize(UUID siteId,Instant from,Instant to,Authentication auth){
        Site site=sites.requireSite(siteId,auth);
        if(from==null||to==null||!from.isBefore(to)||Duration.between(from,to).compareTo(Duration.ofDays(90))>0) throw ApiException.badRequest("A valid time range of at most 90 days is required");
        UUID org=site.getOrganizationId(); List<String> metricKeys=List.of("energy_kwh","water_m3","power_kw");
        long total=points.countByOrganizationIdAndSiteIdAndMetricKeyInAndObservedAtBetween(org,siteId,metricKeys,from,to);
        BigDecimal energy=BigDecimal.ZERO,water=BigDecimal.ZERO,powerSum=BigDecimal.ZERO,powerPeak=null;
        int energyN=0,waterN=0,powerN=0,goodSampleCount=0;
        ZoneId zone;
        try{zone=ZoneId.of(site.getTimeZone());}catch(Exception ex){zone=ZoneId.of("UTC");}
        Map<LocalDate,DailyAccumulator> days=new TreeMap<>();
        List<EnergyFactor> factorHistory=factors.findAllByOrganizationIdAndSiteIdAndEffectiveFromLessThanEqualOrderByEffectiveFromAsc(org,siteId,to);
        BigDecimal electricityCostTotal=BigDecimal.ZERO,waterCostTotal=BigDecimal.ZERO,emissionsTotal=BigDecimal.ZERO;
        List<String> caveats=new ArrayList<>();
        boolean electricityCovered=true,waterCovered=true,emissionsCovered=true;
        boolean currencyMixed=false; String usedCurrency=null; int factorCursor=0; EnergyFactor activeFactor=null;
        long processed=0;
        for(int page=0;processed<total;page++){
            List<TelemetryPoint> batch=points.findAllByOrganizationIdAndSiteIdAndMetricKeyInAndObservedAtBetweenOrderByObservedAtAscIdAsc(
                org,siteId,metricKeys,from,to,PageRequest.of(page,PAGE_SIZE));
            if(batch.isEmpty()) break;
            for(TelemetryPoint p:batch){
                processed++;
                if(!p.getQuality().equals("good")) continue;
                goodSampleCount++;
                while(factorCursor<factorHistory.size()&&!factorHistory.get(factorCursor).getEffectiveFrom().isAfter(p.getObservedAt())) activeFactor=factorHistory.get(factorCursor++);
                LocalDate date=p.getObservedAt().atZone(zone).toLocalDate(); DailyAccumulator d=days.computeIfAbsent(date,k->new DailyAccumulator());
                switch(p.getMetricKey()){
                    case "energy_kwh" -> {
                        energy=energy.add(p.getValue());energyN++;d.energy=d.energy.add(p.getValue());
                        if(activeFactor==null||activeFactor.getElectricityCostPerKwh()==null) electricityCovered=false;
                        else {electricityCostTotal=electricityCostTotal.add(p.getValue().multiply(activeFactor.getElectricityCostPerKwh()));usedCurrency=trackCurrency(usedCurrency,activeFactor.getCurrency());if(usedCurrency==null)currencyMixed=true;}
                        if(activeFactor==null||activeFactor.getGridEmissionsKgPerKwh()==null) emissionsCovered=false;
                        else emissionsTotal=emissionsTotal.add(p.getValue().multiply(activeFactor.getGridEmissionsKgPerKwh()));
                    }
                    case "water_m3" -> {
                        water=water.add(p.getValue());waterN++;d.water=d.water.add(p.getValue());
                        if(activeFactor==null||activeFactor.getWaterCostPerM3()==null) waterCovered=false;
                        else {waterCostTotal=waterCostTotal.add(p.getValue().multiply(activeFactor.getWaterCostPerM3()));usedCurrency=trackCurrency(usedCurrency,activeFactor.getCurrency());if(usedCurrency==null)currencyMixed=true;}
                    }
                    case "power_kw" -> {
                        powerSum=powerSum.add(p.getValue());powerN++;powerPeak=powerPeak==null?p.getValue():powerPeak.max(p.getValue());
                        d.powerSum=d.powerSum.add(p.getValue());d.powerN++;d.powerPeak=d.powerPeak==null?p.getValue():d.powerPeak.max(p.getValue());
                    }
                    default -> { }
                }
            }
            if(batch.size()<PAGE_SIZE) break;
        }
        if(processed<total) throw new IllegalStateException("Telemetry aggregate pagination ended before all matching records were processed");
        if(energyN==0){electricityCovered=false;emissionsCovered=false;}
        if(waterN==0) waterCovered=false;
        if(factorHistory.isEmpty()) caveat(caveats,"No effective site factors are configured for this period; cost and emissions estimates are unavailable.");
        else {
            if(energyN>0&&!electricityCovered)caveat(caveats,"Some energy readings have no effective electricity tariff; electricity cost is unavailable.");
            if(energyN>0&&!emissionsCovered)caveat(caveats,"Some energy readings have no effective grid emissions factor; estimated emissions are unavailable.");
            if(waterN>0&&!waterCovered)caveat(caveats,"Some water readings have no effective water tariff; water cost is unavailable.");
        }
        if(currencyMixed)caveat(caveats,"Multiple currencies apply within the selected period; monetary totals are suppressed rather than combined.");
        String currency=currencyMixed?null:usedCurrency;
        BigDecimal elecCost=!currencyMixed&&electricityCovered&&energyN>0?electricityCostTotal.setScale(2,RoundingMode.HALF_UP):null;
        BigDecimal waterCost=!currencyMixed&&waterCovered&&waterN>0?waterCostTotal.setScale(2,RoundingMode.HALF_UP):null;
        BigDecimal emissions=emissionsCovered&&energyN>0?emissionsTotal.setScale(3,RoundingMode.HALF_UP):null;
        List<AnalyticsDtos.DailyPoint> daily=days.entrySet().stream().map(entry->{var a=entry.getValue();return new AnalyticsDtos.DailyPoint(entry.getKey(),a.energy,a.water,a.powerN==0?null:a.powerSum.divide(BigDecimal.valueOf(a.powerN),3,RoundingMode.HALF_UP),a.powerPeak);}).toList();
        return new AnalyticsDtos.EnergySummary(from,to,currency,energy.setScale(3,RoundingMode.HALF_UP),water.setScale(3,RoundingMode.HALF_UP),
            powerN==0?null:powerSum.divide(BigDecimal.valueOf(powerN),3,RoundingMode.HALF_UP),powerPeak,elecCost,waterCost,emissions,energyN,waterN,powerN,goodSampleCount,false,List.copyOf(caveats),daily);
    }
    private static String trackCurrency(String current,String next){
        if(current==null)return next;
        return current.equals(next)?current:null;
    }
    private static void caveat(List<String> caveats,String message){if(!caveats.contains(message))caveats.add(message);}
    private static final class DailyAccumulator {BigDecimal energy=BigDecimal.ZERO,water=BigDecimal.ZERO,powerSum=BigDecimal.ZERO,powerPeak;int powerN;}
}
