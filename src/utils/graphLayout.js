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
