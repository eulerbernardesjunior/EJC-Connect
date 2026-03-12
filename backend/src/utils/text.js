export function normalizeText(value) {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function isBlankRow(cells) {
  return !cells.some((cell) => String(cell ?? "").trim().length > 0);
}

export function toNullable(value) {
  const text = String(value ?? "").trim();
  return text.length === 0 ? null : text;
}
