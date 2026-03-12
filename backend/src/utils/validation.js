export function parsePositiveInt(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }
  return number;
}

export function normalizeEnum(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function isValidHexColor(value) {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  return /^#[0-9A-Fa-f]{6}$/.test(String(value).trim());
}

