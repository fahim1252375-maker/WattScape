package com.wattscape.organization;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

class InvitationEmailMailpitSmokeTest {
    @Test
    @EnabledIfEnvironmentVariable(named = "WATSCAPE_MAILPIT_SMOKE", matches = "true")
    void sendsPreviewThroughLocalMailpitOnlyWhenExplicitlyEnabled() {
        var sender = new JavaMailSenderImpl();
        sender.setHost("127.0.0.1");
        sender.setPort(1025);
        var service = new InvitationEmailService(sender, "no-reply@wattscape.local", "http://localhost:3000");
        service.send("ws-mailpit-preview@example.test", "Phase 4A Mailpit Preview (non-invitation)",
                "Technician", "PREVIEW-ONLY-NOT-A-VALID-INVITATION-CODE", Instant.now().plus(72, ChronoUnit.HOURS));
    }
}
