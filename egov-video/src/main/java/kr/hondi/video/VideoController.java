package kr.hondi.video;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
final class VideoController {
    private static final int MAX_BODY = 4096;
    private static final int MAX_ACTIVE_USERS = 2048;
    private static final long WINDOW_NANOS = Duration.ofMinutes(5).toNanos();
    private static final MediaType WAV = MediaType.parseMediaType("audio/wav");
    private final org.slf4j.Logger log = LoggerFactory.getLogger("hondi.audit");
    private final Map<String, Window> limits = new LinkedHashMap<>();
    private final String publicOrigin;
    private final SpeechService speech;
    private final ObjectMapper json;

    VideoController(SpeechService speech, ObjectMapper json, @Value("${hondi.public-origin}") String publicOrigin) {
        var origin = URI.create(publicOrigin);
        if (!"https".equals(origin.getScheme()) || origin.getHost() == null || !publicOrigin.equals("https://" + origin.getRawAuthority())
                || origin.getUserInfo() != null) throw new IllegalArgumentException("An HTTPS public origin is required");
        this.publicOrigin = publicOrigin;
        this.speech = speech;
        this.json = json;
    }

    @GetMapping("/api/video-tts")
    ResponseEntity<Map<String, Boolean>> capability() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("available", speech.enabled()));
    }

    @PostMapping(path = "/api/video-tts", consumes = "application/json", produces = "audio/wav")
    ResponseEntity<byte[]> synthesize(@AuthenticationPrincipal OidcUser user, HttpServletRequest request) {
        if (!publicOrigin.equals(request.getHeader("Origin")) || !"1".equals(request.getHeader("X-Video-Request"))) return fail("video_origin_denied", 403);
        if (!speech.enabled()) return fail("video_unavailable", 503);
        if (!allow(user.getSubject())) return fail("video_rate_denied", 429);
        Input input;
        try {
            byte[] body = request.getInputStream().readNBytes(MAX_BODY + 1);
            if (body.length > MAX_BODY) return fail("video_size_denied", 413);
            input = json.readerFor(Input.class).with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readValue(body);
        } catch (IOException invalid) {
            return fail("video_input_denied", 400);
        }
        if (input == null || !speech.valid(input.text(), input.voice(), input.speed())) return fail("video_input_denied", 400);
        try {
            byte[] audio = speech.synthesize(input.text(), input.voice(), input.speed());
            if (audio == null) return fail("video_quota_busy", 429);
            log.info("event=video_tts_generated status=200");
            return ResponseEntity.ok().contentType(WAV).cacheControl(CacheControl.noStore()).body(audio);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return fail("video_upstream_interrupted", 503);
        } catch (IOException unavailable) {
            return fail("video_upstream_error", 502);
        }
    }

    private ResponseEntity<byte[]> fail(String event, int status) {
        log.warn("event={} status={}", event, status);
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).build();
    }

    private synchronized boolean allow(String subject) {
        long now = System.nanoTime();
        limits.values().removeIf(window -> now - window.start() >= WINDOW_NANOS);
        Window window = limits.get(subject);
        if (window == null) {
            if (limits.size() >= MAX_ACTIVE_USERS) return false;
            limits.put(subject, new Window(now, 1));
            return true;
        }
        if (window.count() >= 24) return false;
        limits.put(subject, new Window(window.start(), window.count() + 1));
        return true;
    }

    record Input(String text, String voice, double speed) {}
    private record Window(long start, int count) {}
}
