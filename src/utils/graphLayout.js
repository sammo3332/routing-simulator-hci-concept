// Display coordinates only: never write them into the imported topology.
export function applyNodePositions(nodes, links, overrides) {
  const positionedNodes = nodes.map(node => ({
    ...node,
    position: Object.hasOwn(overrides, node.id) ? overrides[node.id] : node.position,
  }));
  const positions = new Map(positionedNodes.map(node => [node.id, node.position]));
  return {
    nodes: positionedNodes,
    links: links.map(link => {
      const sourcePosition = positions.get(link.source);
      const targetPosition = positions.get(link.target);
      return {
        ...link,
        sourcePosition,
        targetPosition,
        midpoint: {
          x: (sourcePosition.x + targetPosition.x) / 2,
          y: (sourcePosition.y + targetPosition.y) / 2,
        },
      };
    }),
  };
}

export function moveNodePosition(position, startPoint, currentPoint, scale) {
  return {
    x: position.x + (currentPoint.x - startPoint.x) / scale,
    y: position.y + (currentPoint.y - startPoint.y) / scale,
  };
}

// getScreenCTM includes SVG viewBox scaling and its letterboxing.
export function eventPointInSvg(svg, clientX, clientY) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

// Hält einen Zeigerpunkt innerhalb eines Rechtecks (Bildschirmkoordinaten).
export function clampPointToRect(point, rect, margin = 0) {
  const clamp = (value, minimum, maximum) => (
    maximum < minimum ? (minimum + maximum) / 2 : Math.min(maximum, Math.max(minimum, value))
  );
  return {
    x: clamp(point.x, rect.left + margin, rect.right - margin),
    y: clamp(point.y, rect.top + margin, rect.bottom - margin),
  };
}

// Endpunkt einer Strecke, um `distance` vor dem Ziel verkürzt. Damit endet ein
// Pfeil am Rand des Zielknotens statt verdeckt in dessen Mitte.
export function shortenSegmentEnd(from, to, distance) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (!Number.isFinite(length) || length <= distance * 2) {
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  }
  const ratio = (length - distance) / length;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

// Sichtbarer Ausschnitt in Graphkoordinaten für die aktuelle Ansicht.
export function visibleGraphBounds(viewport, width, height) {
  return {
    left: (0 - viewport.x) / viewport.scale,
    top: (0 - viewport.y) / viewport.scale,
    right: (width - viewport.x) / viewport.scale,
    bottom: (height - viewport.y) / viewport.scale,
  };
}

// Position des Namens-Tooltips: am Knoten, innerhalb des sichtbaren Ausschnitts.
export function placeNodeTooltip(position, size, bounds, margin = 6) {
  const minimumX = bounds.left + margin;
  const maximumX = bounds.right - size.width - margin;
  const centered = position.x - size.width / 2;
  const x = maximumX < minimumX ? centered : Math.min(maximumX, Math.max(minimumX, centered));
  const above = position.y - 45;
  const y = above >= bounds.top + margin ? above : position.y + 25;
  return { x, y };
}
