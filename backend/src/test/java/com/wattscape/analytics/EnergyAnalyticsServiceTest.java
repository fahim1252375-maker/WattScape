package com.wattscape.analytics;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.wattscape.audit.AuditEventRepository;
import com.wattscape.identity.TenantContext;
import com.wattscape.site.Site;
import com.wattscape.site.SiteService;
import com.wattscape.telemetry.TelemetryPoint;
import com.wattscape.telemetry.TelemetryPointRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

class EnergyAnalyticsServiceTest {
    @Test void aggregatesEveryMeasurementAcrossMoreThanTenThousandPoints() {
        UUID organizationId = UUID.randomUUID(), siteId = UUID.randomUUID(), deviceId = UUID.randomUUID();
        Instant from = Instant.parse("2026-11-01T00:00:00Z"), to = from.plusSeconds(60L * 60 * 24 * 30);
        List<TelemetryPoint> rows = new ArrayList<>();
        for (int i = 0; i < 10_005; i++) {
            rows.add(new TelemetryPoint(organizationId, siteId, deviceId, null, "energy_kwh", BigDecimal.ONE, "kWh", "good", "evt-" + i, from.plusSeconds(i), from.plusSeconds(i)));
        }
        TelemetryPointRepository points = mock(TelemetryPointRepository.class);
        when(points.countByOrganizationIdAndSiteIdAndMetricKeyInAndObservedAtBetween(eq(organizationId), eq(siteId), anyList(), eq(from), eq(to))).thenReturn((long) rows.size());
        when(points.findAllByOrganizationIdAndSiteIdAndMetricKeyInAndObservedAtBetweenOrderByObservedAtAscIdAsc(eq(organizationId), eq(siteId), anyList(), eq(from), eq(to), any(Pageable.class)))
            .thenAnswer(call -> {
                Pageable page = call.getArgument(5);
                int start = Math.toIntExact(page.getOffset());
                int end = Math.min(rows.size(), start + page.getPageSize());
                return start >= rows.size() ? List.of() : rows.subList(start, end);
            });
        EnergyFactorRepository factors = mock(EnergyFactorRepository.class);
        when(factors.findAllByOrganizationIdAndSiteIdAndEffectiveFromLessThanEqualOrderByEffectiveFromAsc(organizationId, siteId, to)).thenReturn(List.of());
        SiteService sites = mock(SiteService.class);
        when(sites.requireSite(eq(siteId), any(Authentication.class))).thenReturn(new Site(organizationId, "Ignored site label", "TEST", null, null, "UTC", null, null, null, null));

        var service = new EnergyAnalyticsService(sites, mock(TenantContext.class), points, factors, mock(AuditEventRepository.class));
        var result = service.summarize(siteId, from, to, mock(Authentication.class));

        assertEquals(0, new BigDecimal("10005.000").compareTo(result.energyKwh()));
        assertEquals(10_005, result.energySamples());
        assertEquals(10_005, result.sampledPoints());
        assertFalse(result.truncated(), "daily aggregates and totals are computed from the complete selected range");
        verify(points, times(6)).findAllByOrganizationIdAndSiteIdAndMetricKeyInAndObservedAtBetweenOrderByObservedAtAscIdAsc(eq(organizationId), eq(siteId), anyList(), eq(from), eq(to), any(Pageable.class));
    }
}
