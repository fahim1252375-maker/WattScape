package com.wattscape.workorder;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.wattscape.asset.AssetRepository;
import com.wattscape.audit.AuditEventRepository;
import com.wattscape.common.ApiException;
import com.wattscape.identity.TenantContext;
import com.wattscape.organization.OrganizationUser;
import com.wattscape.organization.OrganizationUserRepository;
import com.wattscape.site.Site;
import com.wattscape.site.SiteService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class WorkOrderServiceTest {
    private final SiteService sites = mock(SiteService.class);
    private final TenantContext tenant = mock(TenantContext.class);
    private final AssetRepository assets = mock(AssetRepository.class);
    private final OrganizationUserRepository users = mock(OrganizationUserRepository.class);
    private final WorkOrderRepository orders = mock(WorkOrderRepository.class);
    private final WorkOrderEventRepository events = mock(WorkOrderEventRepository.class);
    private final AuditEventRepository audit = mock(AuditEventRepository.class);
    private final WorkOrderService service = new WorkOrderService(sites, tenant, assets, users, orders, events, audit);
    private final UUID organizationId = UUID.randomUUID();
    private final UUID siteId = UUID.randomUUID();
    private final Authentication auth = mock(Authentication.class);
    private final OrganizationUser owner = new OrganizationUser(organizationId, "https://issuer.test", "owner", "owner@example.test", "Owner", "Organization Owner");
    private final OrganizationUser auditor = new OrganizationUser(organizationId, "https://issuer.test", "audit", "audit@example.test", "Auditor", "Auditor/Read Only");
    private final OrganizationUser technician = new OrganizationUser(organizationId, "https://issuer.test", "tech", "tech@example.test", "Technician", "Technician");

    @BeforeEach void setUp() {
        when(tenant.requireRole(auth, "Organization Owner", "Organization Admin", "Site Admin", "Facilities Operator", "Technician")).thenReturn(owner);
        when(sites.requireSite(siteId, auth)).thenReturn(new Site(organizationId, "Example", "EX", null, null, "UTC", null, null, null, null));
        when(users.findByIdAndOrganizationId(auditor.getId(), organizationId)).thenReturn(Optional.of(auditor));
        when(users.findByIdAndOrganizationId(technician.getId(), organizationId)).thenReturn(Optional.of(technician));
    }

    @Test void auditorCannotBeAssignedWhenCreatingWorkOrder() {
        var request = new WorkOrderDtos.CreateRequest("Inspection", null, "medium", null, null, auditor.getId());
        assertThrows(ApiException.class, () -> service.create(siteId, request, auth));
    }

    @Test void activeTechnicianInSameOrganizationCanBeAssigned() {
        UUID orderId = UUID.randomUUID();
        WorkOrder order = new WorkOrder(organizationId, siteId, null, "Inspection", null, "medium", null, "owner");
        when(orders.findByIdAndOrganizationIdAndSiteId(orderId, organizationId, siteId)).thenReturn(Optional.of(order));
        var request = new WorkOrderDtos.UpdateRequest(order.getVersion(), null, null, null, technician.getId(), false, false);
        service.update(siteId, orderId, request, auth);
        org.junit.jupiter.api.Assertions.assertEquals("tech", order.getAssigneeSubject());
    }

    @Test void memberFromAnotherOrganizationCannotBeAssigned() {
        UUID otherOrganization = UUID.randomUUID();
        OrganizationUser foreignTechnician = new OrganizationUser(otherOrganization, "https://issuer.test", "foreign-tech", "foreign@example.test", "Foreign", "Technician");
        UUID orderId = UUID.randomUUID();
        WorkOrder order = new WorkOrder(organizationId, siteId, null, "Inspection", null, "medium", null, "owner");
        when(orders.findByIdAndOrganizationIdAndSiteId(orderId, organizationId, siteId)).thenReturn(Optional.of(order));
        when(users.findByIdAndOrganizationId(foreignTechnician.getId(), organizationId)).thenReturn(Optional.empty());
        var request = new WorkOrderDtos.UpdateRequest(order.getVersion(), null, null, null, foreignTechnician.getId(), false, false);
        assertThrows(ApiException.class, () -> service.update(siteId, orderId, request, auth));
    }

    @Test void auditorCannotBeAssignedByDirectPatchRequest() {
        UUID orderId = UUID.randomUUID();
        WorkOrder order = new WorkOrder(organizationId, siteId, null, "Inspection", null, "medium", null, "owner");
        when(orders.findByIdAndOrganizationIdAndSiteId(orderId, organizationId, siteId)).thenReturn(Optional.of(order));
        var request = new WorkOrderDtos.UpdateRequest(order.getVersion(), null, null, null, auditor.getId(), false, false);
        assertThrows(ApiException.class, () -> service.update(siteId, orderId, request, auth));
    }
}
