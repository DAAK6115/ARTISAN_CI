export function formatMoney(value, currency = 'XOF', locale = 'fr-FR') {
  const code = String(currency || 'XOF').toUpperCase();
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${new Intl.NumberFormat(locale).format(Number.isFinite(amount) ? amount : 0)} ${code}`;
  }
}

export function currencyCode(value) {
  return String(value || 'XOF').toUpperCase();
}


export function serviceDisplayCurrency(service) {
  return String(service?.display_currency_code || service?.currency_code || 'XOF').toUpperCase();
}

export function serviceDisplayAmount(service) {
  const value = service?.display_prix ?? service?.prix ?? 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatServiceMoney(service, locale = 'fr-FR') {
  return formatMoney(serviceDisplayAmount(service), serviceDisplayCurrency(service), locale);
}

export function serviceOriginalMoney(service, locale = 'fr-FR') {
  return formatMoney(service?.prix ?? 0, service?.currency_code || 'XOF', locale);
}

export function servicePriceWasConverted(service) {
  return Boolean(service?.display_conversion_applied);
}
