import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampDetailsHeight,
  DEFAULT_DETAILS_HEIGHT,
  MIN_DETAILS_HEIGHT,
  resizeDetailsFromPointerDelta,
} from "../utils/detailsPanel";

const MIN_GRAPH_HEIGHT = 280;
const HANDLE_HEIGHT = 38;
const MAIN_VERTICAL_PADDING = 24;
const KEYBOARD_STEP = 24;

export function useResizableDetailsPanel() {
  const containerRef = useRef(null);
  const drag = useRef(null);
  const [detailsHeight, setDetailsHeight] = useState(DEFAULT_DETAILS_HEIGHT);
  const [collapsed, setCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const maximumHeight = useCallback(() => {
    const containerHeight = containerRef.current?.getBoundingClientRect().height;
    if (!containerHeight) return DEFAULT_DETAILS_HEIGHT;
    return Math.max(
      MIN_DETAILS_HEIGHT,
      containerHeight - MAIN_VERTICAL_PADDING - HANDLE_HEIGHT - MIN_GRAPH_HEIGHT,
    );
  }, []);

  const resizeTo = useCallback(height => {
    setDetailsHeight(clampDetailsHeight(height, maximumHeight()));
  }, [maximumHeight]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      setDetailsHeight(current => clampDetailsHeight(current, maximumHeight()));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [maximumHeight]);

  const onPointerDown = useCallback(event => {
    if (collapsed || event.button !== 0 || event.target !== event.currentTarget) return;
    drag.current = {
      pointerId: event.pointerId,
      clientY: event.clientY,
      detailsHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  }, [collapsed, detailsHeight]);

  const onPointerMove = useCallback(event => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    setDetailsHeight(resizeDetailsFromPointerDelta(
      active.detailsHeight,
      event.clientY - active.clientY,
      maximumHeight(),
    ));
  }, [maximumHeight]);

  const finishResize = useCallback(event => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
    setIsResizing(false);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(current => !current);
    setIsResizing(false);
    drag.current = null;
  }, []);

  const resetHeight = useCallback(() => {
    setCollapsed(false);
    resizeTo(DEFAULT_DETAILS_HEIGHT);
  }, [resizeTo]);

  const onKeyDown = useCallback(event => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleCollapsed();
    } else if (!collapsed && event.key === "ArrowUp") {
      event.preventDefault();
      resizeTo(detailsHeight + KEYBOARD_STEP);
    } else if (!collapsed && event.key === "ArrowDown") {
      event.preventDefault();
      resizeTo(detailsHeight - KEYBOARD_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetHeight();
    }
  }, [collapsed, detailsHeight, resetHeight, resizeTo, toggleCollapsed]);

  return {
    containerRef,
    detailsHeight,
    collapsed,
    isResizing,
    toggleCollapsed,
    resetHeight,
    separatorHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishResize,
      onPointerCancel: finishResize,
      onKeyDown,
      onDoubleClick: resetHeight,
    },
  };
}
