# -*- coding: utf-8 -*-
"""
고유식별정보 근거 법령 검색(law-search.html) 데이터 빌드

  python tools/build_lawdb.py [--std 표준목록.xls] [--full 법령조문_수집결과.csv]

입력
  assets/data/lawdb.json            항·호 단위 원문 미러(수정하지 않음)
  tools/src/공통업무_표준목록_*.xls  개인정보 포털 '공통업무 표준목록' 엑셀 내려받기(HTML 형식 .xls)
  --full (선택)                     tools/collect_law.py 결과 CSV. 조문 전체(각 항·호·목 포함)를 채움

출력
  assets/data/stdlist.json   표준목록 882건
  assets/data/lawart.json    조문 단위 데이터(검색 화면이 읽는 파일)
     n 법령명, o 소관부처, lt 법령유형, d 시행일, m MST, no 조문번호, at 조문제목, u 법제처 링크
     t 정보유형(주민·여권·면허·외국인·포괄·민감), c 근거분류, h 해당 항·호 [[위치, 내용, 분류, 판정]]
     xf 조문 전체(수집된 경우), s/sa/sp 표준목록 연계(직접 / 조문번호까지 일치 / 모법 근거)
"""
import argparse
import csv
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "data")
DEFAULT_STD = os.path.join(ROOT, "tools", "src", "공통업무_표준목록_20261110.xls")
TYPE_ORDER = ["주민", "여권", "면허", "외국인", "포괄", "민감"]


def norm(s):
    return re.sub(r"[\s「」『』\"'·ㆍ()（）\[\]<>〈〉,]", "", str(s or ""))


def load_std(path):
    import pandas as pd
    t = pd.read_html(io.StringIO(open(path, encoding="utf-8").read()))[0]
    asof = (re.search(r"(\d{4}-\d{2}-\d{2})", str(t.iloc[0, 0])) or [None, ""])[1]
    t.columns = t.iloc[2].tolist()
    t = t.iloc[3:].fillna("")
    rows = [{
        "g": str(r["기관분류"]).strip(), "o": str(r["기관명"]).strip(), "f": str(r["업무분야"]).strip(),
        "n": str(r["표준파일명"]).strip(), "b": str(r["개인정보파일의 운영 근거"]).strip(),
        "p": str(r["개인정보파일의 운영 목적"]).strip(),
        "i": str(r["개인정보파일에 기록되는 개인정보의 항목"]).strip(),
        "k": str(r["개인정보의 보유기간"]).strip(),
    } for _, r in t.iterrows()]
    return asof, rows


SUB = re.compile(r"\s*(시행령|시행규칙)$")


def art_no(a):
    m = re.match(r"제(\d+)조(?:의(\d+))?", a or "")
    return ("제" + m.group(1) + "조" + ("의" + m.group(2) if m.group(2) else "")) if m else None


class Linker:
    def __init__(self, std):
        self.nb = [norm(s["b"]) for s in std]
        self.cache = {}

    def files(self, name):
        if name in self.cache:
            return self.cache[name]
        n, m = norm(name), SUB.search(name)
        direct, parent = [], []
        if m:  # 시행령·시행규칙: "○○법 시행령" 또는 "○○법 제3조, 시행령 제5조"
            base, kind = norm(name[:m.start()]), m.group(1)
            for i, b in enumerate(self.nb):
                if base and base in b:
                    (direct if (n in b or kind in b[b.index(base):]) else parent).append(i)
        else:
            pat = re.compile(re.escape(n) + r"(?!시행령|시행규칙)")
            direct = [i for i, b in enumerate(self.nb) if n and pat.search(b)]
        self.cache[name] = (direct, parent)
        return self.cache[name]

    def same_article(self, name, no, idx):
        m = SUB.search(name)
        heads = [norm(name)] + ([m.group(1)] if m else [])
        out = []
        for i in idx:
            for h in heads:
                if re.search(re.escape(h) + r"[^제]{0,12}" + re.escape(no) + r"(?![의\d])", self.nb[i]):
                    out.append(i)
                    break
        return out


def load_full(path):
    full = {}
    if not path:
        return full
    with open(path, encoding="utf-8-sig") as f:
        for c in csv.DictReader(f):
            no = art_no(c.get("조문명", ""))
            if not no:
                continue
            v = c.get("조문내용(전체)", "")
            full[(c.get("법령일련번호(MST)", "").strip(), no)] = v
            full.setdefault((norm(c.get("법령명", "")), no), v)
    return full


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--std", default=DEFAULT_STD)
    ap.add_argument("--full", default="")
    a = ap.parse_args()

    src = json.load(open(os.path.join(DATA, "lawdb.json"), encoding="utf-8"))
    asof, std = load_std(a.std)
    full = load_full(a.full)
    lk = Linker(std)

    groups, order = {}, []
    for r in src["data"]:
        no = art_no(r["a"]) or r["a"]  # 부칙은 부칙 표기 그대로 한 묶음
        key = (r["n"], no)
        g = groups.get(key)
        if not g:
            u = r.get("u", "")
            if art_no(r["a"]):
                u = "https://www.law.go.kr/법령/" + r["n"].replace(" ", "") + "/" + no
            g = groups[key] = {"n": r["n"], "o": r["o"], "lt": r["lt"], "d": r["d"], "m": r.get("m", ""),
                               "id": r.get("id", ""), "no": no, "at": r["at"], "u": u,
                               "_t": set(), "_c": set(), "h": []}
            order.append(key)
        for t in TYPE_ORDER[:5]:
            if t in r.get("t", ""):
                g["_t"].add(t)
        if "민감정보" in r.get("x", "") + r.get("at", ""):
            g["_t"].add("민감")
        if r.get("c"):
            g["_c"].add(r["c"])
        g["h"].append([r["a"], r.get("x", ""), r.get("c", ""), r.get("j", "")])

    out = []
    for key in order:
        g = groups[key]
        xf = full.get((str(g["m"]), g["no"])) or full.get((norm(g["n"]), g["no"]))
        if xf:
            g["xf"] = xf
            if "민감정보" in xf:
                g["_t"].add("민감")
        ts = g.pop("_t")
        g["t"] = "".join(t for t in TYPE_ORDER if t in ts)
        g["c"] = "".join(sorted(g.pop("_c")))
        d, p = lk.files(g["n"])
        g["s"], g["sp"] = d, p
        g["sa"] = lk.same_article(g["n"], g["no"], d) if art_no(g["no"]) and d else []
        out.append(g)

    json.dump({"meta": {"rows": len(std), "asof": asof, "source": "개인정보 포털 공통업무 표준목록"}, "data": std},
              open(os.path.join(DATA, "stdlist.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    meta = {"articles": len(out), "laws": len({g["n"] for g in out}), "asof": src["meta"].get("asof", ""),
            "std_asof": asof, "full": sum(1 for g in out if g.get("xf")), "source": src["meta"].get("source", "")}
    json.dump({"meta": meta, "data": out}, open(os.path.join(DATA, "lawart.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    used = {i for g in out for i in g["s"] + g["sp"]}
    print(f"조문 {meta['articles']}개(법령 {meta['laws']}개), 전체 조문 확보 {meta['full']}개")
    print(f"표준목록 {len(std)}건(기준 {asof}) → 직접 연계 조문 {sum(1 for g in out if g['s'])}, "
          f"조문번호 일치 {sum(1 for g in out if g['sa'])}, 모법 연계 {sum(1 for g in out if g['sp'])}, 연계된 표준파일 {len(used)}")


if __name__ == "__main__":
    main()
