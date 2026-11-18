/* Canvas + Web Audio are kept local. MediaRecorder writes H.264/AAC MP4. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('videoForm');
  const options = $('videoFields');
  const list = $('videoSlides');
  const theme = $('videoTheme');
  const canvas = $('videoCanvas');
  const status = $('videoStatus');
  const result = $('videoResult');
  const download = $('videoDownload');
  const maxSlides = 16;
  const maxSeconds = 180;
  const maxAudioBytes = 10 * 1024 * 1024;
  const font = '"Noto Sans CJK KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  const speech = window.speechSynthesis;
  const starter = [
    { title: '어떤 정보를 받나요?', text: '' },
    { title: '왜 필요하고 언제 지우나요?', text: '' },
    { title: '내 정보가 궁금하면 어떻게 하나요?', text: '' }
  ];
  let selected;
  let busy;
  let imageTask;
  let resultUrl;
  let voiceChoices = [];
  const rows = () => [...list.children];
  const read = (row) => ({
    title: row.querySelector('[data-title]').value.trim(),
    text: row.querySelector('textarea').value.trim(),
    seconds: Number(row.querySelector('[data-seconds]').value),
    file: row.querySelector('[type=file]').files[0]
  });
  const report = (message) => { status.textContent = message; };
  const clearResult = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = undefined;
    result.removeAttribute('src');
    result.load();
    download.removeAttribute('href');
    result.hidden = download.hidden = true;
  };

  function addSlide(data = {}) {
    if (list.children.length >= maxSlides) return;
    const row = document.createElement('details');
    row.className = 'video-slide';
    row.innerHTML = `<summary></summary>
      <label>슬라이드 제목 <input data-title maxlength="45" required></label>
      <label>자막·읽을 내용 <textarea maxlength="150" rows="3" required></textarea></label>
      <label>기본 길이(초) <input data-seconds type="number" min="3" max="60" step="1" required></label>
      <label>슬라이드 음성 파일 <input type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"></label>
      <button type="button" class="btn" data-remove>이 슬라이드 삭제</button>`;
    row.querySelector('[data-title]').value = data.title || '';
    row.querySelector('textarea').value = data.text || '';
    row.querySelector('[data-seconds]').value = data.seconds || 10;
    row.querySelector('summary').addEventListener('click', () => { selected = row; refreshRows(); void preview(); });
    row.addEventListener('focusin', (event) => { if (event.target.tagName !== 'SUMMARY' && selected !== row) select(row); });
    row.querySelector('[data-remove]').addEventListener('click', () => {
      if (list.children.length <= 1) return;
      const next = row.nextElementSibling || row.previousElementSibling;
      row.remove(); refreshRows(); select(next);
    });
    list.append(row);
    refreshRows();
    select(row);
  }

  function refreshRows() {
    rows().forEach((row, index) => {
      row.querySelector('summary').textContent = `${index + 1}. ${read(row).title || '새 슬라이드'}`;
      row.classList.toggle('is-current', row === selected);
      row.querySelector('[data-remove]').disabled = list.children.length === 1;
    });
    $('videoAdd').disabled = list.children.length >= maxSlides;
  }

  function select(row) {
    selected = row;
    rows().forEach((item) => item.classList.toggle('is-current', item === row));
    if (row) row.open = true;
    void preview();
  }

  function loadCharacter() {
    const src = window.PolicyLabels.character(theme.value);
    const img = new Image();
    img.src = src;
    imageTask = img.decode().then(() => img);
    return imageTask;
  }

  function wrap(ctx, text, width) {
    const lines = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const char of paragraph) {
        if (line && ctx.measureText(line + char).width > width) {
          lines.push(line.trimEnd());
          line = '';
        }
        if (line || char !== ' ') line += char;
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }

  function paint(ctx, data, img, org, index, total, progress) {
    ctx.fillStyle = '#f5f0e5'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#18334f'; ctx.fillRect(0, 0, 1280, 116);
    ctx.font = '700 29px ' + font;
    ctx.fillStyle = '#fff'; ctx.fillText(org || '우리 기관', 66, 51, 1070);
    ctx.font = '500 22px ' + font; ctx.fillStyle = '#e2edf4';
    ctx.fillText('어린이용 개인정보 처리방침', 66, 88);
    ctx.fillStyle = '#fffdfa';
    ctx.beginPath(); ctx.roundRect(42, 147, 838, 488, 28); ctx.fill();
    ctx.fillStyle = '#17334e';
    let titleSize = 49;
    let titleLines;
    do {
      ctx.font = '700 ' + titleSize + 'px ' + font;
      titleLines = wrap(ctx, data.title || '슬라이드 제목', 742);
      if (titleLines.length <= 2) break;
      titleSize -= 2;
    } while (titleSize >= 28);
    titleLines.forEach((line, i) => ctx.fillText(line, 82, 211 + i * (titleSize + 9)));
    const body = (data.text || '여기에 어린이가 이해하기 쉬운 문장을 넣어 주세요.').replace(/\n{2,}/g, '\n');
    let size = 37;
    let lines;
    do {
      ctx.font = '500 ' + size + 'px ' + font;
      lines = wrap(ctx, body, 744);
      if (lines.length * (size + 13) <= 300) break;
      size -= 2;
    } while (size >= 19);
    const step = Math.min(size + 13, 295 / Math.max(1, lines.length));
    lines.forEach((line, i) => ctx.fillText(line, 82, 318 + i * step));
    ctx.drawImage(img, 904, 247, 301, 301);
    if (data.synthetic) {
      ctx.font = '600 21px ' + font; ctx.fillText('합성 음성', 953, 588);
    }
    ctx.font = '700 26px ' + font; ctx.fillText(`${index + 1} / ${total}`, 1118, 653);
    ctx.fillStyle = '#cbdadf'; ctx.fillRect(42, 679, 1196, 9);
    ctx.fillStyle = '#357f84'; ctx.fillRect(42, 679, 1196 * (index + progress) / total, 9);
  }

  async function preview() {
    if (!selected || busy || !imageTask) return;
    const row = selected;
    const task = imageTask;
    try {
      const img = await task;
      if (row === selected && task === imageTask && !busy) {
        const slides = rows();
        paint(canvas.getContext('2d'), read(row), img, $('videoOrg').value, slides.indexOf(row), slides.length, 0);
      }
    } catch {
      report('캐릭터 그림을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
    }
  }

  function updateVoices() {
    if (!speech) return;
    const field = $('videoVoice');
    const previous = field.value;
    voiceChoices = speech.getVoices().filter((voice) => voice.localService && /^ko\b/i.test(voice.lang));
    field.replaceChildren(new Option(voiceChoices.length ? '기기 기본 한국어 음성' : '기기에 한국어 음성 없음', ''));
    voiceChoices.forEach((voice, index) => field.add(new Option(voice.name, String(index))));
    if ([...field.options].some((item) => item.value === previous)) field.value = previous;
  }

  $('videoHear').addEventListener('click', () => {
    const text = read(selected).text;
    if (!text) return report('미리 들을 자막을 입력해 주세요.');
    if (!voiceChoices.length) return report('기기에 설치된 한국어 음성을 찾지 못했습니다. MP4에는 슬라이드별 음성 파일을 넣을 수 있습니다.');
    speech.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR'; utterance.voice = voiceChoices[Number($('videoVoice').value)] || voiceChoices[0];
    utterance.rate = Number($('videoRate').value);
    utterance.onerror = (event) => {
      if (!['canceled', 'interrupted'].includes(event.error)) report('기기 음성을 재생하지 못했습니다. 한국어 음성 설정을 확인해 주세요.');
    };
    speech.speak(utterance);
    report('선택한 슬라이드의 자막을 읽고 있습니다.');
    utterance.onend = () => report('미리 듣기를 마쳤습니다.');
  });

  const mime = () => ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1.42001f,mp4a.40.2']
    .find((type) => window.MediaRecorder?.isTypeSupported(type));
  const videoService = './api/video-tts';
  async function enableServerSpeech() {
    if (!window.APP_CONFIG.VIDEO_SERVER_TTS) return;
    try {
      const response = await fetch(videoService, { redirect: 'error', cache: 'no-store' });
      if (response.status === 401) $('videoSignIn').hidden = false;
      if (!response.ok || (await response.json()).available !== true) return;
      $('videoExportModeLabel').hidden = false;
      $('videoAudioHelp').textContent += ' 서버 음성합성을 선택하면 파일이 없는 슬라이드의 자막을 기관이 연결한 Microsoft Azure Speech로 보냅니다. 게시용 문구만 입력해 주세요.';
    } catch { /* Browser-local file mode is still available. */ }
  }

  function timing(slides, target) {
    const mins = slides.map((slide) => Math.max(3, slide.audio ? slide.audio.duration + .35 : 3));
    const minTotal = mins.reduce((a, b) => a + b, 0);
    if (!target) return slides.map((slide, index) => Math.max(mins[index], slide.seconds));
    if (minTotal > target) throw Error(`음성을 모두 담으려면 전체 길이가 최소 ${Math.ceil(minTotal)}초여야 합니다.`);
    const weights = slides.map((slide, index) => Math.max(1, slide.seconds - mins[index]));
    const total = weights.reduce((a, b) => a + b, 0);
    return mins.map((min, index) => min + (target - minTotal) * weights[index] / total);
  }

  async function decodeSlide(slide, index, context, signal) {
    const file = slide.file;
    let bytes;
    if (file) {
      if (!/\.(mp3|wav|m4a)$/i.test(file.name) || file.size > maxAudioBytes || !file.size) throw Error(`${index + 1}번 슬라이드에 10MB 이하의 MP3, WAV 또는 M4A를 넣어 주세요.`);
      bytes = await file.arrayBuffer();
      const header = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
      const signature = String.fromCharCode(...header);
      if (!(signature.startsWith('ID3') || (header[0] === 255 && (header[1] & 224) === 224) || (signature.startsWith('RIFF') && signature.endsWith('WAVE')) || signature.slice(4, 8) === 'ftyp')) {
        throw Error(`${index + 1}번 슬라이드 파일 형식을 확인해 주세요.`);
      }
    } else if ($('videoExportMode').value === 'tts') {
      report(`${index + 1}번 슬라이드 음성을 합성하는 중입니다.`);
      const response = await fetch(videoService, {
        method: 'POST', redirect: 'error', cache: 'no-store', signal,
        headers: { 'Content-Type': 'application/json', 'X-Video-Request': '1' },
        body: JSON.stringify({ text: slide.text, voice: $('videoTtsVoice').value, speed: Number($('videoRate').value) })
      });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/wav')) throw Error('서버 음성합성에 실패했습니다. 다시 로그인하거나 슬라이드별 음성 파일을 선택해 주세요.');
      bytes = await response.arrayBuffer();
      slide.synthetic = true;
    } else return;
    signal.throwIfAborted();
    try { slide.audio = await context.decodeAudioData(bytes); }
    catch { throw Error(`${index + 1}번 슬라이드의 음성 파일을 재생할 수 없습니다.`); }
    if (slide.audio.duration > 60) throw Error(`${index + 1}번 슬라이드 음성을 60초 이하로 줄여 주세요.`);
  }

  async function capture(slides, durations, graph, image, org, type, signal) {
    const { context, stream } = graph;
    const total = durations.reduce((a, b) => a + b, 0);
    const ends = durations.map((_, i) => durations.slice(0, i + 1).reduce((a, b) => a + b, 0));
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 3300000, audioBitsPerSecond: 128000 });
    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      recorder.onerror = () => reject(Error('MP4 인코딩에 실패했습니다. 최신 Chrome 또는 Edge에서 다시 시도해 주세요.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
    });
    // Attach rejection handling even if recording fails during setup.
    void done.catch(() => {});
    const ctx = canvas.getContext('2d');
    let tick;
    const sources = [];
    const stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };
    const hidden = () => { if (document.hidden) busy?.abort('제작 중에는 영상 화면을 열어 두어야 합니다.'); };
    try {
      signal.throwIfAborted();
      paint(ctx, slides[0], image, org, 0, slides.length, 0);
      recorder.start(1000);
      const start = context.currentTime + .12;
      slides.forEach((slide, index) => {
        if (!slide.audio) return;
        const audio = context.createBufferSource();
        audio.buffer = slide.audio; audio.connect(graph.destination);
        audio.start(start + (ends[index - 1] || 0) + .12);
        sources.push(audio);
      });
      tick = setInterval(() => {
        const elapsed = Math.max(0, context.currentTime - start);
        if (elapsed >= total) return stop();
        const index = ends.findIndex((end) => elapsed < end);
        paint(ctx, slides[index], image, org, index, slides.length, (elapsed - (ends[index - 1] || 0)) / durations[index]);
        const message = `MP4 제작 중 · ${Math.floor(elapsed)} / ${Math.ceil(total)}초`;
        if (status.textContent !== message) report(message);
      }, 1000 / 30);
      signal.addEventListener('abort', stop, { once: true });
      document.addEventListener('visibilitychange', hidden);
      hidden();
      const blob = await done;
      signal.throwIfAborted();
      if (!blob.size) throw Error('영상 데이터가 비어 있습니다. 다시 시도해 주세요.');
      return blob;
    } finally {
      clearInterval(tick); stop();
      signal.removeEventListener('abort', stop);
      document.removeEventListener('visibilitychange', hidden);
      sources.forEach((source) => { source.stop(); source.disconnect(); });
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const slides = rows().map(read);
    const org = $('videoOrg').value.trim();
    const target = Number($('videoDuration').value);
    if (!org || slides.some((slide) => !slide.title || !slide.text)) return report('기관명과 모든 슬라이드의 제목과 자막을 입력해 주세요.');
    const type = mime();
    if (!type || !canvas.captureStream || !window.AudioContext) return report('현재 브라우저에서 MP4(H.264/AAC) 저장을 지원하지 않습니다. 최신 Chrome 또는 Edge에서 열어 주세요.');
    const job = new AbortController();
    busy = job;
    let graph;
    options.disabled = true; $('videoCancel').hidden = false;
    try {
      clearResult();
      speech?.cancel();
      report('슬라이드와 음성을 준비하는 중입니다.');
      if (slides.reduce((sum, slide) => sum + (slide.file?.size || 0), 0) > 40 * 1024 * 1024) throw Error('전체 음성 파일을 40MB 이하로 줄여 주세요.');
      const context = new AudioContext({ sampleRate: 48000 });
      graph = { context };
      await context.resume();
      for (const [index, slide] of slides.entries()) await decodeSlide(slide, index, context, job.signal);
      const durations = timing(slides, target);
      if (durations.reduce((a, b) => a + b, 0) > maxSeconds) throw Error('영상 길이를 3분 이하로 조정해 주세요.');
      const destination = context.createMediaStreamDestination();
      // Keep an AAC track even on slides with subtitles only.
      const silence = context.createConstantSource();
      silence.offset.value = 0; silence.connect(destination); silence.start();
      const stream = canvas.captureStream(30);
      destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      Object.assign(graph, { stream, destination });
      const blob = await capture(slides, durations, graph, await imageTask, org, type, job.signal);
      resultUrl = URL.createObjectURL(blob);
      download.href = resultUrl; result.src = resultUrl;
      download.hidden = result.hidden = false;
      report('MP4 제작이 완료되었습니다. 영상을 확인하고 다운로드하세요.');
    } catch (error) {
      report(job.signal.aborted ? String(job.signal.reason) : error.message);
    } finally {
      graph?.stream?.getTracks().forEach((track) => track.stop());
      if (graph?.context && graph.context.state !== 'closed') await graph.context.close().catch(() => {});
      busy = undefined;
      options.disabled = false; $('videoCancel').hidden = true; void preview();
    }
  });

  $('videoCancel').addEventListener('click', () => busy?.abort('영상 제작을 취소했습니다.'));
  $('videoAdd').addEventListener('click', () => addSlide());
  $('audVideo').addEventListener('click', () => {
    if (busy || (form.dataset.edited && !window.confirm('현재 슬라이드를 어린이용 처리방침 내용으로 교체할까요?'))) return;
    const data = window.APP.audienceData('child');
    $('videoOrg').value = window.APP.org || '';
    list.replaceChildren();
    const imported = [
      { title: data.title, text: data.intro },
      ...data.cards.map((card) => ({ title: card.q, text: card.a.join(' ') })),
      { title: '어디에 물어보나요?', text: data.help }
    ];
    imported.flatMap(({ title, text }) => (text || '').match(/[\s\S]{1,150}/gu)?.map((part, i) => ({
      title: (i ? title.slice(0, 41) + ' (계속)' : title.slice(0, 45)), text: part
    })) || []).slice(0, maxSlides).forEach(addSlide);
    rows().forEach((row, i) => { row.open = i === 0; });
    select(list.firstElementChild);
    form.dataset.edited = '1';
    $('videoStudio').scrollIntoView({ behavior: 'smooth' });
  });

  Object.entries(window.PolicyLabels.themes).forEach(([key, label]) => theme.add(new Option(label, key)));
  theme.value = 'child';
  void loadCharacter();
  starter.forEach(addSlide);
  rows().forEach((row, i) => { row.open = i === 0; });
  select(list.firstElementChild);
  speech?.addEventListener('voiceschanged', updateVoices);
  updateVoices();
  void enableServerSpeech();
  $('videoExportMode').addEventListener('change', (event) => { $('videoTtsVoiceLabel').hidden = event.target.value !== 'tts'; });
  form.addEventListener('input', (event) => {
    form.dataset.edited = '1';
    if (event.target === theme) void loadCharacter();
    refreshRows(); void preview();
  });
  // Expand invalid fields before native validation focuses them.
  form.addEventListener('invalid', (event) => { const row = event.target.closest('details'); if (row) row.open = true; }, true);
})();
