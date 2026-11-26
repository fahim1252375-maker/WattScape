package com.wattscape.analytics;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/sites/{siteId}/analytics/energy")
public class EnergyAnalyticsController {
    private final EnergyAnalyticsService service;
    public EnergyAnalyticsController(EnergyAnalyticsService service){this.service=service;}
    @GetMapping public AnalyticsDtos.EnergySummary summarize(@PathVariable UUID siteId,@RequestParam Instant from,@RequestParam Instant to,Authentication auth){return service.summarize(siteId,from,to,auth);}
    @PostMapping("/factors") @ResponseStatus(HttpStatus.CREATED) public AnalyticsDtos.FactorResponse factors(@PathVariable UUID siteId,@Valid @RequestBody AnalyticsDtos.FactorRequest request,Authentication auth){return service.setFactors(siteId,request,auth);}
}
