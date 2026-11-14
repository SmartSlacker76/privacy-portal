# -*- coding: utf-8 -*-
"""
법제처 Open API로 현행법령(법률·시행령·시행규칙 등)에서
"고유식별정보", "민감정보", "주민등록번호", "운전면허번호", "외국인등록번호", "여권번호"
가 들어간 조문을 모두 수집해 CSV로 저장합니다.

필요한 것
  - Python 3.8 이상 (추가 설치 패키지 없음, 표준 라이브러리만 사용)
  - open.law.go.kr에서 Open API 사용 신청이 승인된 OC 값
  - 이 스크립트를 실행하는 PC의 IP가 OC에 등록되어 있어야 함

실행 (저장소 최상위 폴더에서)
  python tools/collect_law.py 내OC값            # 6개 용어 본문검색 → 해당 법령 전체 수집
  python tools/collect_law.py 내OC값 --only-db  # 사이트 데이터(assets/data/lawart.json)의 법령만 본문 수집(빠름)
  이어서 python tools/build_lawdb.py --full 법령조문_수집결과.csv 로 사이트 데이터에 조문 전체를 반영

결과 (실행 폴더에 생성)
  법령조문_수집결과.csv      : 조문 단위 결과 (엑셀에서 바로 열림)
  법령_조문미일치.csv        : 본문검색에는 걸렸으나 본칙 조문에는 없는 법령(부칙·별표 등에만 있는 경우)
  _cache/                    : 중간 저장. 중단 후 다시 실행하면 이어서 받습니다.
"""
import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

KEYWORDS = ["고유식별정보", "민감정보", "주민등록번호", "운전면허번호", "외국인등록번호", "여권번호"]
SEARCH_URL = "https://www.law.go.kr/DRF/lawSearch.do"
SERVICE_URL = "https://www.law.go.kr/DRF/lawService.do"
CACHE = "_cache"
DELAY = 0.3  # 요청 간 간격(초)


def fetch(url, params, tries=4):
    q = url + "?" + urllib.parse.urlencode(params)
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(q, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            time.sleep(DELAY)
            text = data.decode("utf-8", errors="replace")
            if "<" not in text[:200]:
                raise RuntimeError("XML이 아닌 응답: " + text[:200])
            return text
        except Exception as e:  # noqa
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"요청 실패: {q}\n{last}")


def t(el, tag):
    x = el.find(tag)
    return (x.text or "").strip() if x is not None and x.text else ""


def search_keyword(oc, kw):
    """본문검색(search=2)으로 키워드가 들어간 현행법령 목록"""
    out, page = {}, 1
    while True:
        xml = fetch(SEARCH_URL, {"OC": oc, "target": "law", "type": "XML", "search": 2,
                                 "query": kw, "display": 100, "page": page})
        root = ET.fromstring(xml)
        total = int(t(root, "totalCnt") or 0)
        items = root.findall("law")
        for it in items:
            mst = t(it, "법령일련번호")
            out[mst] = {
                "MST": mst,
                "법령ID": t(it, "법령ID"),
                "법령명": t(it, "법령명한글"),
                "법령구분": t(it, "법령구분명"),
                "소관부처": t(it, "소관부처명"),
                "공포일자": t(it, "공포일자"),
                "시행일자": t(it, "시행일자"),
                "현행연혁": t(it, "현행연혁코드"),
            }
        print(f"  [{kw}] {page}쪽 {len(out)}/{total}")
        if not items or page * 100 >= total:
            break
        page += 1
    return out


def law_body(oc, mst):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, f"{mst}.xml")
    if os.path.exists(p):
        return open(p, encoding="utf-8").read()
    xml = fetch(SERVICE_URL, {"OC": oc, "target": "law", "MST": mst, "type": "XML"})
    open(p, "w", encoding="utf-8").write(xml)
    return xml


def article_text(unit):  # noqa: C901
    """조문단위의 조문내용·항·호·목을 순서대로 이어 전체 조문을 만든다"""
    lines = []
    for el in unit.iter():
        if el.tag in ("조문내용", "항내용", "호내용", "목내용") and el.text and el.text.strip():
            lines.append(el.text.strip())
    # 목내용은 여러 줄이 한 덩어리로 올 때가 있어 줄 단위로 정리
    text = "\n".join(lines)
    return "\n".join(s.rstrip() for s in text.splitlines() if s.strip())


def parse_articles(xml):
    root = ET.fromstring(xml)
    info = root.find("기본정보")
    dept = ""
    if info is not None:
        d = info.find("소관부처")
        dept = (d.text or "").strip() if d is not None and d.text else ""
    arts = []
    for u in root.iter("조문단위"):
        if t(u, "조문여부") != "조문":  # 장·절 제목(전문) 제외
            continue
        no = t(u, "조문번호")
        br = t(u, "조문가지번호")
        label = f"제{no}조" + (f"의{br}" if br and br != "0" else "")
        arts.append({
            "조문번호": label,
            "조문제목": t(u, "조문제목"),
            "조문내용": article_text(u),
            "조문시행일자": t(u, "조문시행일자"),
        })
    return dept, arts


def main():
    if len(sys.argv) < 2:
        print("사용법: python collect_law.py 내OC값")
        sys.exit(1)
    oc = sys.argv[1].strip()
    only_db = "--only-db" in sys.argv[2:]

    # 연결·권한 확인
    try:
        fetch(SEARCH_URL, {"OC": oc, "target": "law", "type": "XML", "query": "개인정보 보호법", "display": 1})
    except Exception as e:
        print("API 접속 실패. OC 값, Open API 승인 여부, 이 PC의 IP 등록 여부를 확인하세요.\n", e)
        sys.exit(2)

    os.makedirs(CACHE, exist_ok=True)
    lp = os.path.join(CACHE, "_laws.json")
    if only_db:
        db = json.load(open(os.path.join("assets", "data", "lawart.json"), encoding="utf-8"))["data"]
        laws = {}
        for g in db:
            if g.get("m"):
                laws.setdefault(str(g["m"]), {"MST": str(g["m"]), "법령ID": g.get("id", ""), "법령명": g["n"],
                                              "법령구분": g.get("lt", ""), "소관부처": g.get("o", ""),
                                              "시행일자": g.get("d", ""), "검색어": []})
    elif os.path.exists(lp):
        laws = json.load(open(lp, encoding="utf-8"))
    else:
        laws = {}
        for kw in KEYWORDS:
            print(f"본문검색: {kw}")
            for mst, v in search_keyword(oc, kw).items():
                laws.setdefault(mst, v).setdefault("검색어", [])
                laws[mst]["검색어"].append(kw)
        json.dump(laws, open(lp, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"대상 법령 {len(laws)}건")

    rows, miss = [], []
    for i, (mst, L) in enumerate(sorted(laws.items(), key=lambda x: x[1]["법령명"]), 1):
        print(f"[{i}/{len(laws)}] {L['법령명']}")
        try:
            dept, arts = parse_articles(law_body(oc, mst))
        except Exception as e:
            print("   본문 실패:", e)
            miss.append({**L, "검색어": ",".join(L["검색어"]), "사유": f"본문 조회 실패: {e}"})
            continue
        hit = 0
        for a in arts:
            found = [k for k in KEYWORDS if k in a["조문제목"] or k in a["조문내용"]]
            if not found:
                continue
            hit += 1
            title = f"{a['조문번호']}({a['조문제목']})" if a["조문제목"] else a["조문번호"]
            rows.append({
                "법령명": L["법령명"],
                "법령구분": L["법령구분"],
                "소관부처": L["소관부처"] or dept,
                "조문명": title,
                "조문내용(전체)": a["조문내용"],
                "포함용어": ",".join(found),
                "시행일자": L["시행일자"],
                "법령일련번호(MST)": mst,
                "법령ID": L["법령ID"],
            })
        if hit == 0:
            miss.append({**L, "검색어": ",".join(L["검색어"]), "사유": "본칙 조문에는 없음(부칙·별표·서식 등)"})

    with open("법령조문_수집결과.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["법령명"])
        w.writeheader(); w.writerows(rows)
    with open("법령_조문미일치.csv", "w", newline="", encoding="utf-8-sig") as f:
        keys = ["법령명", "법령구분", "소관부처", "시행일자", "MST", "법령ID", "검색어", "사유"]
        w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        w.writeheader(); w.writerows(miss)
    print(f"\n완료: 조문 {len(rows)}건 → 법령조문_수집결과.csv / 조문 미일치 법령 {len(miss)}건 → 법령_조문미일치.csv")


if __name__ == "__main__":
    main()
