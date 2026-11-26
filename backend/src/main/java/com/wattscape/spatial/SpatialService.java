package com.wattscape.spatial;

import com.wattscape.asset.AssetRepository;
import com.wattscape.audit.AuditEvent;
import com.wattscape.audit.AuditEventRepository;
import com.wattscape.common.ApiException;
import com.wattscape.floor.Floor;
import com.wattscape.floor.FloorRepository;
import com.wattscape.identity.TenantContext;
import com.wattscape.room.RoomRepository;
import com.wattscape.site.SiteService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpatialService {
    private final SiteService sites; private final FloorRepository floors; private final FloorPlanRepository plans;
    private final SpatialElementRepository elements; private final SpatialElementVersionRepository versions;
    private final RoomRepository rooms; private final AssetRepository assets; private final TenantContext tenant;
    private final AuditEventRepository audit;
    public SpatialService(SiteService sites, FloorRepository floors, FloorPlanRepository plans,
        SpatialElementRepository elements, SpatialElementVersionRepository versions, RoomRepository rooms,
        AssetRepository assets, TenantContext tenant, AuditEventRepository audit) {
        this.sites=sites; this.floors=floors; this.plans=plans; this.elements=elements; this.versions=versions;
        this.rooms=rooms; this.assets=assets; this.tenant=tenant; this.audit=audit;
    }

    @Transactional(readOnly=true)
    public SpatialDtos.FloorPlanResponse getPlan(UUID siteId, UUID floorId, Authentication auth) {
        Floor f=requireFloor(siteId,floorId,auth);
        return plans.findFirstByOrganizationIdAndSiteIdAndFloorIdAndActiveTrueOrderByRevisionDesc(f.getOrganizationId(),siteId,floorId)
            .map(SpatialDtos.FloorPlanResponse::from).orElseThrow(()->ApiException.notFound("Floor plan not found"));
    }

    @Transactional
    public SpatialDtos.FloorPlanResponse createPlan(UUID siteId, UUID floorId, SpatialDtos.FloorPlanRequest request, Authentication auth) {
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin");
        Floor f=requireFloor(siteId,floorId,auth);
        List<FloorPlan> previous=plans.findAllByOrganizationIdAndFloorIdOrderByRevisionDesc(f.getOrganizationId(),floorId);
        int revision=previous.isEmpty()?1:previous.get(0).getRevision()+1;
        previous.stream().filter(FloorPlan::isActive).forEach(FloorPlan::deactivate);
        plans.flush(); // Release the partial unique active-plan index before inserting the next revision.
        FloorPlan p=plans.save(new FloorPlan(f.getOrganizationId(),siteId,floorId,revision,request.unit(),request.width(),request.height(),
            zero(request.originX()),zero(request.originY()),zero(request.rotationDegrees()),trimToNull(request.planReference()),member.getSubject()));
        audit.save(new AuditEvent(f.getOrganizationId(),member.getSubject(),"FLOOR_PLAN_CREATED","floor_plan",p.getId(),"allowed",MDC.get("requestId"),Map.of("floorId",floorId.toString(),"revision",revision)));
        return SpatialDtos.FloorPlanResponse.from(p);
    }

    @Transactional(readOnly=true)
    public List<SpatialDtos.SpatialElementResponse> listElements(UUID siteId, UUID floorId, Authentication auth) {
        Floor f=requireFloor(siteId,floorId,auth);
        return elements.findAllByOrganizationIdAndSiteIdAndFloorIdAndLifecycleStateOrderByEntityTypeAscCreatedAtAsc(f.getOrganizationId(),siteId,floorId,"active")
            .stream().map(SpatialDtos.SpatialElementResponse::from).toList();
    }

    @Transactional
    public SpatialDtos.SpatialElementResponse upsertElement(UUID siteId, UUID floorId, String typeRaw, UUID entityId,
            SpatialDtos.SpatialElementRequest request, Authentication auth) {
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin","Facilities Operator");
        Floor floor=requireFloor(siteId,floorId,auth);
        String type=typeRaw.toLowerCase(Locale.ROOT);
        if(!type.equals("room")&&!type.equals("asset")) throw ApiException.badRequest("Spatial entity type must be room or asset");
        SpatialGeometryValidator.validate(type,request.geometry());
        FloorPlan activePlan=plans.findFirstByOrganizationIdAndSiteIdAndFloorIdAndActiveTrueOrderByRevisionDesc(floor.getOrganizationId(),siteId,floorId)
            .orElseThrow(()->ApiException.conflict("Create an active floor plan before mapping spatial geometry"));
        UUID roomId=null, assetId=null;
        if(type.equals("room")) {
            var room=rooms.findByIdAndSiteIdAndOrganizationId(entityId,siteId,floor.getOrganizationId()).orElseThrow(()->ApiException.notFound("Room not found"));
            if(!room.getFloorId().equals(floorId)) throw ApiException.badRequest("Room does not belong to this floor");
            roomId=entityId;
        } else {
            var asset=assets.findByIdAndSiteIdAndOrganizationId(entityId,siteId,floor.getOrganizationId()).orElseThrow(()->ApiException.notFound("Asset not found"));
            if(!asset.getFloorId().equals(floorId)) throw ApiException.badRequest("Asset does not belong to this floor");
            assetId=entityId;
        }
        var existing=type.equals("room")
            ? elements.findByOrganizationIdAndSiteIdAndFloorIdAndEntityTypeAndRoomIdAndLifecycleState(floor.getOrganizationId(),siteId,floorId,type,roomId,"active")
            : elements.findByOrganizationIdAndSiteIdAndFloorIdAndEntityTypeAndAssetIdAndLifecycleState(floor.getOrganizationId(),siteId,floorId,type,assetId,"active");
        SpatialElement e;
        String action;
        if(existing.isPresent()) {
            e=existing.get();
            if(request.expectedVersion()==null || request.expectedVersion()!=e.getVersion()) throw ApiException.conflict("Spatial element version is stale; reload before updating");
            e.update(activePlan.getRevision(),request.geometry(),request.positionX(),request.positionY(),zero(request.positionZ()),zero(request.rotationDegrees()),member.getSubject());
            action="updated";
        } else {
            if(request.expectedVersion()!=null && request.expectedVersion()!=0) throw ApiException.conflict("Spatial element does not exist at the requested version");
            e=elements.save(new SpatialElement(floor.getOrganizationId(),siteId,floorId,activePlan.getRevision(),type,roomId,assetId,request.geometry(),
                request.positionX(),request.positionY(),zero(request.positionZ()),zero(request.rotationDegrees()),member.getSubject()));
            action="created";
        }
        e=elements.save(e);
        versions.save(new SpatialElementVersion(floor.getOrganizationId(),e.getId(),e.getVersion(),action,e.snapshot(),member.getSubject()));
        audit.save(new AuditEvent(floor.getOrganizationId(),member.getSubject(),"SPATIAL_ELEMENT_"+action.toUpperCase(Locale.ROOT),"spatial_element",e.getId(),"allowed",MDC.get("requestId"),Map.of("floorId",floorId.toString(),"entityType",type,"version",e.getVersion())));
        return SpatialDtos.SpatialElementResponse.from(e);
    }

    @Transactional(readOnly=true)
    public List<SpatialDtos.SpatialVersionResponse> history(UUID siteId, UUID floorId, UUID elementId, Authentication auth) {
        Floor floor=requireFloor(siteId,floorId,auth);
        SpatialElement element=elements.findById(elementId).filter(found->found.getOrganizationId().equals(floor.getOrganizationId())&&found.getSiteId().equals(siteId)&&found.getFloorId().equals(floorId))
            .orElseThrow(()->ApiException.notFound("Spatial element not found"));
        return versions.findAllByOrganizationIdAndSpatialElementIdOrderByVersionDesc(floor.getOrganizationId(),element.getId())
            .stream().map(SpatialDtos.SpatialVersionResponse::from).toList();
    }

    @Transactional
    public void retireElement(UUID siteId, UUID floorId, UUID elementId, Authentication auth) {
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin");
        Floor floor=requireFloor(siteId,floorId,auth);
        SpatialElement e=elements.findById(elementId).filter(found->found.getOrganizationId().equals(floor.getOrganizationId())&&found.getSiteId().equals(siteId)&&found.getFloorId().equals(floorId)&&found.getLifecycleState().equals("active"))
            .orElseThrow(()->ApiException.notFound("Spatial element not found"));
        e.retire(member.getSubject()); elements.save(e);
        versions.save(new SpatialElementVersion(floor.getOrganizationId(),e.getId(),e.getVersion(),"retired",e.snapshot(),member.getSubject()));
        audit.save(new AuditEvent(floor.getOrganizationId(),member.getSubject(),"SPATIAL_ELEMENT_RETIRED","spatial_element",e.getId(),"allowed",MDC.get("requestId"),Map.of("version",e.getVersion())));
    }

    private Floor requireFloor(UUID siteId, UUID floorId, Authentication auth) {
        var site=sites.requireSite(siteId,auth);
        Floor floor=floors.findByIdAndOrganizationId(floorId,site.getOrganizationId()).orElseThrow(()->ApiException.notFound("Floor not found"));
        if(!floor.getSiteId().equals(siteId)) throw ApiException.notFound("Floor not found");
        return floor;
    }
    private static BigDecimal zero(BigDecimal value){return value==null?BigDecimal.ZERO:value;}
    private static String trimToNull(String value){return value==null||value.isBlank()?null:value.trim();}
}
