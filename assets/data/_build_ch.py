# -*- coding: utf-8 -*-
# 공통 확장기: 간결한 입력 dict -> 엔진 스키마
import json
PT={1:100,2:200,3:300,4:400,5:500}
def P(d):
    lv=d['lv']
    return {
      "id":d['id'],"ch":int(d['id'].split('-')[1][0]) if False else d['ch'],"area":d['area'],"level":lv,
      "title":d['title'],"qtype":d['qt'],"emoji":d.get('emo','🔎'),"pt":PT[lv],"time":3+lv,
      "goal":d.get('goal',''),
      "law":{"name":d['law'][0],"article":d['law'][1],"para":d['law'][2],"eff":"현행",
             "guide":d.get('guide','개인정보 보호 통합 안내서'),"ver":"최신","page":d.get('page','-')},
      "case_source":d.get('src2','공공부문 사례 재구성'),"verify":"검증: 법제처 현행본 대조",
      "map":{"pia":d['map'][0],"plevel":d['map'][1],"cyber":d['map'][2],"type":d['map'][3],
             "reason":d['map'][4],"evidence":True},
      "scene":{"setting":d['set'],"chars":d.get('chars',''),"timeline":d.get('tl',''),"src":d.get('src','교육용 재구성')},
      "evidence":[{"label":e[0],"v":e[1]} for e in d.get('ev',[])],
      "risk":d.get('risk',''),
      "q":dict(d['q'],kind=d['kind']),
      "hints":d['hints'],"flag":d['flag'],
      "solve":{"legal":d['legal'],"tech":d['tech'],
               "checklist":d.get('chk',[]),"improve":d.get('imp',[]),"source":d['src3']},
      "status":"full"}

def merge(new_probs, chapters):
    PATH="/home/claude/pi-edu/assets/data/ctf200.json"
    d=json.load(open(PATH,encoding="utf-8"))
    ids=set(p['id'] for p in new_probs)
    keep=[p for p in d["problems"] if p['id'] not in ids]
    d["problems"]=keep+new_probs
    d["problems"].sort(key=lambda p:int(p["id"].split("-")[1]))
    json.dump(d,open(PATH,"w",encoding="utf-8"),ensure_ascii=False)
    full=sum(1 for p in d["problems"] if p.get("status")=="full")
    print("merged chapters",chapters,"| 총 full:",full,"/",len(d["problems"]))
