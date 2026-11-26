package com.wattscape.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.slf4j.MDC;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean SecurityFilterChain apiSecurity(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        return http.csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request,response,ex) -> writeProblem(objectMapper,response,401,"Unauthorized","A valid access token is required"))
                .accessDeniedHandler((request,response,ex) -> writeProblem(objectMapper,response,403,"Forbidden","The authenticated identity is not permitted to access this resource")))
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/actuator/prometheus").hasRole("ADMIN")
                .requestMatchers("/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").hasRole("ADMIN")
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/v1/auth/providers").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/telemetry/ingest/**").permitAll()
                .requestMatchers("/api/v1/onboarding/**").hasAnyRole("ADMIN", "MEMBER")
                .requestMatchers(HttpMethod.POST, "/api/v1/**").hasAnyRole("ADMIN", "MEMBER")
                .requestMatchers(HttpMethod.PUT, "/api/v1/**").hasAnyRole("ADMIN", "MEMBER")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/**").hasAnyRole("ADMIN", "MEMBER")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/**").hasAnyRole("ADMIN", "MEMBER")
                .requestMatchers(HttpMethod.GET, "/api/v1/**").hasAnyRole("ADMIN", "MEMBER")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth
                .authenticationEntryPoint((request,response,ex) -> writeProblem(objectMapper,response,401,"Unauthorized","A valid access token is required"))
                .accessDeniedHandler((request,response,ex) -> writeProblem(objectMapper,response,403,"Forbidden","The authenticated identity is not permitted to access this resource"))
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
            .build();
    }
    @Bean JwtAuthenticationConverter jwtAuthenticationConverter() {
        var scopes = new JwtGrantedAuthoritiesConverter();
        var converter = new JwtAuthenticationConverter();
        Converter<Jwt, Collection<GrantedAuthority>> authorities = jwt -> {
            List<GrantedAuthority> result = new ArrayList<>(scopes.convert(jwt));
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            Object roles = realmAccess == null ? null : realmAccess.get("roles");
            if (roles instanceof Collection<?> roleNames) {
                for (Object role : roleNames) {
                    if (role instanceof String name && name.matches("[A-Z][A-Z0-9_]{0,63}")) {
                        result.add(new SimpleGrantedAuthority("ROLE_" + name));
                    }
                }
            }
            return result;
        };
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }
    private static void writeProblem(ObjectMapper mapper, jakarta.servlet.http.HttpServletResponse response, int status, String title, String detail) throws java.io.IOException {
        response.setStatus(status); response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        var body=ProblemDetail.forStatusAndDetail(org.springframework.http.HttpStatus.valueOf(status),detail); body.setTitle(title);
        String id=MDC.get("requestId"); if(id!=null) body.setProperty("requestId",id); mapper.writeValue(response.getOutputStream(),body);
    }
    @Bean CorsConfigurationSource corsConfigurationSource(@Value("${wattscape.security.cors-origins}") String origins) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Request-Id", "Idempotency-Key", "X-Organization-Id"));
        config.setExposedHeaders(Arrays.asList("X-Request-Id", "Location"));
        config.setAllowCredentials(false);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
