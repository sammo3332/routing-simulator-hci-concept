import { useCallback, useEffect, useRef, useState } from "react";
import {
  fitViewportToNodes,
  initialGraphViewport,
  panViewport,
  zoomViewportAtPoint,
} from "../utils/graphViewport";
import { clampPointToRect, eventPointInSvg, moveNodePosition } from "../utils/graphLayout";

const BUTTON_ZOOM_FACTOR = 1.25;
const NODE_DRAG_MARGIN = 14;

export function useGraphViewport({ width, height, nodes, resetKey, onMoveNode }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const [viewport, setViewport] = useState(initialGraphViewport);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    setViewport(fitViewportToNodes(nodesRef.current, width, height));
    setIsPanning(false);
    setDraggedNodeId(null);
    const active = drag.current;
    drag.current = null;
    if (active && svgRef.current?.hasPointerCapture(active.pointerId)) {
      svgRef.current.releasePointerCapture(active.pointerId);
    }
  }, [height, resetKey, width]);

  const zoomBy = useCallback((factor, point = { x: width / 2, y: height / 2 }) => {
    if (drag.current) return;
    setViewport(current => zoomViewportAtPoint(current, point, factor));
  }, [height, width]);

  const zoomIn = useCallback(() => zoomBy(BUTTON_ZOOM_FACTOR), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / BUTTON_ZOOM_FACTOR), [zoomBy]);
  const fit = useCallback(() => {
    if (drag.current) return;
    setViewport(fitViewportToNodes(nodes, width, height));
  }, [height, nodes, width]);

  const onWheel = useCallback(event => {
    event.preventDefault();
    if (!svgRef.current || drag.current) return;
    const point = eventPointInSvg(
      svgRef.current,
      event.clientX,
      event.clientY,
    );
    if (!point) return;
    const limitedDelta = Math.max(-100, Math.min(100, event.deltaY));
    zoomBy(Math.exp(-limitedDelta * 0.002), point);
  }, [zoomBy]);

  // React registriert onWheel passiv; preventDefault wirkt dort nicht und die
  // Seite würde beim Zoomen mitscrollen.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [onWheel, resetKey]);

  const onPointerDown = useCallback(event => {
    if (event.button !== 0 || drag.current) return;
    suppressClick.current = false;
    const svg = event.currentTarget;
    const nodeElement = event.target.closest?.("[data-graph-node-id]");
    const nodeId = nodeElement?.dataset.graphNodeId;
    const node = nodesRef.current.find(item => item.id === nodeId);
    if (!node && event.target.dataset.panSurface !== "true") return;
    const point = eventPointInSvg(svg, event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    // Abstand zwischen Zeiger und Knotenmitte, damit die Begrenzung auf die
    // sichtbare Fläche für die Knotenmitte gilt und nicht für den Griffpunkt.
    let grabOffset = { x: 0, y: 0 };
    if (node) {
      const circles = nodeElement.querySelectorAll("circle");
      const box = circles[circles.length - 1].getBoundingClientRect();
      grabOffset = {
        x: event.clientX - (box.left + box.width / 2),
        y: event.clientY - (box.top + box.height / 2),
      };
    }
    drag.current = {
      grabOffset,
      kind: node ? "node" : "pan",
      nodeId,
      position: node?.position,
      point,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      viewport,
      moved: false,
    };
    svg.setPointerCapture(event.pointerId);
    if (node) setDraggedNodeId(nodeId);
    else setIsPanning(true);
  }, [viewport]);

  const onPointerMove = useCallback(event => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    // Ein Knoten bleibt innerhalb der sichtbaren Graphfläche; sonst ließe er
    // sich hinter die Seitenleiste ziehen und wäre nicht mehr auffindbar.
    let client = { x: event.clientX, y: event.clientY };
    if (active.kind === "node") {
      const center = clampPointToRect(
        { x: client.x - active.grabOffset.x, y: client.y - active.grabOffset.y },
        event.currentTarget.getBoundingClientRect(),
        NODE_DRAG_MARGIN,
      );
      client = { x: center.x + active.grabOffset.x, y: center.y + active.grabOffset.y };
    }
    const point = eventPointInSvg(event.currentTarget, client.x, client.y);
    if (!point) return;
    if (!active.moved && Math.hypot(
      event.clientX - active.clientX, event.clientY - active.clientY,
    ) < 3) return;
    active.moved = true;
    if (active.kind === "node") {
      onMoveNode?.(active.nodeId, moveNodePosition(
        active.position, active.point, point, active.viewport.scale,
      ));
      return;
    }
    setViewport(panViewport(
      active.viewport,
      point.x - active.point.x,
      point.y - active.point.y,
    ));
  }, [onMoveNode]);

  const finishPan = useCallback(event => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    suppressClick.current = active.moved;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
    setDraggedNodeId(null);
  }, []);

  const onKeyDown = useCallback(event => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomIn();
    } else if (event.key === "-") {
      event.preventDefault();
      zoomOut();
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      fit();
    }
  }, [fit, zoomIn, zoomOut]);

  return {
    svgRef,
    viewport,
    isPanning,
    draggedNodeId,
    zoomIn,
    zoomOut,
    fit,
    svgHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPan,
      onPointerCancel: finishPan,
      onLostPointerCapture: finishPan,
      onClickCapture: event => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      },
      onKeyDown,
    },
  };
}
