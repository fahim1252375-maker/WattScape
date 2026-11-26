package com.wattscape.organization;

import com.wattscape.common.ApiException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class InvitationEmailService {
    private static final Logger log = LoggerFactory.getLogger(InvitationEmailService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter
            .ofPattern("MMMM d, yyyy 'at' HH:mm 'UTC'").withZone(ZoneOffset.UTC);

    private final JavaMailSender mailSender;
    private final String from;
    private final String appUrl;

    public InvitationEmailService(JavaMailSender mailSender,
                                  @Value("${wattscape.mail.from}") String from,
                                  @Value("${wattscape.mail.app-url}") String appUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.appUrl = validateAppUrl(appUrl);
    }

    public void send(String to, String organization, String role, String token, Instant expiresAt) {
        try {
            String html = template("templates/invitation-email.html", Map.of(
                    "organization", HtmlUtils.htmlEscape(organization),
                    "role", HtmlUtils.htmlEscape(role),
                    "token", HtmlUtils.htmlEscape(token),
                    "expiresAt", DATE.format(expiresAt),
                    "appUrl", HtmlUtils.htmlEscape(appUrl)));
            String plain = template("templates/invitation-email.txt", Map.of(
                    "organization", organization,
                    "role", role,
                    "token", token,
                    "expiresAt", DATE.format(expiresAt),
                    "appUrl", appUrl));

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("You’re invited to WattScape");
            helper.setText(plain, html);
            helper.addInline("wattscape-mark", new ClassPathResource("static/mail/wattscape-mark.png"), "image/png");
            mailSender.send(message);
        } catch (MailException | MessagingException exception) {
            log.warn("Invitation email delivery failed requestId={} exceptionType={}",
                    MDC.get("requestId"), exception.getClass().getSimpleName());
            throw ApiException.serviceUnavailable("The invitation email could not be delivered. Please try again later.");
        }
    }

    private static String validateAppUrl(String configured) {
        URI uri;
        try {
            uri = URI.create(configured);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("WattScape public app URL must be an absolute HTTP(S) URL", exception);
        }
        if (uri.getHost() == null || uri.getUserInfo() != null || uri.getRawFragment() != null
                || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
            throw new IllegalArgumentException("WattScape public app URL must be an absolute HTTP(S) URL without credentials or a fragment");
        }
        return uri.toASCIIString();
    }

    private static String template(String name, Map<String, String> values) {
        try (var input = new ClassPathResource(name).getInputStream()) {
            String source = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            var matcher = java.util.regex.Pattern.compile("\\$\\{([A-Za-z][A-Za-z0-9]*)}").matcher(source);
            StringBuffer result = new StringBuffer();
            while (matcher.find()) {
                String replacement = values.getOrDefault(matcher.group(1), matcher.group());
                matcher.appendReplacement(result, java.util.regex.Matcher.quoteReplacement(replacement));
            }
            matcher.appendTail(result);
            return result.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Invitation email template is unavailable", exception);
        }
    }
}
