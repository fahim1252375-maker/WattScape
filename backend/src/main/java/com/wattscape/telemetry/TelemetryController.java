package com.wattscape.telemetry;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class TelemetryController {
    private final TelemetryService service;
    public TelemetryController(TelemetryService service){this.service=service;}
    @PostMapping("/api/v1/sites/{siteId}/telemetry/devices") @ResponseStatus(HttpStatus.CREATED)
    public TelemetryDtos.DeviceCreated register(@PathVariable UUID siteId,@Valid @RequestBody TelemetryDtos.CreateDeviceRequest request,Authentication auth){return service.register(siteId,request,auth);}
    @GetMapping("/api/v1/sites/{siteId}/telemetry/devices") public List<TelemetryDtos.DeviceResponse> devices(@PathVariable UUID siteId,Authentication auth){return service.listDevices(siteId,auth);}
    @PostMapping("/api/v1/sites/{siteId}/telemetry/devices/{deviceId}/revoke") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID siteId,@PathVariable UUID deviceId,Authentication auth){service.revokeDevice(siteId,deviceId,auth);}
    @PostMapping("/api/v1/telemetry/ingest/{deviceId}") public TelemetryDtos.IngestResponse ingest(@PathVariable UUID deviceId,@RequestHeader(name="Authorization",required=false) String authorization,@Valid @RequestBody TelemetryDtos.IngestRequest request){return service.ingest(deviceId,authorization,request);}
    @GetMapping("/api/v1/sites/{siteId}/telemetry") public List<TelemetryDtos.PointResponse> history(@PathVariable UUID siteId,@RequestParam String metricKey,@RequestParam Instant from,@RequestParam Instant to,@RequestParam(defaultValue="500") int limit,Authentication auth){return service.history(siteId,metricKey,from,to,limit,auth);}
    @GetMapping("/api/v1/sites/{siteId}/telemetry/latest") public List<TelemetryDtos.PointResponse> latest(@PathVariable UUID siteId,@RequestParam(defaultValue="100") int limit,Authentication auth){return service.latest(siteId,limit,auth);}
}
