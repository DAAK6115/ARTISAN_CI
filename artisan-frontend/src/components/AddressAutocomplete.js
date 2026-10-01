import { useEffect, useRef, useState } from 'react';
import axios from '../utils/axiosInstance';

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Commencez à saisir une adresse…',
  helpText = '',
  disabled = false,
  country = '',
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (disabled || trimmed.length < 3 || skipSearchRef.current) {
      skipSearchRef.current = false;
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get('/portfolio/geocoding/search/', {
          params: { q: trimmed, limit: 6, ...(country ? { country } : {}) },
        });
        if (!cancelled) {
          setResults(response.data?.results || []);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, disabled, country]);

  const handleInput = (event) => {
    const next = event.target.value;
    setQuery(next);
    setOpen(true);
    onChange?.(next);
  };

  const choose = (result) => {
    const label = result.label || result.display_name || '';
    skipSearchRef.current = true;
    setQuery(label);
    setResults([]);
    setOpen(false);
    onChange?.(label);
    onSelect?.({
      address: label,
      displayName: result.display_name || label,
      latitude: Number(result.latitude),
      longitude: Number(result.longitude),
      raw: result,
    });
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 160)}
          disabled={disabled}
          autoComplete="street-address"
          placeholder={placeholder}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-11 font-normal outline-none transition focus:border-[#0B6B50] focus:ring-2 focus:ring-[#0B6B50]/10 disabled:bg-[#F4F6F4]"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#718078]">
          {loading ? '…' : '⌕'}
        </span>
      </div>

      {open && results.length > 0 ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_18px_50px_rgba(20,38,30,0.16)]">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(result)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#F3F7F5]"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#EAF4F0] text-[#0B6B50]">⌖</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#26352D]">{result.label}</span>
                {result.display_name && result.display_name !== result.label ? (
                  <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-[#718078]">{result.display_name}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {helpText ? <p className="mt-1.5 text-xs font-normal leading-5 text-[#829087]">{helpText}</p> : null}
    </div>
  );
}
