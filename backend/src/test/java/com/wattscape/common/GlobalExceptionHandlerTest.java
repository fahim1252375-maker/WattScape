package com.wattscape.common;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final HttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/sites");

    @Test void authenticationFailuresBecome401() {
        var response = handler.authentication(new BadCredentialsException("bad credentials"), request);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("A valid authenticated identity is required", response.getBody().getDetail());
    }

    @Test void authorizationFailuresBecome403() {
        var response = handler.denied(new AccessDeniedException("not allowed"), request);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("The authenticated identity is not permitted to access this resource", response.getBody().getDetail());
    }

    @Test void unexpectedFailuresReturnSafe500WithoutOriginalMessage() {
        var response = handler.internal(new IllegalStateException("secret database host"), request);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("An unexpected error occurred", response.getBody().getDetail());
    }
}
