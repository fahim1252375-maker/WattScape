package com.wattscape.twin;

import com.wattscape.asset.Asset;
import com.wattscape.asset.AssetRepository;
import com.wattscape.building.Building;
import com.wattscape.building.BuildingRepository;
import com.wattscape.common.ApiException;
import com.wattscape.floor.Floor;
import com.wattscape.floor.FloorRepository;
import com.wattscape.room.Room;
import com.wattscape.room.RoomRepository;
import com.wattscape.site.Site;
import com.wattscape.site.SiteService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class TwinService {
 private final SiteService sites; private final BuildingRepository buildings; private final FloorRepository floors; private final RoomRepository rooms; private final AssetRepository assets; private final TwinNodeRepository nodes; private final TwinEdgeRepository edges;
 public TwinService(SiteService s,BuildingRepository b,FloorRepository f,RoomRepository r,AssetRepository a,TwinNodeRepository n,TwinEdgeRepository e){sites=s;buildings=b;floors=f;rooms=r;assets=a;nodes=n;edges=e;}
 @Transactional(readOnly=true) public TwinResponse get(UUID siteId,Authentication auth){
   Site site=sites.requireSite(siteId,auth); UUID org=site.getOrganizationId();
   List<Building> bs=buildings.findAllBySiteIdAndOrganizationId(siteId,org);
   List<Floor> fs=bs.stream().flatMap(b->floors.findAllByOrganizationIdAndBuildingIdOrderByLevelNumber(org,b.getId()).stream()).toList();
   List<Room> rs=rooms.findAllBySiteIdAndOrganizationIdOrderByCode(siteId,org); List<Asset> as=assets.findAllBySiteIdAndOrganizationIdOrderByName(siteId,org);
   List<TwinNode> ns=nodes.findAllBySiteIdAndOrganizationIdOrderByKindAscNameAsc(siteId,org);
   List<UUID> nodeIds=ns.stream().map(TwinNode::getId).toList();
   List<TwinEdge> es=nodeIds.isEmpty()?List.of():edges.findForNodes(org,nodeIds).stream().filter(e->nodeIds.contains(e.getSourceNodeId())&&nodeIds.contains(e.getTargetNodeId())).toList();
   return new TwinResponse(siteDto(site),bs.stream().map(BuildingDto::from).toList(),fs.stream().map(FloorDto::from).toList(),rs.stream().map(RoomDto::from).toList(),as.stream().map(AssetDto::from).toList(),ns.stream().map(NodeDto::from).toList(),es.stream().map(EdgeDto::from).toList());
 }
 private static SiteDto siteDto(Site s){return new SiteDto(s.getId(),s.getName(),s.getCode(),s.getTimeZone(),s.getAreaSqm());}
 public record TwinResponse(SiteDto site,List<BuildingDto> buildings,List<FloorDto> floors,List<RoomDto> rooms,List<AssetDto> assets,List<NodeDto> nodes,List<EdgeDto> edges){}
 public record SiteDto(UUID id,String name,String code,String timeZone,java.math.BigDecimal areaSqm){}
 public record BuildingDto(UUID id,UUID siteId,String code,String name,Instant createdAt){static BuildingDto from(Building b){return new BuildingDto(b.getId(),b.getSiteId(),b.getCode(),b.getName(),b.getCreatedAt());}}
 public record FloorDto(UUID id,UUID buildingId,int level,String name,java.math.BigDecimal elevationM,java.math.BigDecimal areaSqm){static FloorDto from(Floor f){return new FloorDto(f.getId(),f.getBuildingId(),f.getLevelNumber(),f.getName(),f.getElevationM(),f.getAreaSqm());}}
 public record RoomDto(UUID id,UUID floorId,String code,String name,String zoneType,java.math.BigDecimal areaSqm){static RoomDto from(Room r){return new RoomDto(r.getId(),r.getFloorId(),r.getCode(),r.getName(),r.getZoneType(),r.getAreaSqm());}}
 public record AssetDto(UUID id,UUID floorId,UUID roomId,String assetClass,String name,String status,String sourceId){static AssetDto from(Asset a){return new AssetDto(a.getId(),a.getFloorId(),a.getRoomId(),a.getAssetClass(),a.getName(),a.getStatus(),a.getSourceId());}}
 public record NodeDto(UUID id,String kind,String name,String lifecycleState,String sourceId){static NodeDto from(TwinNode n){return new NodeDto(n.getId(),n.getKind(),n.getName(),n.getLifecycleState(),n.getSourceId());}}
 public record EdgeDto(UUID id,UUID sourceNodeId,UUID targetNodeId,String edgeType){static EdgeDto from(TwinEdge e){return new EdgeDto(e.getId(),e.getSourceNodeId(),e.getTargetNodeId(),e.getEdgeType());}}
}
