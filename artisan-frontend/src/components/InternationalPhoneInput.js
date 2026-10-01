import { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosInstance';

export default function InternationalPhoneInput({
  countryCode = 'CI',
  value = '',
  onChange,
  label = 'Téléphone',
  placeholder = 'Numéro local',
  helpText = 'Le numéro sera enregistré au format international.',
  required = false,
  disabled = false,
}) {
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    let mounted = true;
    axios.get('/accounts/reference/countries/')
      .then(({ data }) => {
        if (mounted) setCountries(Array.isArray(data?.countries) ? data.countries : []);
      })
      .catch(() => {
        if (mounted) setCountries([{ code: 'CI', dial_code: '+225', flag: '🇨🇮', name: "Côte d’Ivoire" }]);
      });
    return () => { mounted = false; };
  }, []);

  const selected = useMemo(
    () => countries.find((country) => country.code === countryCode) || null,
    [countries, countryCode],
  );

  const effectivePlaceholder = selected?.phone_example
    ? `Ex. ${selected.phone_example}`
    : placeholder;

  return (
    <label className="block text-sm font-bold text-[#223027]">
      {label}
      <div className="mt-1 flex overflow-hidden rounded-2xl border border-black/10 bg-white transition focus-within:border-[#0B6B50] focus-within:ring-2 focus-within:ring-[#0B6B50]/10">
        <span className="flex min-w-[92px] items-center justify-center gap-1.5 border-r border-black/10 bg-[#F6F8F6] px-3 text-sm font-black text-[#334139]">
          <span>{selected?.flag || ''}</span>
          <span>{selected?.dial_code || '...'}</span>
        </span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value || ''}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={effectivePlaceholder}
          required={required}
          disabled={disabled}
          className="min-w-0 flex-1 bg-white px-4 py-3 font-normal text-[#111815] outline-none disabled:opacity-60"
        />
      </div>
      <span className="mt-1.5 block text-xs font-normal leading-5 text-[#718078]">
        {selected?.phone_example ? `Exemple ${selected?.flag || ''} : ${selected.phone_example}. ` : ''}
        {selected?.dial_code ? `${selected.dial_code} sera appliqué automatiquement. ` : ''}{helpText}
      </span>
    </label>
  );
}
