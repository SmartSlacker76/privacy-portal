package kr.hondi.video;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Semaphore;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
final class SpeechService extends EgovAbstractServiceImpl {
    private static final Map<String, String> VOICES = Map.of(
            "sunhi", "ko-KR-SunHiNeural", "injoon", "ko-KR-InJoonNeural", "jimin", "ko-KR-JiMinNeural");
    private static final Set<Double> SPEEDS = Set.of(0.85, 1.0, 1.12);
    private static final int MAX_WAV_BYTES = 3 * 1024 * 1024;

    private final String key;
    private final URI endpoint;
    private final Semaphore jobs = new Semaphore(3);
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();

    SpeechService(@Value("${hondi.speech-key}") String key, @Value("${hondi.speech-region}") String region) {
        this.key = key;
        if (!key.isBlank() && !region.matches("[a-z][a-z0-9]{1,24}")) throw new IllegalArgumentException("Invalid speech region");
        this.endpoint = key.isBlank() ? null : URI.create("https://" + region + ".tts.speech.microsoft.com/cognitiveservices/v1");
    }

    boolean enabled() {
        return endpoint != null;
    }

    boolean valid(String text, String voice, double speed) {
        return text != null && !text.isBlank() && text.length() <= 150
                && text.codePoints().noneMatch(c -> (Character.isISOControl(c) && c != '\n') || (c >= 0xd800 && c <= 0xdfff) || c == 0xfffe || c == 0xffff)
                && voice != null && VOICES.containsKey(voice) && SPEEDS.contains(speed);
    }

    byte[] synthesize(String text, String voice, double speed) throws IOException, InterruptedException {
        if (!jobs.tryAcquire()) return null;
        try {
            String escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
            String ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'>"
                    + "<voice name='" + VOICES.get(voice) + "'><prosody rate='" + Math.round(speed * 100)
                    + "%'>" + escaped + "</prosody></voice></speak>";
            var request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(18))
                    .header("Ocp-Apim-Subscription-Key", key)
                    .header("Content-Type", "application/ssml+xml; charset=utf-8")
                    .header("X-Microsoft-OutputFormat", "riff-24khz-16bit-mono-pcm")
                    .POST(HttpRequest.BodyPublishers.ofString(ssml)).build();
            var response = client.send(request, info -> {
                if (info.statusCode() != 200 || info.headers().firstValueAsLong("Content-Length").orElse(0L) > MAX_WAV_BYTES) {
                    return new LimitedBody(0);
                }
                return HttpResponse.BodySubscribers.buffering(new LimitedBody(MAX_WAV_BYTES), 8192);
            });
            byte[] bytes = response.body();
            if (bytes.length < 44 || bytes[0] != 'R' || bytes[1] != 'I' || bytes[2] != 'F' || bytes[3] != 'F'
                    || bytes[8] != 'W' || bytes[9] != 'A' || bytes[10] != 'V' || bytes[11] != 'E') {
                throw new IOException("Unexpected speech response");
            }
            return bytes;
        } finally {
            jobs.release();
        }
    }
    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private final int limit;
        private Flow.Subscription subscription;

        LimitedBody(int limit) { this.limit = limit; }
        public CompletionStage<byte[]> getBody() { return result; }
        public void onSubscribe(Flow.Subscription source) {
            subscription = source;
            source.request(1);
        }
        public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) {
                if (buffer.remaining() > limit - bytes.size()) {
                    subscription.cancel();
                    result.completeExceptionally(new IOException("Speech response exceeds size limit"));
                    return;
                }
                byte[] block = new byte[buffer.remaining()];
                buffer.get(block);
                bytes.writeBytes(block);
            }
            subscription.request(1);
        }
        public void onError(Throwable error) { result.completeExceptionally(error); }
        public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
