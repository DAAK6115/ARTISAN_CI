import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppIcon from './AppIcon';
import LogoutButton from './LogoutButton';

const items = [
  ['/admin/dashboard', 'chart', 'Vue d’ensemble'],
  ['/admin/users', 'users', 'Utilisateurs'],
  ['/admin/certifications', 'award', 'Certifications'],
  ['/admin/moderation', 'shield', 'Modération'],
  ['/admin/support', 'chat', 'Support'],
  ['/admin/audit', 'file', 'Journal d’audit'],
];

export default function AdminNavbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const active = (path) => location.pathname.startsWith(path);

  useEffect(() => setOpen(false), [location.pathname]);

  const NavItem = ({ item }) => {
    const [path, icon, label] = item;
    return (
      <Link
        to={path}
        className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition ${active(path) ? 'bg-[#EAF4F0] text-[#0B6B50]' : 'text-[#526159] hover:bg-[#F4F6F4] hover:text-[#111815]'}`}
      >
        <AppIcon name={icon} className="h-[18px] w-[18px]" />
        {label}
      </Link>
    );
  };

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-black/5 bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
        <div className="flex h-full flex-col p-4">
          <Link to="/admin/dashboard" className="flex items-center gap-3 px-2 py-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#10271F] text-white shadow-sm">
              <AppIcon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-black tracking-tight text-[#111815]">ARTISAN_CI</p>
              <p className="text-xs text-[#829087]">Administration</p>
            </div>
          </Link>
          <nav className="mt-5 space-y-1">{items.map((item) => <NavItem key={item[0]} item={item} />)}</nav>
          <div className="mt-auto border-t border-black/5 pt-4">
            <LogoutButton className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#B23A31] hover:bg-[#FFF0EE]" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/admin/dashboard" className="flex items-center gap-2 font-black">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#10271F] text-white"><AppIcon name="shield" className="h-4 w-4" /></span>
          ARTISAN_CI Admin
        </Link>
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]" aria-label="Ouvrir le menu"><AppIcon name="menu" className="h-5 w-5" /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] lg:hidden">
          <button className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Fermer" />
          <div className="absolute inset-x-3 top-3 rounded-[28px] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between"><div><p className="font-black">Administration</p><p className="text-xs text-[#718078]">Contrôle et modération</p></div><button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4F6F4]"><AppIcon name="close" className="h-5 w-5" /></button></div>
            <div className="grid gap-2">{items.map((item) => <NavItem key={item[0]} item={item} />)}</div>
            <LogoutButton className="mt-3 w-full rounded-2xl bg-[#FFF0EE] px-4 py-3 text-sm font-bold text-[#B23A31]" />
          </div>
        </div>
      )}
    </>
  );
}
