package com.wattscape.workorder;

import com.wattscape.asset.AssetRepository;
import com.wattscape.audit.AuditEvent;
import com.wattscape.audit.AuditEventRepository;
import com.wattscape.common.ApiException;
import com.wattscape.identity.TenantContext;
import com.wattscape.organization.OrganizationUserRepository;
import com.wattscape.site.SiteService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkOrderService {
    private static final Map<String,Set<String>> TRANSITIONS=Map.of(
        "open",Set.of("triaged","cancelled"),"triaged",Set.of("in_progress","blocked","cancelled"),
        "in_progress",Set.of("blocked","completed","triaged","cancelled"),"blocked",Set.of("in_progress","cancelled"),
        "completed",Set.of(),"cancelled",Set.of());
    private final SiteService sites; private final TenantContext tenant; private final AssetRepository assets;
    private final OrganizationUserRepository users; private final WorkOrderRepository orders;
    private final WorkOrderEventRepository events; private final AuditEventRepository audit;
    public WorkOrderService(SiteService sites,TenantContext tenant,AssetRepository assets,OrganizationUserRepository users,
        WorkOrderRepository orders,WorkOrderEventRepository events,AuditEventRepository audit){
        this.sites=sites;this.tenant=tenant;this.assets=assets;this.users=users;this.orders=orders;this.events=events;this.audit=audit;
    }
    @Transactional
    public WorkOrderDtos.Response create(UUID siteId,WorkOrderDtos.CreateRequest request,Authentication auth){
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin","Facilities Operator","Technician");
        var site=sites.requireSite(siteId,auth); UUID assetId=request.assetId();
        if(member.getRole().equals("Technician") && request.assigneeMemberId()!=null) throw ApiException.forbidden("Technicians cannot assign work orders to other members");
        if(assetId!=null&&assets.findByIdAndSiteIdAndOrganizationId(assetId,siteId,site.getOrganizationId()).isEmpty()) throw ApiException.badRequest("Asset does not belong to this site");
        String priority=request.priority()==null?"medium":request.priority();
        WorkOrder order=orders.save(new WorkOrder(site.getOrganizationId(),siteId,assetId,request.title().trim(),trim(request.description()),priority,request.dueAt(),member.getSubject()));
        if(request.assigneeMemberId()!=null) assign(order,request.assigneeMemberId(),site.getOrganizationId());
        else if(member.getRole().equals("Technician")) order.assignInitially(member.getSubject(),member.getDisplayName());
        orders.save(order);
        events.save(new WorkOrderEvent(site.getOrganizationId(),order.getId(),"created",null,order.getStatus(),member.getSubject(),Map.of("priority",priority)));
        audit.save(new AuditEvent(site.getOrganizationId(),member.getSubject(),"WORK_ORDER_CREATED","work_order",order.getId(),"allowed",MDC.get("requestId"),Map.of("siteId",siteId.toString())));
        return WorkOrderDtos.Response.from(order);
    }
    @Transactional(readOnly=true)
    public List<WorkOrderDtos.Response> list(UUID siteId,String status,Authentication auth){
        var site=sites.requireSite(siteId,auth);
        if(status!=null&&!status.isBlank()&&!TRANSITIONS.containsKey(status)) throw ApiException.badRequest("Work order status is invalid");
        List<WorkOrder> result=status==null||status.isBlank()?orders.findTop500ByOrganizationIdAndSiteIdOrderByCreatedAtDesc(site.getOrganizationId(),siteId)
            :orders.findTop500ByOrganizationIdAndSiteIdAndStatusOrderByCreatedAtDesc(site.getOrganizationId(),siteId,status);
        return result.stream().map(WorkOrderDtos.Response::from).toList();
    }
    @Transactional(readOnly=true)
    public WorkOrderDtos.Response get(UUID siteId,UUID id,Authentication auth){var site=sites.requireSite(siteId,auth);return WorkOrderDtos.Response.from(requireOrder(site.getOrganizationId(),siteId,id));}
    @Transactional(readOnly=true)
    public List<WorkOrderDtos.EventResponse> history(UUID siteId,UUID id,Authentication auth){
        var site=sites.requireSite(siteId,auth); WorkOrder order=requireOrder(site.getOrganizationId(),siteId,id);
        return events.findAllByOrganizationIdAndWorkOrderIdOrderByCreatedAtDesc(site.getOrganizationId(),order.getId()).stream().map(WorkOrderDtos.EventResponse::from).toList();
    }
    @Transactional
    public WorkOrderDtos.Response update(UUID siteId,UUID id,WorkOrderDtos.UpdateRequest request,Authentication auth){
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin","Facilities Operator","Technician");
        var site=sites.requireSite(siteId,auth); WorkOrder order=requireOrder(site.getOrganizationId(),siteId,id);
        if(request.expectedVersion()!=order.getVersion()) throw ApiException.conflict("Work order has changed; reload before updating");
        if(request.status()==null && request.priority()==null && request.dueAt()==null && !request.clearDueAt() && request.assigneeMemberId()==null && !request.clearAssignee()) throw ApiException.badRequest("At least one work-order field must be changed");
        if(member.getRole().equals("Technician")&&!member.getSubject().equals(order.getAssigneeSubject())) throw ApiException.forbidden("Technicians may update only work orders assigned to them");
        if(member.getRole().equals("Technician")&&(request.clearAssignee()||request.assigneeMemberId()!=null)) throw ApiException.forbidden("Technicians cannot change work-order assignments");
        if(request.clearAssignee()&&request.assigneeMemberId()!=null) throw ApiException.badRequest("Choose an assignee or clear the assignment, not both");
        if(request.clearDueAt()&&request.dueAt()!=null) throw ApiException.badRequest("Choose a due date or clear the due date, not both");
        if(request.status()!=null&&!TRANSITIONS.getOrDefault(order.getStatus(),Set.of()).contains(request.status())) throw ApiException.conflict("Work order status transition is not allowed");
        String old=order.getStatus(); String assigneeSubject=order.getAssigneeSubject(),assigneeName=order.getAssigneeName(); boolean assignmentChanged=false;
        if(request.clearAssignee()){assigneeSubject=null;assigneeName=null;assignmentChanged=true;}
        else if(request.assigneeMemberId()!=null){var assigned=requireAssignableMember(request.assigneeMemberId(),site.getOrganizationId());assigneeSubject=assigned.getSubject();assigneeName=assigned.getDisplayName();assignmentChanged=true;}
        order.change(request.status(),request.priority(),request.dueAt(),assigneeSubject,assigneeName,assignmentChanged,request.clearDueAt(),member.getSubject());
        orders.save(order);
        if(request.status()!=null) events.save(new WorkOrderEvent(site.getOrganizationId(),order.getId(),"status_changed",old,order.getStatus(),member.getSubject(),Map.of("version",order.getVersion())));
        if(assignmentChanged) events.save(new WorkOrderEvent(site.getOrganizationId(),order.getId(),"assignment_changed",old,order.getStatus(),member.getSubject(),Map.of("version",order.getVersion(),"assigned",assigneeSubject!=null,"assigneeName",assigneeName==null?"":assigneeName)));
        if(request.status()==null&&!assignmentChanged) events.save(new WorkOrderEvent(site.getOrganizationId(),order.getId(),"updated",old,order.getStatus(),member.getSubject(),Map.of("version",order.getVersion())));
        audit.save(new AuditEvent(site.getOrganizationId(),member.getSubject(),"WORK_ORDER_UPDATED","work_order",order.getId(),"allowed",MDC.get("requestId"),Map.of("version",order.getVersion())));
        return WorkOrderDtos.Response.from(order);
    }
    private void assign(WorkOrder order,UUID memberId,UUID org){var assigned=requireAssignableMember(memberId,org);order.assignInitially(assigned.getSubject(),assigned.getDisplayName());}
    private com.wattscape.organization.OrganizationUser requireAssignableMember(UUID memberId,UUID org){
        var assigned=users.findByIdAndOrganizationId(memberId,org).filter(u->u.getStatus().equals("active"))
            .orElseThrow(()->ApiException.badRequest("Assignee must be an active member of this organization"));
        if("Auditor/Read Only".equals(assigned.getRole())) throw ApiException.badRequest("Auditor/Read Only members cannot be assigned work orders");
        return assigned;
    }
    private WorkOrder requireOrder(UUID org,UUID site,UUID id){return orders.findByIdAndOrganizationIdAndSiteId(id,org,site).orElseThrow(()->ApiException.notFound("Work order not found"));}
    private static String trim(String value){return value==null||value.isBlank()?null:value.trim();}
}
