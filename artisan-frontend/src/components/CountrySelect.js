import { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosInstance';

function countryName(code, fallback = '') {
  try {
    const names = new Intl.DisplayNames(['fr'], { type: 'region' });
    return names.of(code) || fallback || code;
  } catch {
    return fallback || code;
  }
}

export default function CountrySelect({ value = 'CI', onChange, label = 'Pays', disabled = false }) {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios.get('/accounts/reference/countries/')
      .then(({ data }) => {
        if (mounted) setCountries(Array.isArray(data?.countries) ? data.countries : []);
      })
      .catch(() => {
        if (mounted) setCountries([{ code: 'CI', name: "Côte d’Ivoire", dial_code: '+225', currency: 'XOF', flag: '🇨🇮' }]);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const normalized = useMemo(() => countries.map((item) => ({
    ...item,
    displayName: countryName(item.code, item.name),
  })).sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')), [countries]);

  const selected = normalized.find((item) => item.code === value);

  return (
    <label className="block text-sm font-bold text-[#223027]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value, normalized.find((item) => item.code === event.target.value) || null)}
        disabled={disabled || loading}
        className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-normal text-[#111815] outline-none transition focus:border-[#0B6B50] focus:ring-2 focus:ring-[#0B6B50]/10 disabled:opacity-60"
      >
        {normalized.length === 0 && <option value="CI">🇨🇮 Côte d’Ivoire</option>}
        {normalized.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag || ''} {country.displayName} {country.dial_code ? `(${country.dial_code})` : ''}
          </option>
        ))}
      </select>
      {selected && (
        <span className="mt-1.5 block text-xs font-normal text-[#718078]">
          Indicatif {selected.dial_code || '—'} · Devise {selected.currency || '—'}
        </span>
      )}
    </label>
  );
}
