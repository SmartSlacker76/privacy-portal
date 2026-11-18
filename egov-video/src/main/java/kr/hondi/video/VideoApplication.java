package kr.hondi.video;

import java.util.List;

import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;

@SpringBootApplication
public class VideoApplication {
    public static void main(String[] args) {
        SpringApplication.run(VideoApplication.class, args);
    }

    @Bean
    SecurityFilterChain videoSecurity(HttpSecurity http, @Value("${hondi.video-group}") String group) throws Exception {
        if (group.isBlank()) throw new IllegalArgumentException("Video group is required");
        var log = LoggerFactory.getLogger("hondi.audit");
        // Same-origin custom header is mandatory for API POST; the server never enables CORS.
        http.csrf(csrf -> csrf.ignoringRequestMatchers(request ->
                "POST".equals(request.getMethod()) && "/api/video-tts".equals(request.getServletPath())));
        http.headers(headers -> headers.frameOptions(frame -> frame.deny()));
        http.oauth2Login(login -> login.defaultSuccessUrl("/policy.html#videoStudio", true));
        http.authorizeHttpRequests(rules -> rules
                .requestMatchers("/oauth2/authorization/office", "/login/oauth2/code/office").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/video-tts")
                .access((auth, context) -> authorize(auth.get().getPrincipal(), group))
                .requestMatchers(HttpMethod.POST, "/api/video-tts")
                .access((auth, context) -> authorize(auth.get().getPrincipal(), group))
                .anyRequest().denyAll());
        http.exceptionHandling(errors -> errors
                .authenticationEntryPoint((req, res, ex) -> {
                    log.warn("event=video_authentication_required status=401");
                    res.setStatus(401);
                })
                .accessDeniedHandler((req, res, ex) -> {
                    log.warn("event=video_access_denied status=403");
                    res.setStatus(403);
                }));
        return http.build();
    }

    private static AuthorizationDecision authorize(Object principal, String group) {
        if (!(principal instanceof OidcUser user)) return new AuthorizationDecision(false);
        Object groups = user.getIdToken().getClaims().get("groups");
        return new AuthorizationDecision(groups instanceof List<?> list && list.contains(group));
    }
}
