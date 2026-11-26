package com.wattscape.workorder;

import com.wattscape.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="work_orders")
public class WorkOrder extends BaseEntity {
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="site_id",nullable=false) private UUID siteId;
    @Column(name="asset_id") private UUID assetId;
    @Column(nullable=false,length=180) private String title;
    @Column(length=4000) private String description;
    @Column(nullable=false,length=16) private String priority="medium";
    @Column(nullable=false,length=16) private String status="open";
    @Column(name="due_at") private Instant dueAt;
    @Column(name="assignee_subject",length=255) private String assigneeSubject;
    @Column(name="assignee_name",length=160) private String assigneeName;
    @Column(name="created_by",nullable=false,length=255) private String createdBy;
    @Column(name="updated_by",nullable=false,length=255) private String updatedBy;
    @Column(nullable=false) private int version=1;
    @Version @Column(name="lock_version", nullable=false) private long lockVersion;
    protected WorkOrder() {}
    public WorkOrder(UUID org,UUID site,UUID asset,String title,String description,String priority,Instant dueAt,String actor){
        this.organizationId=org;this.siteId=site;this.assetId=asset;this.title=title;this.description=description;
        this.priority=priority;this.dueAt=dueAt;this.createdBy=actor;this.updatedBy=actor;
    }
    public void assignInitially(String subject,String name){this.assigneeSubject=subject;this.assigneeName=name;}
    public String change(String newStatus,String newPriority,Instant newDueAt,String subject,String name,boolean assignmentChanged,boolean clearDueAt,String actor){
        String oldStatus=status;
        if(newStatus!=null) status=newStatus;
        if(newPriority!=null) priority=newPriority;
        if(clearDueAt) dueAt=null;
        else if(newDueAt!=null) dueAt=newDueAt;
        if(assignmentChanged){assigneeSubject=subject;assigneeName=name;}
        updatedBy=actor;version++;
        return oldStatus;
    }
    public UUID getOrganizationId(){return organizationId;} public UUID getSiteId(){return siteId;} public UUID getAssetId(){return assetId;}
    public String getTitle(){return title;} public String getDescription(){return description;} public String getPriority(){return priority;}
    public String getStatus(){return status;} public Instant getDueAt(){return dueAt;} public String getAssigneeSubject(){return assigneeSubject;}
    public String getAssigneeName(){return assigneeName;} public String getCreatedBy(){return createdBy;} public String getUpdatedBy(){return updatedBy;} public int getVersion(){return version;}
}
