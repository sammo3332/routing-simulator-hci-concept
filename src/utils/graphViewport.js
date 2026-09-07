export const MIN_GRAPH_SCALE = 0.5;
export const MAX_GRAPH_SCALE = 6;

export function initialGraphViewport() {
  return { x: 0, y: 0, scale: 1 };
}

export function clampGraphScale(
  scale,
  minimum = MIN_GRAPH_SCALE,
  maximum = MAX_GRAPH_SCALE,
) {
  return Math.min(maximum, Math.max(minimum, scale));
}

export function zoomViewportAtPoint(
  viewport,
  point,
  factor,
  minimum = MIN_GRAPH_SCALE,
  maximum = MAX_GRAPH_SCALE,
) {
  if (!Number.isFinite(factor) || factor <= 0) return viewport;
  const nextScale = clampGraphScale(viewport.scale * factor, minimum, maximum);
  const ratio = nextScale / viewport.scale;
  return {
    scale: nextScale,
    x: point.x - (point.x - viewport.x) * ratio,
    y: point.y - (point.y - viewport.y) * ratio,
  };
}

export function panViewport(viewport, deltaX, deltaY) {
  return {
    ...viewport,
    x: viewport.x + deltaX,
    y: viewport.y + deltaY,
  };
}

export function fitViewportToNodes(
  nodes,
  width,
  height,
  {
    padding = 52,
    minimum = MIN_GRAPH_SCALE,
    maximum = MAX_GRAPH_SCALE,
  } = {},
) {
  const positions = nodes
    .map(node => node.position)
    .filter(position => Number.isFinite(position?.x) && Number.isFinite(position?.y));
  if (!positions.length || width <= 0 || height <= 0) return initialGraphViewport();

  const xs = positions.map(position => position.x);
  const ys = positions.map(position => position.y);
  const minimumX = Math.min(...xs);
  const maximumX = Math.max(...xs);
  const minimumY = Math.min(...ys);
  const maximumY = Math.max(...ys);
  const contentWidth = Math.max(1, maximumX - minimumX);
  const contentHeight = Math.max(1, maximumY - minimumY);
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const scale = clampGraphScale(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
    minimum,
    maximum,
  );
  const centerX = (minimumX + maximumX) / 2;
  const centerY = (minimumY + maximumY) / 2;

  return {
    scale,
    x: width / 2 - centerX * scale,
    y: height / 2 - centerY * scale,
  };
}
