import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../utils/axiosInstance';
import AppIcon from './AppIcon';

function listFromResponse(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

export default function SavedAddressPicker({ onSelect }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios.get('/accounts/client/addresses/')
      .then(({ data }) => {
        if (mounted) setAddresses(listFromResponse(data));
      })
      .catch(() => {
        if (mounted) setAddresses([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="mb-3 h-16 animate-pulse rounded-2xl bg-white" />;
  }

  if (addresses.length === 0) {
    return (
      <div className="mb-3 rounded-2xl border border-dashed border-[#CBD7D0] bg-white p-3">
        <p className="text-xs font-semibold leading-5 text-[#718078]">Aucune adresse enregistrée.</p>
        <Link to="/client/adresses" className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[#0B6B50]">
          Ajouter une adresse <AppIcon name="arrow" className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-[#718078]">Mes adresses</p>
        <Link to="/client/adresses" className="text-xs font-black text-[#0B6B50]">Gérer</Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {addresses.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.({
              id: item.id,
              label: item.label,
              address: item.address,
              country_code: item.country_code,
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
            })}
            className={`rounded-2xl border px-3 py-3 text-left transition hover:border-[#0B6B50] hover:bg-[#F2FAF7] ${item.is_default ? 'border-[#A9D4C5] bg-[#F2FAF7]' : 'border-[#DDE5E0] bg-white'}`}
          >
            <div className="flex items-center gap-2">
              <AppIcon name="pin" className="h-4 w-4 shrink-0 text-[#0B6B50]" />
              <span className="truncate text-sm font-black text-[#26352D]">{item.label}</span>
              {item.is_default && <span className="ml-auto rounded-full bg-[#0B6B50] px-2 py-0.5 text-[9px] font-black uppercase text-white">Défaut</span>}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#718078]">{item.address}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
