"""Writes data/tasks.json: public Apify tasks per Actor (title, description, landing-page URL).
Needs APIFY_TOKEN in d:\\PANIX\\.env (read locally only; the token is never written to the output).
Run: python scripts/fetch-tasks.py"""
import json, re, urllib.request, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
tok = re.search(r'^APIFY_TOKEN=(.*)$', open(r"d:\PANIX\.env", encoding="utf8").read(), re.M).group(1).strip().strip('"')


def api(p):
    r = urllib.request.Request("https://api.apify.com/v2" + p, headers={"Authorization": "Bearer " + tok})
    for i in range(4):
        try:
            return json.loads(urllib.request.urlopen(r, timeout=60).read())["data"]
        except Exception:
            if i == 3:
                raise


acts = {a["id"]: a["name"] for a in api("/acts?my=true&limit=100")["items"]}
out = {}
for t in sorted(api("/actor-tasks?limit=1000")["items"], key=lambda x: x["createdAt"]):
    if not t.get("isPublic") or t["actId"] not in acts:
        continue
    d = api(f"/actor-tasks/{t['id']}")
    slug = acts[t["actId"]]
    out.setdefault(slug, []).append({
        "name": d["name"], "title": d["title"], "desc": d["description"],
        "url": f"https://apify.com/panix/{slug}/examples/{d['name']}",
    })
(root / "data").mkdir(exist_ok=True)
json.dump(out, open(root / "data" / "tasks.json", "w", encoding="utf8"), indent=1, ensure_ascii=False)
print({k: len(v) for k, v in out.items()}, sum(len(v) for v in out.values()))
