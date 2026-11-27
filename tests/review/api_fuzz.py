"""Hostile scenario requests against a backend. Usage: python3 api_fuzz.py [base]"""
import copy, json, sys, time, urllib.request, urllib.error
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8011"

def req(method, path, body=None, headers=None, timeout=60):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=headers or {"Content-Type": "application/json"})
    t = time.time()
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            raw = resp.read(); code = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read(); code = e.code
    except Exception as e:
        return ("EXC", repr(e), time.time() - t)
    try: js = json.loads(raw)
    except Exception: js = raw[:200]
    return (code, js, time.time() - t)

def base():
    return {
        "format_version": "1.0", "scenario_id": "s1",
        "topology": {"topology_id": "t", "directed": False, "multigraph": False,
            "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}],
            "edges": [{"id": "e1", "source": "A", "target": "B", "weight": 1},
                      {"id": "e2", "source": "B", "target": "C", "weight": 2},
                      {"id": "e3", "source": "C", "target": "D", "weight": 3},
                      {"id": "e4", "source": "D", "target": "A", "weight": 4}]},
        "routing": {"strategy": "deterministic_shortest_path", "target_node_id": "A", "weight_mode": "edge_weight", "tie_breaker": "lexicographic_node_and_edge_id"},
        "failures": {"failed_edge_ids": []},
    }

cases = {}
def case(name, mutate=None, raw=None):
    if raw is None:
        d = base()
        if mutate: d = mutate(d) or d
        raw = json.dumps(d).encode()
    cases[name] = raw

def m(path, value):
    def f(d):
        cur = d
        for p in path[:-1]: cur = cur[p]
        cur[path[-1]] = value
    return f

case("ok")
case("weight_1e400_literal", raw=json.dumps(base()).replace('"weight": 1,', '"weight": 1e400,').replace('"weight": 1}', '"weight": 1e400}').encode())
case("weight_huge_int", raw=json.dumps(base()).replace('"weight": 1}', '"weight": 1' + "0"*400 + '}').encode())
case("weight_1e308_all", lambda d: [e.__setitem__("weight", 1e308) for e in d["topology"]["edges"]] and None)
case("weight_zero_all", lambda d: [e.__setitem__("weight", 0) for e in d["topology"]["edges"]] and None)
case("weight_neg", m(["topology","edges",0,"weight"], -1))
case("weight_neg_zero", raw=json.dumps(base()).replace('"weight": 1}', '"weight": -0.0}').encode())
case("weight_string", m(["topology","edges",0,"weight"], "5"))
case("weight_bool", m(["topology","edges",0,"weight"], True))
case("weight_null", m(["topology","edges",0,"weight"], None))
case("weight_tiny", m(["topology","edges",0,"weight"], 5e-324))
case("pos_1e400", raw=json.dumps(base()).replace('{"id": "A"}', '{"id": "A", "position": {"x": 1e400, "y": 0}}').encode())
case("pos_huge_int", raw=json.dumps(base()).replace('{"id": "A"}', '{"id": "A", "position": {"x": 1' + "0"*400 + ', "y": 0}}').encode())
def allpos(d):
    for i, n in enumerate(d["topology"]["nodes"]): n["position"] = {"x": (-1e308 if i % 2 else 1e308), "y": (1e308 if i < 2 else -1e308)}
case("pos_1e308_spread", allpos)
case("dup_node", lambda d: d["topology"]["nodes"].append({"id": "A"}))
case("dup_edge", lambda d: d["topology"]["edges"].append({"id": "e1", "source": "A", "target": "C"}))
case("self_loop", lambda d: d["topology"]["edges"].append({"id": "loop", "source": "A", "target": "A"}))
def self_loop_bonsai(d):
    d["topology"]["edges"].append({"id": "loop", "source": "B", "target": "B"}); d["routing"]["strategy"] = "bonsai_greedy"; d["failures"]["failed_edge_ids"] = ["loop"]
case("self_loop_bonsai_failed", self_loop_bonsai)
case("parallel_edges_multigraph_false", lambda d: d["topology"]["edges"].append({"id": "e1b", "source": "A", "target": "B"}))
def par_true(d):
    d["topology"]["edges"].append({"id": "e1b", "source": "A", "target": "B"}); d["topology"]["multigraph"] = True
case("parallel_edges_multigraph_true", par_true)
def par_bonsai(d):
    par_true(d); d["routing"]["strategy"] = "bonsai_greedy"
case("parallel_bonsai", par_bonsai)
case("directed_sp", m(["topology","directed"], True))
def dir_b(d): d["topology"]["directed"] = True; d["routing"]["strategy"] = "bonsai_greedy"
case("directed_bonsai", dir_b)
case("directed_string", m(["topology","directed"], "false"))
case("empty_nodes", lambda d: d["topology"].update(nodes=[], edges=[]))
def one(d): d["topology"].update(nodes=[{"id": "A"}], edges=[])
case("one_node", one)
def one_b(d): one(d); d["routing"]["strategy"] = "bonsai_greedy"
case("one_node_bonsai", one_b)
def one_loop(d): d["topology"].update(nodes=[{"id": "A"}], edges=[{"id": "l", "source": "A", "target": "A"}])
case("one_node_selfloop", one_loop)
def iso(d): d["topology"]["nodes"].append({"id": "Z"}); d["routing"]["target_node_id"] = "Z"
case("target_isolated", iso)
def iso_b(d): iso(d); d["routing"]["strategy"] = "bonsai_greedy"
case("target_isolated_bonsai", iso_b)
def disc_b(d): d["topology"]["nodes"].append({"id": "Z"}); d["routing"]["strategy"] = "bonsai_greedy"
case("disconnected_bonsai", disc_b)
def no_edges(d): d["topology"]["edges"] = []
case("no_edges", no_edges)
def no_edges_b(d): d["topology"]["edges"] = []; d["routing"]["strategy"] = "bonsai_greedy"
case("no_edges_bonsai", no_edges_b)
def uni(d):
    s = json.dumps(d).replace('"A"', '"Ä/\\"<b>ö 🙂\\\\ \\n"'); return json.loads(s)
case("unicode_ids", uni)
case("id_surrogate", raw=json.dumps(base()).replace('"A"', '"\\ud800"').encode())
case("id_nul", raw=json.dumps(base()).replace('"A"', '"\\u0000"').encode())
case("id_whitespace", raw=json.dumps(base()).replace('"A"', '" "').encode())
case("id_long", raw=json.dumps(base()).replace('"A"', '"' + "A"*100000 + '"').encode())
case("id_number", m(["topology","nodes",0,"id"], 1))
case("id_proto", raw=json.dumps(base()).replace('"A"', '"__proto__"').encode())
case("id_constructor", raw=json.dumps(base()).replace('"B"', '"constructor"').replace('"A"', '"toString"').encode())
case("deep_nesting_metadata", raw=(json.dumps(base())[:-1] + ', "metadata": {"a": ' + "["*100000 + "]"*100000 + "}}").encode())
case("deep_nesting_root", raw=("["*100000 + "]"*100000).encode())
case("bom", raw=b"\xef\xbb\xbf" + json.dumps(base()).encode())
case("utf16", raw=json.dumps(base()).encode("utf-16"))
case("latin1_bytes", raw=json.dumps(base()).replace("s1", "sé").encode("latin-1"))
case("extra_root", m(["extra"], 1))
case("extra_topology", m(["topology","extra"], 1))
case("extra_node", m(["topology","nodes",0,"extra"], 1))
case("extra_edge", m(["topology","edges",0,"extra"], 1))
case("extra_routing", m(["routing","extra"], 1))
case("extra_failures", m(["failures","extra"], 1))
case("extra_vis", m(["visualization"], {"extra": 1}))
case("vis_pos_list", m(["visualization"], {"node_display_positions": [1, 2]}))
case("vis_pos_scalar", m(["visualization"], {"node_display_positions": {"A": 5}}))
case("vis_pos_missing_y", m(["visualization"], {"node_display_positions": {"A": {"x": 1}}}))
case("vis_pos_string", m(["visualization"], {"node_display_positions": {"A": {"x": "1", "y": 2}}}))
case("vis_pos_unknown", m(["visualization"], {"node_display_positions": {"Q": {"x": 1, "y": 2}}}))
case("vis_pos_huge", m(["visualization"], {"node_display_positions": {"A": {"x": 1e308, "y": -1e308}}}))
case("vis_pos_1e400", raw=json.dumps(base())[:-1].encode() + b', "visualization": {"node_display_positions": {"A": {"x": 1e400, "y": 2}}}}')
case("vis_null", m(["visualization"], None))
case("vis_labels_str", m(["visualization"], {"show_labels": "yes"}))
case("vis_empty", m(["visualization"], {}))
case("nan_literal", raw=json.dumps(base()).replace('"weight": 1}', '"weight": NaN}').encode())
case("inf_literal", raw=json.dumps(base()).replace('"weight": 1}', '"weight": Infinity}').encode())
case("fv_float", m(["format_version"], 1.0))
case("fv_int", m(["format_version"], 1))
case("fv_list", m(["format_version"], ["1.0"]))
case("fv_dict", m(["format_version"], {"a": 1}))
case("fv_null", m(["format_version"], None))
case("fv_empty", m(["format_version"], ""))
case("fv_false", m(["format_version"], False))
case("fv_zero", m(["format_version"], 0))
case("fv_long", m(["format_version"], "<script>" * 5000))
case("root_list", raw=b"[]")
case("root_null", raw=b"null")
case("root_string", raw=b'"1.0"')
case("empty_body", raw=b"")
case("garbage", raw=b"\x00\xff\xfe garbage")
case("dup_keys", raw=json.dumps(base()).replace('"scenario_id": "s1"', '"scenario_id": "s1", "scenario_id": "s2"').encode())
case("failed_unknown", m(["failures","failed_edge_ids"], ["nope"]))
case("failed_dup", m(["failures","failed_edge_ids"], ["e1", "e1"]))
case("failed_all", m(["failures","failed_edge_ids"], ["e1","e2","e3","e4"]))
case("failed_nonstring", m(["failures","failed_edge_ids"], [1]))
case("failed_nested_list", m(["failures","failed_edge_ids"], [["e1"]]))
case("origin_bad", m(["failures","origin"], "x"))
case("created_at_bad", m(["created_at"], "not a date"))
case("name_null", m(["name"], None))
case("search_cfg_big", m(["search_configuration"], {"max_k": 99, "stop_on_first": True}))
case("search_cfg_huge", m(["search_configuration"], {"max_k": 10**30, "stop_on_first": True}))
case("search_cfg_float", m(["search_configuration"], {"max_k": 2.0, "stop_on_first": True}))
case("snapshot_garbage", m(["routing_snapshot"], {"baseline_paths": {}, "current_paths": {}, "affected_node_ids": ["A","B","C"], "changed_node_ids": []}))
case("snapshot_null", m(["routing_snapshot"], None))
case("snapshot_wrong_type", m(["routing_snapshot"], "x"))
case("edge_unknown_node", m(["topology","edges",0,"source"], "nope"))
case("target_unknown", m(["routing","target_node_id"], "nope"))
case("strategy_bad", m(["routing","strategy"], "x"))
case("tie_breaker_bad", m(["routing","tie_breaker"], "x"))
case("attributes_deep", m(["topology","nodes",0,"attributes"], {"a": {"b": [1, {"c": None}]}}))
case("label_empty", m(["topology","nodes",0,"label"], ""))
case("label_html", m(["topology","nodes",0,"label"], "<img src=x onerror=alert(1)>"))
case("topology_id_ws", m(["topology","topology_id"], "   "))
case("scenario_id_ws", m(["scenario_id"], "   "))
case("node_id_ws_only", m(["topology","nodes",3,"id"], "D"))

problems = []
for name, raw in cases.items():
    code, js, dt = req("POST", "/api/sessions/import-scenario", raw, timeout=120)
    detail = js.get("detail") if isinstance(js, dict) else js
    line = f"{name:34s} {code} {dt:5.2f}s "
    follow = ""
    if code == 200:
        sid = js["session_id"]
        fl = []
        for label, (mth, path, body) in {
            "patch_noop": ("PATCH", f"/api/sessions/{sid}", {}),
            "patch_bonsai": ("PATCH", f"/api/sessions/{sid}", {"strategy": "bonsai_greedy"}),
            "patch_sp": ("PATCH", f"/api/sessions/{sid}", {"strategy": "deterministic_shortest_path", "weight_mode": "edge_weight"}),
            "patch_fail_all": ("PATCH", f"/api/sessions/{sid}", {"failed_edge_ids": [e["id"] for e in js["topology"]["edges"]]}),
            "patch_fail_none": ("PATCH", f"/api/sessions/{sid}", {"failed_edge_ids": []}),
            "search1": ("POST", f"/api/sessions/{sid}/critical-failure-search", {"max_k": 1}),
            "search2": ("POST", f"/api/sessions/{sid}/critical-failure-search", {"max_k": 2}),
            "export_get": ("GET", f"/api/sessions/{sid}/scenario", None),
            "export_post": ("POST", f"/api/sessions/{sid}/scenario", {"visualization": {"show_labels": True, "node_display_positions": {}}}),
        }.items():
            c2, j2, d2 = req(mth, path, body, timeout=120)
            fl.append(f"{label}={c2}")
            if c2 not in (200, 422) or d2 > 5:
                problems.append((name, label, c2, str(j2)[:200], round(d2, 2)))
            if label.startswith("export") and c2 == 200:
                c3, j3, d3 = req("POST", "/api/sessions/import-scenario", j2)
                if c3 != 200: problems.append((name, label + "->reimport", c3, str(j3)[:300], 0))
        follow = " ".join(fl)
    if code not in (200, 413, 422) or dt > 5:
        problems.append((name, "import", code, str(js)[:300], round(dt, 2)))
    print(line + (str(detail)[:150] if code != 200 else "OK snapshot=" + js["scenario"]["snapshot"] + " | " + follow))
print("\nPROBLEMS")
for p in problems: print(p)
