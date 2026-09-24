import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppIcon from './AppIcon';
import LogoutButton from './LogoutButton';

const primary = [
  ['/artisan/dashboard', 'home', 'Accueil'],
  ['/artisan/rdv', 'calendar', 'Agenda'],
  ['/artisan/services', 'tools', 'Prestations'],
  ['/artisan/clients', 'users', 'Clients'],
  ['/artisan/profil', 'user', 'Profil'],
];

const secondary = [
  ['/artisan/devis', 'file', 'Devis'],
  ['/artisan/paiements', 'wallet', 'Règlements'],
  ['/artisan/portfolio', 'image', 'Portfolio'],
  ['/artisan/certifications', 'award', 'Certifications'],
  ['/artisan/mes-conversations', 'chat', 'Messages'],
  ['/artisan/support', 'chat', 'Support'],
];

export default function ArtisanNavbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (path) => location.pathname.startsWith(path);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const NavItem = ({ item, mobile = false }) => {
    const [path, icon, label] = item;
    const active = isActive(path);
    return (
      <Link
        to={path}
        className={`flex items-center gap-2 rounded-2xl transition ${mobile ? 'px-3 py-3' : 'px-3 py-2'} ${active ? 'bg-[#EAF4F0] font-bold text-[#0B6B50]' : 'text-[#536158] hover:bg-[#F4F6F4] hover:text-[#111815]'}`}
      >
        <AppIcon name={icon} className="h-[18px] w-[18px]" />
        <span className="text-sm">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/artisan/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0B6B50] text-white shadow-sm">
              <AppIcon name="tools" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-black tracking-tight text-[#111815]">ARTISAN_CI</p>
              <p className="truncate text-[11px] font-semibold text-[#829087]">Espace professionnel</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation artisan principale">
            {primary.slice(0, 4).map((item) => <NavItem key={item[0]} item={item} />)}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-2xl border border-black/5 bg-[#F7F8F6] px-4 py-2 text-sm font-bold text-[#445148] hover:bg-[#EFF2EF]">
                Gestion
              </summary>
              <div className="absolute right-0 mt-2 w-60 rounded-[22px] border border-black/5 bg-white p-2 shadow-2xl">
                {secondary.map((item) => <NavItem key={item[0]} item={item} />)}
                <div className="my-2 border-t border-black/5" />
                <NavItem item={primary[4]} />
                <LogoutButton className="mt-1 w-full rounded-2xl px-3 py-2 text-left text-sm font-bold text-[#B23A31] hover:bg-[#FFF0EE] disabled:opacity-60" />
              </div>
            </details>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4] text-[#334139] lg:hidden"
            aria-label="Ouvrir le menu artisan"
          >
            <AppIcon name="menu" className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[24px] border border-black/5 bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(20,38,30,0.18)] backdrop-blur-xl lg:hidden" aria-label="Navigation mobile artisan">
        {primary.map(([path, icon, label]) => {
          const active = isActive(path);
          return (
            <Link key={path} to={path} className={`flex min-w-0 flex-col items-center gap-1 rounded-[18px] px-1 py-2 text-[10px] font-bold ${active ? 'bg-[#EAF4F0] text-[#0B6B50]' : 'text-[#718078]'}`}>
              <AppIcon name={icon} className="h-5 w-5" />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          );
        })}
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0" onClick={() => setMenuOpen(false)} aria-label="Fermer" />
          <div className="absolute inset-x-3 top-3 max-h-[calc(100vh-24px)] overflow-y-auto rounded-[28px] bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between px-1 pb-3">
              <div>
                <p className="font-black text-[#111815]">Espace artisan</p>
                <p className="text-xs text-[#718078]">Pilotez votre activité</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]" aria-label="Fermer le menu">
                <AppIcon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[...primary, ...secondary].map((item) => <NavItem key={item[0]} item={item} mobile />)}
            </div>
            <LogoutButton className="mt-3 w-full rounded-2xl bg-[#FFF0EE] px-4 py-3 text-sm font-bold text-[#B23A31] disabled:opacity-60" />
          </div>
        </div>
      )}
    </>
  );
}
