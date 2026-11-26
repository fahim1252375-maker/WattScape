package com.wattscape.organization;

import java.time.Instant;

/** Ephemeral post-commit event; raw token is never persisted or logged. */
public record InvitationEmailRequested(String recipient, String organization, String role, String token, Instant expiresAt) {}
