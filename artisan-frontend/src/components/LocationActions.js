import { buildNavigationLinks } from '../utils/location';

export default function LocationActions({ latitude, longitude, label = 'ARTISAN_CI', compact = false }) {
  const links = buildNavigationLinks(latitude, longitude, label);
  if (!links) return null;

  const baseClass = compact
    ? 'rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black text-[#33423A] hover:border-[#0B6B50]/30 hover:text-[#0B6B50]'
    : 'rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#33423A] hover:border-[#0B6B50]/30 hover:text-[#0B6B50]';

  return (
    <div className="flex flex-wrap gap-2" aria-label="Ouvrir la localisation dans une application GPS">
      <a href={links.google} target="_blank" rel="noreferrer" className={`${baseClass} bg-[#EAF4F0] text-[#0B6B50]`}>Google Maps</a>
      <a href={links.waze} target="_blank" rel="noreferrer" className={baseClass}>Waze</a>
      <a href={links.apple} target="_blank" rel="noreferrer" className={baseClass}>Apple Plans</a>
      <a href={links.native} className={baseClass}>GPS / autre app</a>
      <a href={links.osm} target="_blank" rel="noreferrer" className={baseClass}>OpenStreetMap</a>
    </div>
  );
}
