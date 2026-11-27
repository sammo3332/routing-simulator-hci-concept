async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Serverfehler (${response.status})`);
  }
  return data;
}

export async function importTopology(file) {
  const response = await fetch(
    `/api/sessions/import?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file,
    },
  );
  return parseResponse(response);
}

export async function updateSimulationSession(sessionId, patch) {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseResponse(response);
}

export async function searchCriticalFailures(sessionId, maxK) {
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/critical-failure-search`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_k: maxK }),
    },
  );
  return parseResponse(response);
}
