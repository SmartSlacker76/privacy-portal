/* Optional browser-local fallback using FFmpeg.wasm core (GPL-2.0-or-later).
 * Upstream sources and license: https://github.com/ffmpegwasm/ffmpeg.wasm
 */
const release = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/';
const files = {
  'ffmpeg-core.js': [112059, 'b266ab5b952555881dd6310663986994a182acb2b7ff25cf10a25f7a37ac2b21'],
  'ffmpeg-core.wasm': [32232419, '9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7']
};

async function verifiedFile(name) {
  const [size, expected] = files[name];
  const response = await fetch(release + name, {
    credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(90000)
  });
  if (!response.ok || !response.body) throw Error('load');
  const buffer = new Uint8Array(size);
  const reader = response.body.getReader();
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.length > size) throw Error('size');
      buffer.set(value, length);
      length += value.length;
    }
  } finally { await reader.cancel(); }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  if (length !== size || [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('') !== expected) throw Error('integrity');
  return buffer;
}

self.onmessage = async ({ data: { frames, seconds, audio } }) => {
  let core;
  try {
    const [script, binary] = await Promise.all([verifiedFile('ffmpeg-core.js'), verifiedFile('ffmpeg-core.wasm')]);
    const scriptUrl = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
    try { importScripts(scriptUrl); } finally { URL.revokeObjectURL(scriptUrl); }
    core = await createFFmpegCore({ wasmBinary: binary });
  } catch {
    postMessage({ error: 'MP4 인코더를 불러오지 못했습니다. 네트워크를 확인하거나 MP4 녹화를 지원하는 Chrome 또는 Edge를 사용해 주세요.' });
    return;
  }

  try {
    const total = seconds.reduce((sum, current) => sum + current, 0);
    const entries = frames.map((frame, i) => {
      const name = 'slide' + i + '.jpg';
      core.FS.writeFile(name, new Uint8Array(frame));
      return 'file ' + name + '\nduration ' + seconds[i].toFixed(6);
    });
    entries.push('file slide' + (frames.length - 1) + '.jpg');
    core.FS.writeFile('slides.txt', entries.join('\n') + '\n');
    core.FS.writeFile('voice.wav', new Uint8Array(audio));
    let displayed = -1;
    core.setProgress(({ time }) => {
      const percent = Math.max(0, Math.min(99, Math.floor(time / 1e6 * 100 / total)));
      if (percent > displayed) { displayed = percent; postMessage({ percent }); }
    });
    const code = core.exec(
      '-f', 'concat', '-safe', '1', '-i', 'slides.txt', '-i', 'voice.wav', '-t', total.toFixed(6),
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast',
      '-r', '24', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', 'result.mp4'
    );
    if (code !== 0) throw Error('encoding failed');
    const video = core.FS.readFile('result.mp4');
    postMessage({ video }, [video.buffer]);
  } catch {
    postMessage({ error: 'MP4 인코딩에 실패했습니다. 영상 길이를 줄인 뒤 다시 시도해 주세요.' });
  }
};
