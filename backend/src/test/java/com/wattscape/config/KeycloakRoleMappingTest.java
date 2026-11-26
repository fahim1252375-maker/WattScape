package com.wattscape.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class KeycloakRoleMappingTest {
    @Test void realmAccessRolesBecomeSpringRoleAuthorities(){
      var jwt=Jwt.withTokenValue("test-token").header("alg","RS256").subject("user-1")
        .claim("realm_access",Map.of("roles",List.of("ADMIN","MEMBER","invalid role"))).build();
      var auth=new SecurityConfig().jwtAuthenticationConverter().convert(jwt);
      assertThat(auth.getAuthorities()).extracting("authority").contains("ROLE_ADMIN","ROLE_MEMBER").doesNotContain("ROLE_invalid role");
    }
}
