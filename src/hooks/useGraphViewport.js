import { useCallback, useEffect, useRef, useState } from "react";
import {
  fitViewportToNodes,
  initialGraphViewport,
  panViewport,
  zoomViewportAtPoint,
} from "../utils/graphViewport";

const BUTTON_ZOOM_FACTOR = 1.25;

function eventPointInViewBox(svg, clientX, clientY, width, height) {
  const bounds = svg.getBoundingClientRect();
  return {
    x: (clientX - bounds.left) * (width / bounds.width),
    y: (clientY - bounds.top) * (height / bounds.height),
  };
}

export function useGraphViewport({ width, height, nodes, resetKey }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const [viewport, setViewport] = useState(initialGraphViewport);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    setViewport(fitViewportToNodes(nodesRef.current, width, height));
    setIsPanning(false);
    drag.current = null;
  }, [height, resetKey, width]);

  const zoomBy = useCallback((factor, point = { x: width / 2, y: height / 2 }) => {
    setViewport(current => zoomViewportAtPoint(current, point, factor));
  }, [height, width]);

  const zoomIn = useCallback(() => zoomBy(BUTTON_ZOOM_FACTOR), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / BUTTON_ZOOM_FACTOR), [zoomBy]);
  const fit = useCallback(() => {
    setViewport(fitViewportToNodes(nodes, width, height));
  }, [height, nodes, width]);

  const onWheel = useCallback(event => {
    event.preventDefault();
    if (!svgRef.current) return;
    const point = eventPointInViewBox(
      svgRef.current,
      event.clientX,
      event.clientY,
      width,
      height,
    );
    const limitedDelta = Math.max(-100, Math.min(100, event.deltaY));
    zoomBy(Math.exp(-limitedDelta * 0.002), point);
  }, [height, width, zoomBy]);

  const onPointerDown = useCallback(event => {
    if (event.button !== 0 || event.target.dataset.panSurface !== "true") return;
    const svg = event.currentTarget;
    const bounds = svg.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      viewport,
      unitsPerPixelX: width / bounds.width,
      unitsPerPixelY: height / bounds.height,
    };
    svg.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }, [height, viewport, width]);

  const onPointerMove = useCallback(event => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    setViewport(panViewport(
      active.viewport,
      (event.clientX - active.clientX) * active.unitsPerPixelX,
      (event.clientY - active.clientY) * active.unitsPerPixelY,
    ));
  }, []);

  const finishPan = useCallback(event => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
    setIsPanning(false);
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
    zoomIn,
    zoomOut,
    fit,
    svgHandlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPan,
      onPointerCancel: finishPan,
      onKeyDown,
    },
  };
}
