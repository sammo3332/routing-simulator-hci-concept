import json, sys
def grid(n, strategy="deterministic_shortest_path", pad=0):
    side = int(n ** 0.5)
    nodes = [{"id": f"n{i}", "position": {"x": i % side, "y": i // side}} for i in range(side * side)]
    edges = []
    for i in range(side * side):
        if i % side < side - 1: edges.append({"id": f"h{i}", "source": f"n{i}", "target": f"n{i+1}", "weight": 1})
        if i + side < side * side: edges.append({"id": f"v{i}", "source": f"n{i}", "target": f"n{i+side}", "weight": 1})
    d = {"format_version": "1.0", "scenario_id": "big", "topology": {"topology_id": "grid", "directed": False, "multigraph": False, "nodes": nodes, "edges": edges},
         "routing": {"strategy": strategy, "target_node_id": "n0", "weight_mode": "hop_count", "tie_breaker": "lexicographic_node_and_edge_id"},
         "failures": {"failed_edge_ids": []}}
    if pad: d["metadata"] = {"pad": "x" * pad}
    return d
if __name__ == "__main__":
    n = int(sys.argv[1]); strategy = sys.argv[2] if len(sys.argv) > 2 else "deterministic_shortest_path"; pad = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    json.dump(grid(n, strategy, pad), sys.stdout)
