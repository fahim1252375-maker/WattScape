package com.wattscape.twin;
import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.UUID;
@RestController @RequestMapping("/api/v1/sites/{siteId}/twin") public class TwinController {
 private final TwinService service; public TwinController(TwinService s){service=s;}
 @GetMapping public TwinService.TwinResponse get(@PathVariable UUID siteId,Authentication auth){return service.get(siteId,auth);}
}
