from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path
from threading import RLock
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from .failover_core.bonsai import (
    BonsaiDecomposition,
    build_greedy_arborescences,
    compute_bonsai_routing_result,
)
from .failover_core.models import (
    FailureState,
    RoutingConfig,
    RoutingResult,
    SearchResult,
    Topology,
)
from .failover_core.routing import compute_routing_result
from .failover_core.search import find_first_minimal_failure
from .failover_core.serialization import _routing_snapshot_to_dict
from .failover_core.topology_import import (
    DEFAULT_MAX_FILE_SIZE_BYTES,
    TopologyImportError,
    import_sndlib_xml_bytes,
    import_topohub_json_bytes,
)


@dataclass(frozen=True, slots=True)
class SimulationSession:
    session_id: str
    topology: Topology
    routing: RoutingConfig
    failures: FailureState
    bonsai_decomposition: BonsaiDecomposition | None = None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SimulationSession] = {}
        self._lock = RLock()

    def create(self, topology: Topology) -> SimulationSession:
        target = sorted(node.id for node in topology.nodes)[0]
        session = SimulationSession(
            session_id=str(uuid4()),
            topology=topology,
            routing=RoutingConfig(target_node_id=target),
            failures=FailureState(),
        )
        with self._lock:
            self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> SimulationSession:
        with self._lock:
            session = self._sessions.get(session_id)
        if session is None:
            raise KeyError(session_id)
        return session

    def update(
        self,
        session_id: str,
        *,
        target_node_id: str | None = None,
        strategy: str | None = None,
        weight_mode: str | None = None,
        failed_edge_ids: frozenset[str] | None = None,
    ) -> SimulationSession:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                raise KeyError(session_id)
            routing = replace(
                session.routing,
                target_node_id=target_node_id or session.routing.target_node_id,
                strategy=strategy or session.routing.strategy,
                weight_mode=weight_mode or session.routing.weight_mode,
            )
            failures = (
                replace(session.failures, failed_edge_ids=failed_edge_ids)
                if failed_edge_ids is not None
                else session.failures
            )
            bonsai_decomposition = None
            if routing.strategy == "bonsai_greedy":
                if (
                    session.bonsai_decomposition is not None
                    and session.routing.target_node_id == routing.target_node_id
                ):
                    bonsai_decomposition = session.bonsai_decomposition
                else:
                    bonsai_decomposition = build_greedy_arborescences(
                        session.topology, routing.target_node_id
                    )
            updated = replace(
                session,
                routing=routing,
                failures=failures,
                bonsai_decomposition=bonsai_decomposition,
            )
            node_ids = {node.id for node in updated.topology.nodes}
            edge_ids = {edge.id for edge in updated.topology.edges}
            if updated.routing.target_node_id not in node_ids:
                raise ValueError("target node does not exist")
            if updated.routing.weight_mode not in {"hop_count", "edge_weight"}:
                raise ValueError(
                    "weight_mode must be 'hop_count' or 'edge_weight'"
                )
            if updated.routing.strategy not in {
                "deterministic_shortest_path",
                "bonsai_greedy",
            }:
                raise ValueError("unsupported routing strategy")
            unknown = sorted(updated.failures.failed_edge_ids - edge_ids)
            if unknown:
                raise ValueError(
                    f"unknown failed edge IDs: {', '.join(unknown)}"
                )
            self._sessions[session_id] = updated
        return updated


class SessionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_node_id: str | None = None
    strategy: str | None = None
    weight_mode: str | None = None
    failed_edge_ids: list[str] | None = None


class CriticalFailureSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    max_k: int = Field(ge=1)


def _topology_to_dict(topology: Topology) -> dict:
    return {
        "topology_id": topology.topology_id,
        "name": topology.name,
        "source": topology.source,
        "directed": topology.directed,
        "multigraph": topology.multigraph,
        "nodes": [
            {
                "id": node.id,
                "label": node.label,
                "position": (
                    {"x": node.position.x, "y": node.position.y}
                    if node.position is not None
                    else None
                ),
            }
            for node in topology.nodes
        ],
        "edges": [
            {
                "id": edge.id,
                "source": edge.source,
                "target": edge.target,
                "weight": edge.weight,
            }
            for edge in topology.edges
        ],
    }


def _session_response(
    session: SimulationSession, result: RoutingResult
) -> dict:
    reachable = sum(path is not None for path in result.current_paths.values())
    response = {
        "session_id": session.session_id,
        "topology": _topology_to_dict(session.topology),
        "routing": {
            "strategy": session.routing.strategy,
            "target_node_id": session.routing.target_node_id,
            "weight_mode": session.routing.weight_mode,
        },
        "failures": {
            "failed_edge_ids": sorted(session.failures.failed_edge_ids),
        },
        "result": {
            **_routing_snapshot_to_dict(result),
            "reachable_node_count": reachable,
            "node_count": len(session.topology.nodes),
        },
    }
    if result.strategy == "bonsai_greedy":
        response["result"]["bonsai"] = _bonsai_result_to_dict(result)
    return response


def _bonsai_result_to_dict(result: RoutingResult) -> dict:
    return {
        "edge_connectivity": result.edge_connectivity,
        "arborescences": [
            {
                "tree_id": tree.tree_id,
                "target_node_id": tree.target_node_id,
                "depth": tree.depth,
                "arcs": [
                    {
                        "edge_id": arc.edge_id,
                        "source": arc.source,
                        "target": arc.target,
                    }
                    for arc in tree.arcs
                ],
            }
            for tree in result.arborescences
        ],
        "route_status_by_node": dict(sorted(result.route_status_by_node.items())),
        "routing_failure_node_ids": list(result.routing_failure_node_ids),
        "physically_unreachable_node_ids": list(
            result.physically_unreachable_node_ids
        ),
        "loop_node_ids": list(result.loop_node_ids),
        "dead_end_node_ids": list(result.dead_end_node_ids),
        "routes": {
            node_id: {
                "status": route.status,
                "node_ids": list(route.node_ids),
                "edge_ids": list(route.edge_ids),
                "switch_count": route.switch_count,
                "physically_reachable": route.physically_reachable,
                "steps": [
                    {
                        "node_id": step.node_id,
                        "tree_id": step.tree_id,
                        "action": step.action,
                        "next_node_id": step.next_node_id,
                        "edge_id": step.edge_id,
                    }
                    for step in route.steps
                ],
            }
            for node_id, route in sorted(result.bonsai_routes.items())
        },
    }


def _search_response(search: SearchResult, max_k: int) -> dict:
    response = {
        "status": search.status,
        "max_k": max_k,
        "tested_combinations": search.tested_combinations,
        "found_at_k": search.found_at_k,
        "failed_edge_ids": (
            list(search.failed_edge_ids)
            if search.failed_edge_ids is not None
            else None
        ),
        "affected_node_ids": list(search.affected_node_ids),
        "result": None,
    }
    if search.failure_type is not None:
        response["failure_type"] = search.failure_type
    if search.routing_result is not None:
        reachable = sum(
            path is not None
            for path in search.routing_result.current_paths.values()
        )
        response["result"] = {
            **_routing_snapshot_to_dict(search.routing_result),
            "reachable_node_count": reachable,
            "node_count": len(search.routing_result.current_paths),
        }
        if search.routing_result.strategy == "bonsai_greedy":
            response["result"]["bonsai"] = _bonsai_result_to_dict(
                search.routing_result
            )
    return response


def _evaluate(session: SimulationSession) -> RoutingResult:
    node_ids = {node.id for node in session.topology.nodes}
    edge_ids = {edge.id for edge in session.topology.edges}
    if session.routing.target_node_id not in node_ids:
        raise HTTPException(status_code=422, detail="target node does not exist")
    if session.routing.weight_mode not in {"hop_count", "edge_weight"}:
        raise HTTPException(
            status_code=422,
            detail="weight_mode must be 'hop_count' or 'edge_weight'",
        )
    if session.routing.strategy not in {
        "deterministic_shortest_path",
        "bonsai_greedy",
    }:
        raise HTTPException(status_code=422, detail="unsupported routing strategy")
    unknown = sorted(session.failures.failed_edge_ids - edge_ids)
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"unknown failed edge IDs: {', '.join(unknown)}",
        )
    try:
        if session.routing.strategy == "bonsai_greedy":
            return compute_bonsai_routing_result(
                session.topology,
                session.routing,
                session.failures.failed_edge_ids,
                decomposition=session.bonsai_decomposition,
            )
        return compute_routing_result(
            session.topology,
            session.routing,
            session.failures.failed_edge_ids,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


def create_app(store: SessionStore | None = None) -> FastAPI:
    sessions = store or SessionStore()
    app = FastAPI(
        title="Failover Routing Visualization API",
        version="0.1.0",
    )
    app.state.sessions = sessions

    @app.exception_handler(TopologyImportError)
    async def topology_import_error_handler(
        _request: Request, error: TopologyImportError
    ) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(error)})

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/sessions/import")
    async def import_topology(
        request: Request,
        filename: str = Query(min_length=1, max_length=255),
    ) -> dict:
        payload = await request.body()
        if len(payload) > DEFAULT_MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="topology file is too large")
        suffix = Path(filename).suffix.lower()
        if suffix == ".json":
            topology = import_topohub_json_bytes(payload, source_name=filename)
        elif suffix == ".xml":
            topology = import_sndlib_xml_bytes(payload, source_name=filename)
        else:
            raise HTTPException(
                status_code=415,
                detail="supported formats are TopoHub JSON (.json) and SNDlib XML (.xml)",
            )
        session = sessions.create(topology)
        return _session_response(session, _evaluate(session))

    @app.patch("/api/sessions/{session_id}")
    def update_session(session_id: str, update: SessionUpdate) -> dict:
        try:
            session = sessions.update(
                session_id,
                target_node_id=update.target_node_id,
                strategy=update.strategy,
                weight_mode=update.weight_mode,
                failed_edge_ids=(
                    frozenset(update.failed_edge_ids)
                    if update.failed_edge_ids is not None
                    else None
                ),
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail="session not found") from error
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return _session_response(session, _evaluate(session))

    @app.post("/api/sessions/{session_id}/critical-failure-search")
    def search_critical_failures(
        session_id: str,
        request: CriticalFailureSearchRequest,
    ) -> dict:
        try:
            session = sessions.get(session_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="session not found") from error

        try:
            search = find_first_minimal_failure(
                session.topology,
                session.routing,
                request.max_k,
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return _search_response(search, request.max_k)

    return app


app = create_app()
