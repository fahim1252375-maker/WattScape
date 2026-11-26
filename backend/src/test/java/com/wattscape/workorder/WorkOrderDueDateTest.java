package com.wattscape.workorder;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WorkOrderDueDateTest {
    @Test void omittedDueDatePreservesCurrentValueAndExplicitClearRemovesIt() {
        Instant original = Instant.parse("2026-11-25T12:00:00Z");
        WorkOrder order = new WorkOrder(UUID.randomUUID(), UUID.randomUUID(), null, "Pump inspection", null, "medium", original, "owner");

        order.change(null, null, null, null, null, false, false, "owner");
        assertEquals(original, order.getDueAt(), "omitted dueAt must preserve the existing value");

        order.change(null, null, null, null, null, false, true, "owner");
        assertNull(order.getDueAt(), "clearDueAt=true must clear the current due date");

        Instant replacement = Instant.parse("2026-12-01T08:30:00Z");
        order.change(null, null, replacement, null, null, false, false, "owner");
        assertEquals(replacement, order.getDueAt(), "a replacement due date must be saved");
    }
}
