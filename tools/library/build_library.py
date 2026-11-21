# -*- coding: utf-8 -*-
"""참고자료 63종 → 브라우저 검색용 카탈로그·본문 조각(shard) 생성기.

입력: extract 단계의 all_pages.json (pdftotext 결과 + 깨진/이미지 쪽은 Tesseract kor+eng OCR)
      가명정보 서식 zip(HWP 10종)
출력: assets/data/library/catalog.js, shard-1..5.json, 그리고 카탈로그 CSV
사용: python3 tools/library/build_library.py <all_pages.json> <원본폴더> <출력폴더>
"""
import json, re, sys, os, csv, zipfile, zlib, struct, io, collections
sys.path.insert(0, os.path.dirname(__file__))
import catalog_meta as M

pages_json, src_dir, out_dir = sys.argv[1:4]
os.makedirs(out_dir, exist_ok=True)

LEADER = re.compile(r'(?:[·‧∙・․…‥.ㆍ•]\s*){4,}')
CTRL = re.compile(r'[\x00-\x08\x0b-\x1f\x7f�-]')

def clean_line(s):
    s = CTRL.sub(' ', s)
    s = LEADER.sub(' … ', s)
    s = re.sub(r'[ \t　]+', ' ', s)
    return s.strip()

def norm_key(s):
    return re.sub(r'[\d\s|·.\-–]+', '', s)

def chunk_page(text, size=650, minlen=60):
    lines = [clean_line(x) for x in text.split('\n')]
    lines = [x for x in lines if x]
    out, cur = [], ''
    for ln in lines:
        if len(cur) + len(ln) + 1 > size and len(cur) >= minlen:
            out.append(cur); cur = ln
        else:
            cur = (cur + ' ' + ln).strip() if cur else ln
    if cur:
        if out and len(cur) < minlen: out[-1] += ' ' + cur
        else: out.append(cur)
    return out

def hwp_text(data):
    import olefile
    ole = olefile.OleFileIO(io.BytesIO(data))
    hdr = ole.openstream('FileHeader').read()
    compressed = bool(struct.unpack('<I', hdr[36:40])[0] & 1)
    texts = []
    secs = sorted([e for e in ole.listdir() if e[0] == 'BodyText'], key=lambda e: int(re.sub(r'\D', '', e[1]) or 0))
    for e in secs:
        b = ole.openstream(e).read()
        if compressed: b = zlib.decompress(b, -15)
        i = 0
        while i + 4 <= len(b):
            h = struct.unpack('<I', b[i:i+4])[0]; i += 4
            tag, size = h & 0x3ff, (h >> 20) & 0xfff
            if size == 0xfff: size = struct.unpack('<I', b[i:i+4])[0]; i += 4
            rec = b[i:i+size]; i += size
            if tag == 67:
                t = rec.decode('utf-16le', 'ignore')
                t = re.sub(r'[\x00-\x1f]', ' ', t)
                t = re.sub(r'[^\w\s가-힣()\[\]<>.,:;/%·∙※○●□■◦\-~?!「」『』"\'+=]', ' ', t)
                if t.strip(): texts.append(t.strip())
    return '\n'.join(texts)

def unmangle(name):
    return re.sub(r'#U([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), name)

pages = {d['file']: d['pages'] for d in json.load(open(pages_json))}
docs, shards = [], {c: [] for c in M.CATS}
for idx, (f, cat, year, ybasis, pub, aud, media, tags) in enumerate(M.D, 1):
    did = 'D%02d' % idx
    entry = dict(id=did, file=f, name=os.path.basename(f), folder=os.path.dirname(f) or '(최상위)', cat=cat,
                 year=year, ybasis=ybasis, pub=pub, aud=aud, media=media, tags=tags, dupOf=None,
                 pages=0, ocrPages=0, chunks=0, parse='')
    if f in M.DUP:
        entry['dupOf'] = 'D%02d' % (1 + [x[0] for x in M.D].index(M.DUP[f]))
        entry['parse'] = '동일 파일(MD5 일치) — 원본 쪽 색인을 공유'
        docs.append(entry); continue
    chunks = []
    if f.endswith('.zip'):
        z = zipfile.ZipFile(os.path.join(src_dir, f))
        forms = []
        for n in sorted(z.namelist(), key=lambda n: int(re.search(r'서식(\d+)', unmangle(n)).group(1)) if re.search(r'서식(\d+)', unmangle(n)) else 99):
            title = os.path.splitext(unmangle(n))[0]
            try: t = hwp_text(z.read(n))
            except Exception as ex: t = ''
            forms.append(title)
            for c in chunk_page(title + '\n' + t): chunks.append([did, 0, c])
        entry['pages'] = len(forms); entry['parse'] = 'HWP 서식 %d종 본문 추출' % len(forms); entry['forms'] = forms
    else:
        pl = pages[f]
        # 반복 머리글·바닥글 제거
        cnt = collections.Counter()
        for p in pl:
            for k in set(norm_key(clean_line(x)) for x in p['t'].split('\n')):
                if 2 <= len(k) <= 60: cnt[k] += 1
        thr = max(4, int(len(pl) * 0.3))
        common = {k for k, v in cnt.items() if v >= thr} if len(pl) >= 10 else set()
        for p in pl:
            t = '\n'.join(x for x in p['t'].split('\n') if norm_key(clean_line(x)) not in common)
            if p['src'] == 'ocr': entry['ocrPages'] += 1
            for c in chunk_page(t): chunks.append([did, p['p'], c])
        entry['pages'] = len(pl)
        entry['parse'] = 'PDF 텍스트 추출' + (' + OCR %d쪽' % entry['ocrPages'] if entry['ocrPages'] else '')
    entry['chunks'] = len(chunks); entry['shard'] = cat
    shards[cat].extend(chunks)
    docs.append(entry)

for c, ch in shards.items():
    json.dump({'v': 1, 'chunks': ch}, open(os.path.join(out_dir, 'shard-%d.json' % c), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
cat_js = {'asof': '2026-11-21', 'cats': M.CATS, 'docs': docs}
with open(os.path.join(out_dir, 'catalog.js'), 'w', encoding='utf-8') as fp:
    fp.write('/* 참고자료 카탈로그 — tools/library/build_library.py 로 생성. 직접 수정하지 말고 catalog_meta.py를 고친 뒤 다시 생성하세요. */\n')
    fp.write('window.LIB_CATALOG=' + json.dumps(cat_js, ensure_ascii=False, separators=(',', ':')) + ';\n')
with open(os.path.join(out_dir, 'guidebooks_categorized.csv'), 'w', encoding='utf-8-sig', newline='') as fp:
    w = csv.writer(fp)
    w.writerow(['연번', '파일명', '원본경로', '카테고리', '발행연도', '연도 확인 위치', '발행기관', '주요 대상', '매체(자료 유형)', '쪽수', '추출 방식', '핵심 키워드', '비고'])
    for i, d in enumerate(docs, 1):
        w.writerow([i, d['name'], d['file'], M.CATS[d['cat']], d['year'], d['ybasis'], d['pub'], d['aud'], d['media'], d['pages'] or '', d['parse'], d['tags'], ('중복: ' + M.DUP[d['file']]) if d['dupOf'] else ''])
print('docs', len(docs), {c: len(v) for c, v in shards.items()}, {c: os.path.getsize(os.path.join(out_dir, 'shard-%d.json' % c)) for c in shards})
