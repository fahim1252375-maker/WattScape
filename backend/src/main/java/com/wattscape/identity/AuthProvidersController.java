package com.wattscape.identity;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/v1/auth")
public class AuthProvidersController {
 private final boolean google; private final boolean apple;
 public AuthProvidersController(@Value("${wattscape.auth.google-enabled:false}") boolean google,@Value("${wattscape.auth.apple-enabled:false}") boolean apple){this.google=google;this.apple=apple;}
 @GetMapping("/providers") public Providers providers(){return new Providers(google,apple);}
 public record Providers(boolean googleEnabled,boolean appleEnabled){}
}
