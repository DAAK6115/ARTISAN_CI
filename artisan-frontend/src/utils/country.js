export function countryDisplayName(code) {
  if (!code) return '';
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' }).of(String(code).toUpperCase()) || code;
  } catch {
    return code;
  }
}

export function countryFlag(code) {
  const value = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) return '';
  return String.fromCodePoint(...[...value].map((char) => 127397 + char.charCodeAt(0)));
}
