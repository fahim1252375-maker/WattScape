package com.wattscape.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.wattscape.analytics.EnergyAnalyticsService;
import com.wattscape.audit.AuditEvent;
import com.wattscape.audit.AuditEventRepository;
import com.wattscape.common.ApiException;
import com.wattscape.identity.TenantContext;
import com.wattscape.site.SiteService;
import com.wattscape.workorder.WorkOrderRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import java.net.URI;
import java.time.Duration;

@Service
public class AiGatewayService {
    private final boolean enabled; private final String apiKey; private final String baseUrl; private final String model;
    private final RestClient restClient; private final SiteService sites;
    private final TenantContext tenant; private final EnergyAnalyticsService analytics; private final WorkOrderRepository workOrders;
    private final AiUsageEventRepository usage; private final AuditEventRepository audit;
    public AiGatewayService(@Value("${wattscape.ai.enabled:false}") boolean enabled,
        @Value("${wattscape.ai.api-key:}") String apiKey,@Value("${wattscape.ai.base-url:https://api.openai.com}") String baseUrl,
        @Value("${wattscape.ai.model:gpt-4o-mini}") String model,RestClient.Builder clientBuilder,
        SiteService sites,TenantContext tenant,EnergyAnalyticsService analytics,WorkOrderRepository workOrders,
        AiUsageEventRepository usage,AuditEventRepository audit){
        this.enabled=enabled;this.apiKey=apiKey;this.baseUrl=validateBaseUrl(baseUrl);this.model=model;
        SimpleClientHttpRequestFactory requestFactory=new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(20));
        this.restClient=clientBuilder.requestFactory(requestFactory).build();this.sites=sites;this.tenant=tenant;
        this.analytics=analytics;this.workOrders=workOrders;this.usage=usage;this.audit=audit;
    }
    private static String validateBaseUrl(String value) {
        try {
            URI uri=URI.create(value.trim());
            String scheme=uri.getScheme(); String host=uri.getHost();
            boolean local=host!=null && (host.equalsIgnoreCase("localhost") || host.equals("127.0.0.1") || host.equals("::1"));
            if(uri.getUserInfo()!=null || host==null || !("https".equalsIgnoreCase(scheme) || (local && "http".equalsIgnoreCase(scheme))))
                throw new IllegalArgumentException("AI_BASE_URL must use HTTPS (HTTP is allowed only for localhost development)");
            return uri.toString().replaceAll("/+$","");
        } catch(RuntimeException ex) {
            throw new IllegalArgumentException("AI_BASE_URL is invalid; use an HTTPS OpenAI-compatible endpoint",ex);
        }
    }
    public AiDtos.ProviderInfo providerInfo(UUID siteId,Authentication auth){
        tenant.requireRole(auth,"Organization Owner","Organization Admin","Energy/Sustainability Analyst","Facilities Operator");
        sites.requireSite(siteId,auth);
        return new AiDtos.ProviderInfo(enabled && apiKey!=null && !apiKey.isBlank(),URI.create(baseUrl).getHost(),model);
    }
    public AiDtos.InsightResponse generate(UUID siteId,AiDtos.InsightRequest request,Authentication auth){
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Energy/Sustainability Analyst","Facilities Operator");
        var site=sites.requireSite(siteId,auth);
        if(usage.countByOrganizationIdAndActorSubjectAndCreatedAtAfter(site.getOrganizationId(),member.getSubject(),Instant.now().minus(1,ChronoUnit.HOURS))>=20)
            throw ApiException.tooManyRequests("AI insight request limit reached; try again later");
        if(!enabled||apiKey.isBlank()){
            usage.save(new AiUsageEvent(site.getOrganizationId(),siteId,member.getSubject(),"openai-compatible",model,request.task(),"disabled",null,null,0));
            throw ApiException.serviceUnavailable("Server-side AI is not configured for this environment");
        }
        Instant now=Instant.now(),from=now.minus(30,ChronoUnit.DAYS); long started=System.nanoTime();
        String provider=URI.create(baseUrl).getHost();
        try {
            var energy=analytics.summarize(siteId,from,now,auth);
            long openOrders=workOrders.countByOrganizationIdAndSiteIdAndStatusIn(site.getOrganizationId(),siteId,List.of("open","triaged","in_progress","blocked"));
            String context="Site-level operating summary (site name and organization identifiers are not shared)\nLast 30-day telemetry summary (only accepted measurements): energy kWh="+energy.energyKwh()+
                ", water m3="+energy.waterM3()+", average power kW="+energy.averagePowerKw()+
                ", peak power kW="+energy.peakPowerKw()+", measurement count="+energy.sampledPoints()+
                "\nOpen work orders: "+openOrders+"\nData caveats: "+String.join("; ",energy.caveats());
            String system="You are WattScape's facilities and energy analysis assistant. Use only the supplied context and clearly state uncertainty. Do not invent readings, savings, costs, emissions, root causes, or actions. Distinguish observed data from hypotheses. Give concise, practical recommendations for a human operator. Never claim to control equipment or execute work orders.";
            String user="Task: "+request.task()+"\nContext:\n"+context+"\nUser question: "+(request.question()==null?"Provide an evidence-based site review.":request.question().trim());
            Map<String,Object> payload=Map.of("model",model,"temperature",0.2,"max_tokens",700,"messages",List.of(
                Map.of("role","system","content",system),Map.of("role","user","content",user)));
            JsonNode response=restClient.post().uri(baseUrl+"/v1/chat/completions").contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION,"Bearer "+apiKey).body(payload).retrieve().body(JsonNode.class);
            JsonNode content=response==null?null:response.path("choices").path(0).path("message").path("content");
            if(content==null||!content.isTextual()||content.asText().isBlank()) throw new IllegalStateException("AI provider returned an empty response");
            JsonNode usageNode=response.path("usage"); Integer input=usageNode.path("prompt_tokens").isNumber()?usageNode.path("prompt_tokens").asInt():null;
            Integer output=usageNode.path("completion_tokens").isNumber()?usageNode.path("completion_tokens").asInt():null;
            long latency=(System.nanoTime()-started)/1_000_000;
            usage.save(new AiUsageEvent(site.getOrganizationId(),siteId,member.getSubject(),provider,model,request.task(),"success",input,output,latency));
            audit.save(new AuditEvent(site.getOrganizationId(),member.getSubject(),"AI_INSIGHT_GENERATED","site",siteId,"allowed",MDC.get("requestId"),Map.of("task",request.task(),"provider",provider,"model",model)));
            return new AiDtos.InsightResponse(siteId,request.task(),provider,model,content.asText().substring(0,Math.min(content.asText().length(),6000)),Instant.now(),latency,"AI output is advisory. Verify recommendations against site procedures and source measurements.");
        } catch(org.springframework.web.client.RestClientException ex){
            long latency=(System.nanoTime()-started)/1_000_000;
            usage.save(new AiUsageEvent(site.getOrganizationId(),siteId,member.getSubject(),provider,model,request.task(),"failed",null,null,latency));
            throw ApiException.serviceUnavailable("AI provider is temporarily unavailable");
        } catch(ApiException ex){throw ex;}
        catch(Exception ex){
            long latency=(System.nanoTime()-started)/1_000_000;
            usage.save(new AiUsageEvent(site.getOrganizationId(),siteId,member.getSubject(),provider,model,request.task(),"failed",null,null,latency));
            throw ApiException.serviceUnavailable("AI insight could not be generated");
        }
    }
}
