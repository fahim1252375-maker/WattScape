package com.wattscape.organization;

import com.wattscape.identity.CurrentIdentity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class InvitationRateLimiter {
 private final JdbcTemplate jdbc; private final CurrentIdentity identity;
 public InvitationRateLimiter(JdbcTemplate jdbc,CurrentIdentity identity){this.jdbc=jdbc;this.identity=identity;}
 @Transactional(propagation=Propagation.REQUIRES_NEW)
 public boolean acquire(Authentication auth){
   String rateKey=sha256(identity.issuer(auth)+"\u0000"+identity.subject(auth));
   Integer count=jdbc.queryForObject("""
     INSERT INTO invitation_rate_limits(rate_key,window_started_at,request_count) VALUES (?,now(),1)
     ON CONFLICT(rate_key) DO UPDATE SET
       request_count=CASE WHEN invitation_rate_limits.window_started_at < now()-interval '1 hour' THEN 1 ELSE invitation_rate_limits.request_count+1 END,
       window_started_at=CASE WHEN invitation_rate_limits.window_started_at < now()-interval '1 hour' THEN now() ELSE invitation_rate_limits.window_started_at END
     RETURNING request_count
     """,Integer.class,rateKey);
   return count!=null&&count<=5;
 }
 private static String sha256(String value){try{return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
