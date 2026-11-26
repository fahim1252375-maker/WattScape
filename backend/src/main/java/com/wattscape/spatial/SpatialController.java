package com.wattscape.spatial;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sites/{siteId}/floors/{floorId}")
public class SpatialController {
    private final SpatialService service;
    public SpatialController(SpatialService service){this.service=service;}
    @GetMapping("/plan") public SpatialDtos.FloorPlanResponse getPlan(@PathVariable UUID siteId,@PathVariable UUID floorId,Authentication auth){return service.getPlan(siteId,floorId,auth);}
    @PostMapping("/plan") @ResponseStatus(HttpStatus.CREATED) public SpatialDtos.FloorPlanResponse createPlan(@PathVariable UUID siteId,@PathVariable UUID floorId,@Valid @RequestBody SpatialDtos.FloorPlanRequest request,Authentication auth){return service.createPlan(siteId,floorId,request,auth);}
    @GetMapping("/spatial-elements") public List<SpatialDtos.SpatialElementResponse> list(@PathVariable UUID siteId,@PathVariable UUID floorId,Authentication auth){return service.listElements(siteId,floorId,auth);}
    @PutMapping("/spatial-elements/{entityType}/{entityId}") public SpatialDtos.SpatialElementResponse upsert(@PathVariable UUID siteId,@PathVariable UUID floorId,@PathVariable String entityType,@PathVariable UUID entityId,@Valid @RequestBody SpatialDtos.SpatialElementRequest request,Authentication auth){return service.upsertElement(siteId,floorId,entityType,entityId,request,auth);}
    @GetMapping("/spatial-elements/{elementId}/versions") public List<SpatialDtos.SpatialVersionResponse> history(@PathVariable UUID siteId,@PathVariable UUID floorId,@PathVariable UUID elementId,Authentication auth){return service.history(siteId,floorId,elementId,auth);}
    @DeleteMapping("/spatial-elements/{elementId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void retire(@PathVariable UUID siteId,@PathVariable UUID floorId,@PathVariable UUID elementId,Authentication auth){service.retireElement(siteId,floorId,elementId,auth);}
}
