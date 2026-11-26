package com.wattscape.ai;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity @Table(name="ai_usage_events")
public class AiUsageEvent extends BaseEntity {
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="site_id",nullable=false) private UUID siteId;
    @Column(name="actor_subject",nullable=false,length=255) private String actorSubject;
    @Column(nullable=false,length=40) private String provider;
    @Column(nullable=false,length=120) private String model;
    @Column(nullable=false,length=48) private String task;
    @Column(nullable=false,length=16) private String outcome;
    @Column(name="input_tokens") private Integer inputTokens;
    @Column(name="output_tokens") private Integer outputTokens;
    @Column(name="latency_ms",nullable=false) private long latencyMs;
    protected AiUsageEvent() {}
    public AiUsageEvent(UUID org,UUID site,String actor,String provider,String model,String task,String outcome,Integer input,Integer output,long latency){
        this.organizationId=org;this.siteId=site;this.actorSubject=actor;this.provider=provider;this.model=model;this.task=task;
        this.outcome=outcome;this.inputTokens=input;this.outputTokens=output;this.latencyMs=latency;
    }
}
