import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from '../utils/axiosInstance';
import AppIcon from './AppIcon';
import LogoutButton from './LogoutButton';
import BrandLogo from './BrandLogo';

const primary = [
  ['/client/dashboard', 'home', 'Accueil'],
  ['/client/services', 'search', 'Rechercher'],
  ['/client/rdvs', 'calendar', 'Rendez-vous'],
  ['/client/mes-conversations', 'chat', 'Messages'],
  ['/client/profil', 'user', 'Profil'],
];

const secondary = [
  ['/client/artisans', 'user', 'Artisans'],
  ['/client/favoris', 'heart', 'Favoris'],
  ['/client/devis', 'file', 'Devis'],
  ['/client/paiements', 'receipt', 'Paiements'],
  ['/client/avis', 'star', 'Mes avis'],
  ['/client/notifications', 'bell', 'Notifications'],
  ['/client/support', 'chat', 'Support'],
];

export default function ClientNavbar() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname.startsWith(path);
  const allItems = useMemo(() => [...primary, ...secondary], []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;
    axios.get('/notifications/')
      .then((response) => {
        if (mounted) setUnreadCount((response.data || []).filter((item) => !item.lu).length);
      })
      .catch(() => mounted && setUnreadCount(0));
    return () => { mounted = false; };
  }, [location.pathname]);

  const NavLink = ({ item, compact = false }) => {
    const [path, icon, label] = item;
    const active = isActive(path);
    return (
      <Link
        to={path}
        className={`group flex items-center gap-3 rounded-2xl transition ${compact ? 'px-3 py-3' : 'px-3.5 py-3'} ${active ? 'bg-[#EAF4F0] font-bold text-[#0B6B50]' : 'text-[#526159] hover:bg-[#F4F6F4] hover:text-[#111815]'}`}
      >
        <span className={`relative grid h-8 w-8 place-items-center rounded-xl ${active ? 'bg-white shadow-sm' : 'bg-transparent'}`}>
          <AppIcon name={icon} className="h-[18px] w-[18px]" />
          {path.includes('notifications') && unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#D84A3A] px-1 text-center text-[10px] font-black leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </span>
        <span className="text-sm">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-black/5 bg-white md:sticky md:top-0 md:block md:h-screen">
        <div className="flex h-full flex-col p-4">
          <Link to="/" className="px-2 py-3">
            <BrandLogo variant="horizontal" subtitle="Espace client" imageClassName="h-12 w-auto" />
          </Link>

          <nav className="mt-5 space-y-1" aria-label="Navigation client">
            {primary.slice(0, 3).map((item) => <NavLink key={item[0]} item={item} />)}
            <div className="my-4 border-t border-black/5" />
            {allItems.filter((item) => !primary.slice(0, 3).some((primaryItem) => primaryItem[0] === item[0])).map((item) => <NavLink key={item[0]} item={item} />)}
          </nav>

          <div className="mt-auto border-t border-black/5 pt-4">
            <LogoutButton className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#B23A31] hover:bg-[#FFF0EE] disabled:opacity-60" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link to="/client/dashboard" className="flex min-w-0 items-center">
          <BrandLogo variant="horizontal" imageClassName="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/client/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4] text-[#334139]" aria-label="Notifications">
            <AppIcon name="bell" className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[#D84A3A] px-1 text-center text-[9px] font-black leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </Link>
          <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4] text-[#334139]" aria-label="Ouvrir le menu">
            <AppIcon name="menu" className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[24px] border border-black/5 bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(20,38,30,0.18)] backdrop-blur-xl md:hidden" aria-label="Navigation mobile client">
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
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] md:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0" onClick={() => setMenuOpen(false)} aria-label="Fermer" />
          <div className="absolute inset-x-3 top-3 rounded-[28px] bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between px-1 pb-3">
              <div>
                <p className="font-black">Menu client</p>
                <p className="text-xs text-[#718078]">Accès rapide à toutes vos fonctionnalités</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]" aria-label="Fermer le menu"><AppIcon name="close" className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {secondary.map((item) => <NavLink key={item[0]} item={item} compact />)}
            </div>
            <LogoutButton className="mt-3 w-full rounded-2xl bg-[#FFF0EE] px-4 py-3 text-sm font-bold text-[#B23A31] disabled:opacity-60" />
          </div>
        </div>
      )}
    </>
  );
}
