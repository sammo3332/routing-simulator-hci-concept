import json, os, sys, urllib.request, urllib.error
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8011"
HERE = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(HERE, "..", "fixtures", "")
def req(method, path, body=None):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp: return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b"{}")
def strip_session(s):
    s = json.loads(json.dumps(s)); s.pop("session_id", None); s.pop("scenario", None); return s
def strip_scn(s):
    s = json.loads(json.dumps(s)); s.pop("scenario_id"); s.pop("created_at"); return s
files = [FX+"topohub_mini.json", FX+"sndlib_mini.xml", FX+"graphml_mini.graphml", FX+"bonsai_routing_failure.json", FX+"synthetic_50_nodes.json", FX+"synthetic_50_nodes_dense.json", os.path.join(HERE, "files", "graphml_directed.graphml")]
bad = 0
for f in files:
    raw = open(f, "rb").read()
    code, s0 = req("POST", "/api/sessions/import?filename=" + os.path.basename(f), raw)
    assert code == 200, (f, code, s0)
    nodes = [n["id"] for n in s0["topology"]["nodes"]]; edges = [e["id"] for e in s0["topology"]["edges"]]
    for strategy, wm in [("deterministic_shortest_path","hop_count"),("deterministic_shortest_path","edge_weight"),("bonsai_greedy","hop_count")]:
        for nfail in (0, 1, 2):
            sid = s0["session_id"]
            patch = {"strategy": strategy, "weight_mode": wm, "target_node_id": nodes[-1], "failed_edge_ids": edges[:nfail]}
            code, s1 = req("PATCH", f"/api/sessions/{sid}", patch)
            if code != 200:
                print("  patch", os.path.basename(f), strategy, code, s1.get("detail")); continue
            view = {"show_labels": True, "node_display_positions": {nodes[0]: {"x": 12.5, "y": -7}}}
            c, exp_get = req("GET", f"/api/sessions/{sid}/scenario")
            c, exp = req("POST", f"/api/sessions/{sid}/scenario", {"visualization": view})
            c2, s2 = req("POST", "/api/sessions/import-scenario", exp)
            tag = f"{os.path.basename(f):32s} {strategy[:6]} {wm:11s} fail={nfail}"
            if c2 != 200: print("FAIL reimport", tag, c2, s2.get("detail")); bad += 1; continue
            issues = []
            if strip_session(s1) != strip_session(s2):
                a, b = strip_session(s1), strip_session(s2)
                for k in a:
                    if a[k] != b[k]:
                        if isinstance(a[k], dict):
                            issues.append(k + ":" + ",".join(kk for kk in a[k] if a[k][kk] != b[k].get(kk)))
                        else: issues.append(k)
            if s2["scenario"]["snapshot"] != "matches": issues.append("snapshot=" + s2["scenario"]["snapshot"])
            if s2["scenario"]["visualization"] != {"show_labels": True, "node_display_positions": {nodes[0]: {"x": 12.5, "y": -7.0}}}: issues.append("vis " + json.dumps(s2["scenario"]["visualization"]))
            c3, exp2 = req("POST", f"/api/sessions/{s2['session_id']}/scenario", {"visualization": view})
            if strip_scn(exp) != strip_scn(exp2):
                a, b = strip_scn(exp), strip_scn(exp2)
                issues.append("re-export differs: " + ",".join(k for k in set(a)|set(b) if a.get(k) != b.get(k)))
            # after reimport, PATCH and search still work?
            c4, s4 = req("PATCH", f"/api/sessions/{s2['session_id']}", {"failed_edge_ids": []})
            c5, s5 = req("POST", f"/api/sessions/{s2['session_id']}/critical-failure-search", {"max_k": 1})
            if c4 != 200 or c5 != 200: issues.append(f"patch={c4} search={c5}")
            if "visualization" in exp_get: issues.append("GET export has visualization")
            print(("DIFF " if issues else "ok   ") + tag, "; ".join(issues)); bad += bool(issues)
print("bad", bad)
