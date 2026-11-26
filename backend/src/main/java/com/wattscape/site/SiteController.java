package com.wattscape.site;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/sites")
public class SiteController {
 private final SiteService service; public SiteController(SiteService service){this.service=service;}
 @GetMapping public List<SiteDtos.SiteResponse> list(Authentication auth){return service.list(auth);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public SiteDtos.SiteResponse create(@Valid @RequestBody SiteDtos.CreateSiteRequest request,Authentication auth){return service.create(request,auth);}
}
