package com.wattscape.workorder;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/sites/{siteId}/work-orders")
public class WorkOrderController {
    private final WorkOrderService service;
    public WorkOrderController(WorkOrderService service){this.service=service;}
    @GetMapping public List<WorkOrderDtos.Response> list(@PathVariable UUID siteId,@RequestParam(required=false) String status,Authentication auth){return service.list(siteId,status,auth);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public WorkOrderDtos.Response create(@PathVariable UUID siteId,@Valid @RequestBody WorkOrderDtos.CreateRequest request,Authentication auth){return service.create(siteId,request,auth);}
    @GetMapping("/{workOrderId}") public WorkOrderDtos.Response get(@PathVariable UUID siteId,@PathVariable UUID workOrderId,Authentication auth){return service.get(siteId,workOrderId,auth);}
    @GetMapping("/{workOrderId}/events") public List<WorkOrderDtos.EventResponse> history(@PathVariable UUID siteId,@PathVariable UUID workOrderId,Authentication auth){return service.history(siteId,workOrderId,auth);}
    @PatchMapping("/{workOrderId}") public WorkOrderDtos.Response update(@PathVariable UUID siteId,@PathVariable UUID workOrderId,@Valid @RequestBody WorkOrderDtos.UpdateRequest request,Authentication auth){return service.update(siteId,workOrderId,request,auth);}
}
