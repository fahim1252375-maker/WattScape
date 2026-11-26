package com.wattscape.ai;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

@RestController @RequestMapping("/api/v1/sites/{siteId}/ai")
public class AiGatewayController {
    private final AiGatewayService service;
    public AiGatewayController(AiGatewayService service){this.service=service;}
    @GetMapping("/provider") public AiDtos.ProviderInfo provider(@PathVariable UUID siteId,Authentication auth){return service.providerInfo(siteId,auth);}
    @PostMapping("/insights") public AiDtos.InsightResponse generate(@PathVariable UUID siteId,@Valid @RequestBody AiDtos.InsightRequest request,Authentication auth){return service.generate(siteId,request,auth);}
}
