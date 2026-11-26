package com.wattscape.organization;

import com.wattscape.common.ApiException;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;

class InvitationEmailDispatcherTest {
    private final InvitationEmailService email = mock(InvitationEmailService.class);
    private final InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(email);
    private final InvitationEmailRequested event = new InvitationEmailRequested(
            "member@example.test", "Example Org", "Technician", "one-time-token", Instant.parse("2030-01-01T00:00:00Z"));

    @Test void listenerRunsOnlyAfterCommit() throws Exception {
        var annotation = InvitationEmailDispatcher.class.getMethod("sendAfterCommit", InvitationEmailRequested.class)
                .getAnnotation(TransactionalEventListener.class);
        assertEquals(TransactionPhase.AFTER_COMMIT, annotation.phase());
    }

    @Test void sendsUsingTheEphemeralEventAfterCommit() {
        dispatcher.sendAfterCommit(event);
        verify(email).send(event.recipient(), event.organization(), event.role(), event.token(), event.expiresAt());
    }

    @Test void emailFailureDoesNotInvalidateCommittedInvitation() {
        doThrow(ApiException.serviceUnavailable("mail unavailable")).when(email)
                .send(anyString(), anyString(), anyString(), anyString(), any(Instant.class));
        assertDoesNotThrow(() -> dispatcher.sendAfterCommit(event));
    }
}
