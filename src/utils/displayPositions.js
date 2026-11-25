// Übernimmt nur vollständige, endliche Anzeigekoordinaten.
export function validPositions(positions) {
  return Object.fromEntries(
    Object.entries(positions ?? {})
      .filter(([, position]) => Number.isFinite(position?.x) && Number.isFinite(position?.y))
      .map(([nodeId, position]) => [nodeId, { x: position.x, y: position.y }]),
  );
}
