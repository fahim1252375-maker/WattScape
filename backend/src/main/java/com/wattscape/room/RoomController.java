package com.wattscape.room;
import jakarta.validation.Valid; import org.springframework.http.HttpStatus; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.List; import java.util.UUID;
@RestController @RequestMapping("/api/v1/sites/{siteId}/rooms") public class RoomController {
 private final RoomService service; public RoomController(RoomService s){service=s;}
 @GetMapping public List<RoomDtos.RoomResponse> list(@PathVariable UUID siteId,Authentication auth){return service.list(siteId,auth);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public RoomDtos.RoomResponse create(@PathVariable UUID siteId,@Valid @RequestBody RoomDtos.CreateRoomRequest req,Authentication auth){return service.create(siteId,req,auth);}
}
