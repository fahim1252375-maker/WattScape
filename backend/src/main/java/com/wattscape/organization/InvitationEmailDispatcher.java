package com.wattscape.organization;

import com.wattscape.common.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class InvitationEmailDispatcher {
    private static final Logger log = LoggerFactory.getLogger(InvitationEmailDispatcher.class);
    private final InvitationEmailService email;

    public InvitationEmailDispatcher(InvitationEmailService email) { this.email = email; }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendAfterCommit(InvitationEmailRequested event) {
        try {
            email.send(event.recipient(), event.organization(), event.role(), event.token(), event.expiresAt());
        } catch (ApiException failure) {
            // The invitation is already committed. Never turn an SMTP outage into a misleading rollback.
            log.error("Committed invitation email dispatch failed requestId={} exceptionType={}",
                    MDC.get("requestId"), failure.getClass().getSimpleName());
        } catch (RuntimeException failure) {
            log.error("Committed invitation email dispatch failed requestId={} exceptionType={}",
                    MDC.get("requestId"), failure.getClass().getSimpleName());
        }
    }
}
