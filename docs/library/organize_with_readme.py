"""참고자료 63종을 5대 카테고리 폴더로 정리하고 카테고리별 README.md를 함께 배치합니다.

사용자 초안 스크립트를 고친 판입니다.
- README 내용은 스크립트에 박아 두지 않고, 이 파일 옆의 카테고리 폴더 README.md(원문 대조 검증본)를 복사합니다.
- 하위 폴더(privacy/, 02_사이버보안/ 등)에 있는 원본도 찾도록 CSV의 '원본경로' 열을 우선 사용합니다.
- 같은 파일이 두 곳에 있으면(중복본) 한 번만 복사합니다.

사용법:
  python3 organize_with_readme.py --src <원본 자료 최상위 폴더> --out ./분류_완료_가이드북
"""
import argparse, csv, os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', default=os.path.join(HERE, 'guidebooks_categorized.csv'))
    ap.add_argument('--src', default='./')
    ap.add_argument('--out', default='./분류_완료_가이드북/')
    a = ap.parse_args()
    if not os.path.exists(a.csv):
        print(f'[오류] {a.csv} 파일이 없습니다.'); return

    os.makedirs(a.out, exist_ok=True)
    copied, missing, seen = 0, [], set()
    with open(a.csv, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    cats = sorted({r['카테고리'].strip() for r in rows})
    for cat in cats:
        os.makedirs(os.path.join(a.out, cat), exist_ok=True)
        readme = os.path.join(HERE, cat, 'README.md')
        if os.path.exists(readme):
            shutil.copy2(readme, os.path.join(a.out, cat, 'README.md'))
            print(f' [README 배치] {cat}')
    for i, r in enumerate(rows, 1):
        fname, cat = r['파일명'].strip(), r['카테고리'].strip()
        rel = (r.get('원본경로') or fname).strip()
        if '중복' in (r.get('비고') or '') and fname in seen:
            continue
        src = next((p for p in (os.path.join(a.src, rel), os.path.join(a.src, fname)) if os.path.exists(p)), None)
        if not src:
            missing.append(rel); continue
        shutil.copy2(src, os.path.join(a.out, cat, fname)); seen.add(fname); copied += 1
        print(f'[{i}/{len(rows)}] 복사: [{cat}] {fname}')
    print('=' * 50)
    print(f'복사 완료 {copied}개, 찾지 못함 {len(missing)}개 · 폴더: {os.path.abspath(a.out)}')
    for m in missing: print('  - 없음:', m)


if __name__ == '__main__':
    main()
