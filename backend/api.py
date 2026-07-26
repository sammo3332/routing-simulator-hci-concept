from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path
from threading import RLock
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

from .failover_core.models import FailureState, RoutingConfig, RoutingResult, Topology
from .failover_core.routing import compute_routing_result
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
                weight_mode=weight_mode or session.routing.weight_mode,
            )
            failures = (
                replace(session.failures, failed_edge_ids=failed_edge_ids)
                if failed_edge_ids is not None
                else session.failures
            )
            updated = replace(session, routing=routing, failures=failures)
            node_ids = {node.id for node in updated.topology.nodes}
            edge_ids = {edge.id for edge in updated.topology.edges}
            if updated.routing.target_node_id not in node_ids:
                raise ValueError("target node does not exist")
            if updated.routing.weight_mode not in {"hop_count", "edge_weight"}:
                raise ValueError(
                    "weight_mode must be 'hop_count' or 'edge_weight'"
                )
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
    weight_mode: str | None = None
    failed_edge_ids: list[str] | None = None


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
    return {
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
    unknown = sorted(session.failures.failed_edge_ids - edge_ids)
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"unknown failed edge IDs: {', '.join(unknown)}",
        )
    return compute_routing_result(
        session.topology,
        session.routing,
        session.failures.failed_edge_ids,
    )


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

    return app


app = create_app()
