import { useCallback, useState } from "react";
import { applyNodePositions } from "../utils/graphLayout";

export function useGraphLayout({ nodes, links, resetKey }) {
  const [layout, setLayout] = useState({ resetKey, positions: {} });
  // Ignore the previous session's coordinates immediately, even on the first
  // render of a newly imported topology with the same node IDs.
  const positions = layout.resetKey === resetKey ? layout.positions : {};
  const moveNode = useCallback((nodeId, position) => {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
    setLayout(current => ({
      resetKey,
      positions: {
        ...(current.resetKey === resetKey ? current.positions : {}),
        [nodeId]: position,
      },
    }));
  }, [resetKey]);
  const reset = useCallback(() => {
    setLayout({ resetKey, positions: {} });
  }, [resetKey]);

  return {
    ...applyNodePositions(nodes, links, positions),
    moveNode,
    reset,
    hasChanges: Object.keys(positions).length > 0,
  };
}
