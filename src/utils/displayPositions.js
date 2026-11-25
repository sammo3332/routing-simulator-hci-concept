// Grenze wie im Szenario-Schema; weit entfernte Positionen wären nicht auffindbar.
const LIMIT = 100000;

// Übernimmt nur vollständige, endliche Anzeigekoordinaten innerhalb der Grenze.
export function validPositions(positions) {
  return Object.fromEntries(
    Object.entries(positions ?? {})
      .filter(([, position]) => Number.isFinite(position?.x) && Number.isFinite(position?.y)
        && Math.abs(position.x) <= LIMIT && Math.abs(position.y) <= LIMIT)
      .map(([nodeId, position]) => [nodeId, { x: position.x, y: position.y }]),
  );
}
