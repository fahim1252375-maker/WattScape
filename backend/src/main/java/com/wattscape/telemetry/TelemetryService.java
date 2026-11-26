package com.wattscape.telemetry;

import com.wattscape.asset.AssetRepository;
import com.wattscape.audit.AuditEvent;
import com.wattscape.audit.AuditEventRepository;
import com.wattscape.common.ApiException;
import com.wattscape.identity.TenantContext;
import com.wattscape.site.SiteService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TelemetryService {
    private static final SecureRandom RANDOM=new SecureRandom();
    private static final Map<String,String> UNITS=Map.of("energy_kwh","kWh","power_kw","kW","water_m3","m3","water_flow_lpm","L/min","temperature_c","°C","humidity_pct","%","voltage_v","V","current_a","A","co2_ppm","ppm","occupancy_count","people");
    private final SiteService sites; private final TenantContext tenant; private final AssetRepository assets;
    private final TelemetryDeviceRepository devices; private final TelemetryPointRepository points; private final AuditEventRepository audit;
    public TelemetryService(SiteService sites,TenantContext tenant,AssetRepository assets,TelemetryDeviceRepository devices,TelemetryPointRepository points,AuditEventRepository audit){
        this.sites=sites;this.tenant=tenant;this.assets=assets;this.devices=devices;this.points=points;this.audit=audit;
    }
    @Transactional
    public TelemetryDtos.DeviceCreated register(UUID siteId,TelemetryDtos.CreateDeviceRequest request,Authentication auth){
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin");
        var site=sites.requireSite(siteId,auth); UUID assetId=request.assetId();
        if(assetId!=null && assets.findByIdAndSiteIdAndOrganizationId(assetId,siteId,site.getOrganizationId()).isEmpty()) throw ApiException.badRequest("Asset does not belong to this site");
        String external=request.externalId().trim();
        if(devices.existsByOrganizationIdAndExternalId(site.getOrganizationId(),external)) throw ApiException.conflict("A device with this external ID already exists in the organization");
        byte[] raw=new byte[32]; RANDOM.nextBytes(raw); String secret=Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        TelemetryDevice d=devices.save(new TelemetryDevice(site.getOrganizationId(),siteId,assetId,external,request.displayName().trim(),"HTTPS",sha256(secret),member.getSubject()));
        audit.save(new AuditEvent(site.getOrganizationId(),member.getSubject(),"TELEMETRY_DEVICE_REGISTERED","telemetry_device",d.getId(),"allowed",MDC.get("requestId"),Map.of("siteId",siteId.toString(),"protocol","HTTPS")));
        return new TelemetryDtos.DeviceCreated(d.getId(),d.getExternalId(),d.getDisplayName(),d.getProtocol(),d.getStatus(),secret,d.getCreatedAt());
    }
    @Transactional(readOnly=true)
    public List<TelemetryDtos.DeviceResponse> listDevices(UUID siteId,Authentication auth){
        var site=sites.requireSite(siteId,auth);
        return devices.findAllByOrganizationIdAndSiteIdOrderByDisplayNameAsc(site.getOrganizationId(),siteId).stream().map(TelemetryDtos.DeviceResponse::from).toList();
    }
    @Transactional
    public void revokeDevice(UUID siteId,UUID deviceId,Authentication auth){
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin"); var site=sites.requireSite(siteId,auth);
        var d=devices.findByIdAndOrganizationIdAndSiteId(deviceId,site.getOrganizationId(),siteId).orElseThrow(()->ApiException.notFound("Telemetry device not found"));
        if(d.getStatus().equals("revoked")) return;
        d.revoke(); devices.save(d);
        audit.save(new AuditEvent(site.getOrganizationId(),member.getSubject(),"TELEMETRY_DEVICE_REVOKED","telemetry_device",d.getId(),"allowed",MDC.get("requestId"),Map.of()));
    }
    @Transactional
    public TelemetryDtos.IngestResponse ingest(UUID deviceId,String authorization,TelemetryDtos.IngestRequest request){
        if(authorization==null||!authorization.startsWith("Device ")||authorization.length()<12) throw ApiException.unauthorized("A valid device credential is required");
        String secret=authorization.substring(7).trim();
        TelemetryDevice device=devices.findByIdAndStatus(deviceId,"active").orElseThrow(()->ApiException.unauthorized("A valid device credential is required"));
        if(!MessageDigest.isEqual(sha256(secret).getBytes(StandardCharsets.US_ASCII),device.getSecretHash().getBytes(StandardCharsets.US_ASCII))) throw ApiException.unauthorized("A valid device credential is required");
        Instant now=Instant.now(), oldest=now.minus(365,ChronoUnit.DAYS), newest=now.plus(5,ChronoUnit.MINUTES);
        for(var m:request.measurements()) {
            String expected=UNITS.get(m.metricKey());
            if(expected==null||!expected.equals(m.unit())) throw ApiException.badRequest("Metric key and unit are not supported");
            if(!m.metricKey().equals("temperature_c") && m.value().signum()<0) throw ApiException.badRequest("This metric must be zero or positive");
            if(m.metricKey().equals("humidity_pct") && m.value().compareTo(java.math.BigDecimal.valueOf(100))>0) throw ApiException.badRequest("Humidity must be between 0 and 100 percent");
            if(m.metricKey().equals("occupancy_count") && m.value().stripTrailingZeros().scale()>0) throw ApiException.badRequest("Occupancy count must be a whole number");
            if(m.observedAt().isBefore(oldest)||m.observedAt().isAfter(newest)) throw ApiException.badRequest("Measurement timestamp is outside the accepted window");
            if(m.eventId()!=null&&!m.eventId().isBlank()&&m.eventId().length()>120) throw ApiException.badRequest("Event identifier is too long");
        }
        int accepted=0,duplicates=0;
        java.util.Set<String> seenInBatch=new java.util.HashSet<>();
        for(var m:request.measurements()) {
            String eventId=blankToNull(m.eventId());
            if(eventId!=null && (!seenInBatch.add(eventId) || points.existsByDeviceIdAndSourceEventId(deviceId,eventId))) {duplicates++;continue;}
            points.save(new TelemetryPoint(device.getOrganizationId(),device.getSiteId(),deviceId,device.getAssetId(),m.metricKey(),m.value(),m.unit(),m.quality()==null?"good":m.quality(),eventId,m.observedAt(),now));
            accepted++;
        }
        device.touch(now); devices.save(device);
        return new TelemetryDtos.IngestResponse(accepted,duplicates,now);
    }
    @Transactional(readOnly=true)
    public List<TelemetryDtos.PointResponse> history(UUID siteId,String metricKey,Instant from,Instant to,int limit,Authentication auth){
        var site=sites.requireSite(siteId,auth);
        if(from==null||to==null||!from.isBefore(to)||Duration.between(from,to).compareTo(Duration.ofDays(90))>0) throw ApiException.badRequest("A valid time range of at most 90 days is required");
        if(!UNITS.containsKey(metricKey)) throw ApiException.badRequest("Metric key is not supported");
        int safeLimit=Math.max(1,Math.min(limit,1000));
        return points.findAllByOrganizationIdAndSiteIdAndMetricKeyAndObservedAtBetweenOrderByObservedAtAsc(site.getOrganizationId(),siteId,metricKey,from,to,PageRequest.of(0,safeLimit)).stream().map(TelemetryDtos.PointResponse::from).toList();
    }
    @Transactional(readOnly=true)
    public List<TelemetryDtos.PointResponse> latest(UUID siteId,int limit,Authentication auth){
        var site=sites.requireSite(siteId,auth); int safeLimit=Math.max(1,Math.min(limit,500));
        return points.findAllByOrganizationIdAndSiteIdOrderByObservedAtDesc(site.getOrganizationId(),siteId,PageRequest.of(0,safeLimit)).stream().map(TelemetryDtos.PointResponse::from).toList();
    }
    private static String sha256(String raw){
        try {byte[] hash=MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));StringBuilder out=new StringBuilder(64);for(byte b:hash)out.append(String.format("%02x",b));return out.toString();}
        catch(Exception ex){throw new IllegalStateException("SHA-256 is unavailable",ex);}
    }
    private static String blankToNull(String s){return s==null||s.isBlank()?null:s.trim();}
}
