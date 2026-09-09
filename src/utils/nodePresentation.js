function abbreviationBase(value) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();
  if (!normalized) return "?";

  const words = normalized.split(/\s+/);
  const compact = words.length > 1
    ? words.map(word => word[0]).join("")
    : words[0];
  return compact.slice(0, 4).toUpperCase();
}

export function buildNodeAbbreviations(nodes) {
  const used = new Set();
  return Object.fromEntries(nodes.map(node => {
    const fullName = node.label || node.id;
    const base = abbreviationBase(fullName);
    let abbreviation = base;
    let suffix = 2;
    while (used.has(abbreviation)) {
      const suffixText = String(suffix);
      abbreviation = `${base.slice(0, Math.max(1, 4 - suffixText.length))}${suffixText}`;
      suffix += 1;
    }
    used.add(abbreviation);
    return [node.id, abbreviation];
  }));
}
