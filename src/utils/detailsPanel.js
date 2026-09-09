export const DEFAULT_DETAILS_HEIGHT = 380;
export const MIN_DETAILS_HEIGHT = 240;

export function clampDetailsHeight(
  height,
  maximum,
  minimum = MIN_DETAILS_HEIGHT,
) {
  const safeMaximum = Math.max(minimum, maximum);
  return Math.min(safeMaximum, Math.max(minimum, height));
}

export function resizeDetailsFromPointerDelta(
  initialHeight,
  pointerDeltaY,
  maximum,
  minimum = MIN_DETAILS_HEIGHT,
) {
  return clampDetailsHeight(initialHeight - pointerDeltaY, maximum, minimum);
}
