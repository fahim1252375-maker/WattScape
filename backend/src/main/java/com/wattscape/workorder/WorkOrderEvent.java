package com.wattscape.workorder;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(name="work_order_events")
public class WorkOrderEvent extends BaseEntity {
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="work_order_id",nullable=false) private UUID workOrderId;
    @Column(name="event_type",nullable=false,length=32) private String eventType;
    @Column(name="from_status",length=16) private String fromStatus;
    @Column(name="to_status",length=16) private String toStatus;
    @Column(name="actor_subject",nullable=false,length=255) private String actorSubject;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false,columnDefinition="jsonb") private Map<String,Object> details;
    protected WorkOrderEvent() {}
    public WorkOrderEvent(UUID org,UUID order,String type,String from,String to,String actor,Map<String,Object> details){
        this.organizationId=org;this.workOrderId=order;this.eventType=type;this.fromStatus=from;this.toStatus=to;this.actorSubject=actor;this.details=Map.copyOf(details);
    }
    public UUID getOrganizationId(){return organizationId;} public UUID getWorkOrderId(){return workOrderId;}
    public String getEventType(){return eventType;} public String getFromStatus(){return fromStatus;} public String getToStatus(){return toStatus;}
    public String getActorSubject(){return actorSubject;} public Map<String,Object> getDetails(){return details;}
}
