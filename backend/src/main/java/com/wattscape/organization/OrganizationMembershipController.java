package com.wattscape.organization;

import com.wattscape.common.ApiException;
import com.wattscape.identity.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/organizations")
public class OrganizationMembershipController {
 private final TenantContext tenant; private final OrganizationRepository organizations; private final OrganizationUserRepository users;
 public OrganizationMembershipController(TenantContext tenant,OrganizationRepository organizations,OrganizationUserRepository users){this.tenant=tenant;this.organizations=organizations;this.users=users;}
 @GetMapping("/memberships") public List<MembershipResponse> memberships(Authentication auth){
   return tenant.memberships(auth).stream().map(m->{
     var organization=organizations.findById(m.getOrganizationId()).orElseThrow(()->ApiException.notFound("Organization not found"));
     return new MembershipResponse(organization.getId(),organization.getName(),m.getRole(),m.getStatus());
   }).toList();
 }

 @GetMapping("/current/members") public List<MemberOptionResponse> members(Authentication auth){
   var actor=tenant.requireRole(auth,"Organization Owner","Organization Admin","Site Admin","Facilities Operator");
   return users.findAllByOrganizationIdAndStatusOrderByDisplayNameAsc(actor.getOrganizationId(),"active").stream()
     .map(m->new MemberOptionResponse(m.getId(),m.getDisplayName()==null?m.getRole():m.getDisplayName(),m.getRole())).toList();
 }
 @PostMapping("/active") public MembershipResponse select(@Valid @RequestBody SelectOrganizationRequest request,Authentication auth){
   var membership=tenant.requireMembership(auth,request.organizationId());
   var organization=organizations.findById(membership.getOrganizationId()).orElseThrow(()->ApiException.notFound("Organization not found"));
   return new MembershipResponse(organization.getId(),organization.getName(),membership.getRole(),membership.getStatus());
 }
 public record SelectOrganizationRequest(@NotNull UUID organizationId){}
 public record MemberOptionResponse(UUID id,String displayName,String role){}
 public record MembershipResponse(UUID organizationId,String organizationName,String role,String status){}
}
