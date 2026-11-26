package com.wattscape.site;

import com.wattscape.audit.AuditEvent;
import com.wattscape.audit.AuditEventRepository;
import com.wattscape.building.Building;
import com.wattscape.building.BuildingRepository;
import com.wattscape.floor.Floor;
import com.wattscape.floor.FloorRepository;
import com.wattscape.twin.TwinEdge;
import com.wattscape.twin.TwinEdgeRepository;
import com.wattscape.twin.TwinNode;
import com.wattscape.twin.TwinNodeRepository;
import com.wattscape.identity.TenantContext;
import com.wattscape.common.ApiException;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class SiteService {
    private final SiteRepository sites; private final TenantContext tenant; private final BuildingRepository buildings; private final FloorRepository floors; private final AuditEventRepository audit; private final TwinNodeRepository nodes; private final TwinEdgeRepository edges;
    public SiteService(SiteRepository sites,TenantContext tenant,BuildingRepository buildings,FloorRepository floors,AuditEventRepository audit,TwinNodeRepository nodes,TwinEdgeRepository edges){this.sites=sites;this.tenant=tenant;this.buildings=buildings;this.floors=floors;this.audit=audit;this.nodes=nodes;this.edges=edges;}
    @Transactional(readOnly=true) public List<SiteDtos.SiteResponse> list(Authentication auth){UUID org=tenant.requireActiveMember(auth).getOrganizationId();return sites.findAllByOrganizationIdOrderByName(org).stream().map(SiteDtos.SiteResponse::from).toList();}
    @Transactional public SiteDtos.SiteResponse create(SiteDtos.CreateSiteRequest req,Authentication auth){
        var member=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin");
        UUID org=member.getOrganizationId();
        if(sites.existsByOrganizationIdAndCode(org,req.code())) throw ApiException.conflict("A site with this code already exists in the organization");
        Site site=sites.save(new Site(org,req.name().trim(),req.code().trim(),req.regionTag(),req.address(),req.timeZone(),req.buildingUse(),req.areaSqm(),req.latitude(),req.longitude()));
        String buildingName=req.initialBuildingName()==null||req.initialBuildingName().isBlank()?site.getName()+" Building":req.initialBuildingName().trim();
        Building building=buildings.save(new Building(org,site.getId(),"MAIN",buildingName));
        Floor floor=floors.save(new Floor(org,site.getId(),building.getId(),0,"Ground",BigDecimal.ZERO,req.areaSqm()));
        TwinNode siteNode=nodes.save(new TwinNode(org,site.getId(),"site",site.getName(),"site:"+site.getId()));
        TwinNode buildingNode=nodes.save(new TwinNode(org,site.getId(),"building",building.getName(),"building:"+building.getId()));
        TwinNode floorNode=nodes.save(new TwinNode(org,site.getId(),"floor",floor.getName(),"floor:"+floor.getId()));
        edges.save(new TwinEdge(org,siteNode.getId(),buildingNode.getId(),"contains")); edges.save(new TwinEdge(org,buildingNode.getId(),floorNode.getId(),"contains"));
        audit.save(new AuditEvent(org,member.getSubject(),"SITE_CREATED","site",site.getId(),"allowed",MDC.get("requestId"),java.util.Map.of()));
        return SiteDtos.SiteResponse.from(site);
    }
    @Transactional(readOnly=true) public Site requireSite(UUID siteId,Authentication auth){
        UUID org=tenant.requireActiveMember(auth).getOrganizationId();
        return sites.findByIdAndOrganizationId(siteId,org).orElseThrow(()->ApiException.notFound("Site not found"));
    }
}
