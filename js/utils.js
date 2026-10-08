export function normalizeHebrew(text) {
  if (!text) return '';
  return String(text).toLowerCase().trim();
}
