package com.wattscape.site;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest @org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase(replace=org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE)
class SiteRepositoryTest {
 @Container static final PostgreSQLContainer<?> POSTGRES=new PostgreSQLContainer<>("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry registry){registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);registry.add("spring.datasource.username",POSTGRES::getUsername);registry.add("spring.datasource.password",POSTGRES::getPassword);}
 @Autowired SiteRepository sites; @Autowired JdbcTemplate jdbc;
 @Test void siteQueriesRemainScopedToOrganization(){
  UUID org1=UUID.randomUUID(),org2=UUID.randomUUID(); java.time.OffsetDateTime now=java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC);
  jdbc.update("INSERT INTO organizations(id,name,legal_name,created_at,updated_at) VALUES (?,?,?,?,?)",org1,"One","One LLC",now,now);
  jdbc.update("INSERT INTO organizations(id,name,legal_name,created_at,updated_at) VALUES (?,?,?,?,?)",org2,"Two","Two LLC",now,now);
  sites.saveAndFlush(new Site(org1,"North","N01",null,null,"UTC",null,null,null,null));
  sites.saveAndFlush(new Site(org2,"South","S01",null,null,"UTC",null,null,null,null));
  assertThat(sites.findAllByOrganizationIdOrderByName(org1)).extracting(Site::getCode).containsExactly("N01");
 }
}
