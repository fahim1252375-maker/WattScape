package com.wattscape.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.net.URI;
import java.util.Map;
import java.util.TreeMap;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(ApiException.class) ResponseEntity<ProblemDetail> api(ApiException ex, HttpServletRequest req) {
        return problem(ex.status(), ex.getMessage(), req, null);
    }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String,String> errors = new TreeMap<>();
        for (FieldError e : ex.getBindingResult().getFieldErrors()) errors.putIfAbsent(e.getField(), e.getDefaultMessage());
        return problem(HttpStatus.BAD_REQUEST, "Request validation failed", req, errors);
    }
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class) ResponseEntity<ProblemDetail> malformed(org.springframework.http.converter.HttpMessageNotReadableException ex, HttpServletRequest req) {
        return problem(HttpStatus.BAD_REQUEST, "Request body is invalid or malformed", req, null);
    }
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class) ResponseEntity<ProblemDetail> typeMismatch(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        return problem(HttpStatus.BAD_REQUEST, "A request parameter has an invalid value", req, null);
    }
    @ExceptionHandler(ConstraintViolationException.class) ResponseEntity<ProblemDetail> constraint(ConstraintViolationException ex, HttpServletRequest req) {
        return problem(HttpStatus.BAD_REQUEST, "Request validation failed", req, Map.of("request", "A request value violates a constraint"));
    }
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<ProblemDetail> conflict(DataIntegrityViolationException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT, "The request conflicts with existing data", req, null);
    }
    @ExceptionHandler({org.springframework.dao.OptimisticLockingFailureException.class, jakarta.persistence.OptimisticLockException.class})
    ResponseEntity<ProblemDetail> optimisticConflict(Exception ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT, "The resource changed in another request; reload and retry", req, null);
    }
    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    ResponseEntity<ProblemDetail> authentication(org.springframework.security.core.AuthenticationException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED, "A valid authenticated identity is required", req, null);
    }
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    ResponseEntity<ProblemDetail> denied(org.springframework.security.access.AccessDeniedException ex, HttpServletRequest req) {
        return problem(HttpStatus.FORBIDDEN, "The authenticated identity is not permitted to access this resource", req, null);
    }
    @ExceptionHandler(Exception.class) ResponseEntity<ProblemDetail> internal(Exception ex, HttpServletRequest req) {
        log.error("Unhandled request failure requestId={} exceptionType={}", MDC.get("requestId"), ex.getClass().getSimpleName());
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", req, null);
    }
    private ResponseEntity<ProblemDetail> problem(HttpStatus status, String detail, HttpServletRequest req, Map<String,String> errors) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setTitle(status.getReasonPhrase()); body.setType(URI.create("https://wattscape.example/problems/" + status.value()));
        body.setInstance(URI.create(req.getRequestURI()));
        String requestId = MDC.get("requestId"); if (requestId != null) body.setProperty("requestId", requestId);
        if (errors != null) body.setProperty("errors", errors);
        return ResponseEntity.status(status).body(body);
    }
}
