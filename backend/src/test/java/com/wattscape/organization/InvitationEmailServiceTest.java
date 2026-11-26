package com.wattscape.organization;

import com.wattscape.common.ApiException;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InvitationEmailServiceTest {
    @Test void sendsBrandedResponsiveMultipartInvitationWithoutTokenInCtaOrSubject() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        var service = new InvitationEmailService(sender, "local@wattscape.test", "http://localhost:3000");

        service.send("person@example.test", "Example & Research", "Technician", "opaque-invitation-code",
                Instant.parse("2030-01-01T00:00:00Z"));

        verify(sender).send(message);
        assertEquals("person@example.test", message.getAllRecipients()[0].toString());
        assertEquals("You’re invited to WattScape", message.getSubject());
        assertFalse(message.getSubject().contains("opaque-invitation-code"));
        StringBuilder body = new StringBuilder();
        collectText(message, body);
        String content = body.toString();
        assertTrue(content.contains("WattScape"));
        assertTrue(content.contains("Example &amp; Research"));
        assertTrue(content.contains("Technician"));
        assertTrue(content.contains("opaque-invitation-code"));
        assertTrue(content.contains("January 1, 2030 at 00:00 UTC"));
        assertTrue(content.contains("cid:wattscape-mark"));
        assertTrue(content.contains("Open WattScape"));
        assertTrue(content.contains("#f2f6f7"));
        assertTrue(content.contains("Join organization"));
        assertFalse(content.contains("http://localhost:3000?token="));
        ByteArrayOutputStream wireMessage = new ByteArrayOutputStream();
        message.writeTo(wireMessage);
        String wire = wireMessage.toString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(wire.contains("Content-ID: <wattscape-mark>"));
        assertTrue(wire.contains("image/png"));
    }


    @Test void substitutesUntrustedValuesInOnePassAndEscapesHtmlContext() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        var service = new InvitationEmailService(sender, "local@wattscape.test", "http://localhost:3000");

        service.send("person@example.test", "Org ${role} & <script>alert(1)</script>", "Technician",
                "${expiresAt}-safe-token", Instant.parse("2030-01-01T00:00:00Z"));

        StringBuilder body = new StringBuilder();
        collectText(message, body);
        String content = body.toString();
        assertTrue(content.contains("Org ${role} &amp; &lt;script&gt;alert(1)&lt;/script&gt;"));
        assertTrue(content.contains("${expiresAt}-safe-token"));
        assertFalse(content.contains("Org Technician &"));
    }

    @Test void rejectsPublicAppUrlsWithCredentialsOrUnsupportedSchemes() {
        JavaMailSender sender = mock(JavaMailSender.class);
        assertThrows(IllegalArgumentException.class,
                () -> new InvitationEmailService(sender, "local@wattscape.test", "javascript:alert(1)"));
        assertThrows(IllegalArgumentException.class,
                () -> new InvitationEmailService(sender, "local@wattscape.test", "https://user:pass@example.test"));
    }

    @Test void hidesSmtpFailureBehindSafeServiceError() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("smtp down")).when(sender).send(any(MimeMessage.class));
        var service = new InvitationEmailService(sender, "local@wattscape.test", "http://localhost:3000");

        var error = assertThrows(ApiException.class,
                () -> service.send("person@example.test", "Example Org", "Technician", "secret-token", Instant.now()));

        assertEquals("The invitation email could not be delivered. Please try again later.", error.getMessage());
        assertFalse(error.getMessage().contains("secret-token"));
    }

    private static void collectText(Part part, StringBuilder text) throws Exception {
        Object content = part.getContent();
        if (content instanceof String value) {
            text.append(value);
        } else if (content instanceof Multipart multipart) {
            for (int index = 0; index < multipart.getCount(); index++) {
                BodyPart child = multipart.getBodyPart(index);
                if (child.isMimeType("text/*") || child.isMimeType("multipart/*")) collectText(child, text);
            }
        }
    }
}
