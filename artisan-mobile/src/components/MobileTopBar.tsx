import {
  Award,
  Bell,
  FileText,
  Heart,
  Images,
  Menu,
  MessageCircle,
  ReceiptText,
  ShieldQuestion,
  Star,
  UserRound,
  UsersRound,
  WalletCards,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { useAuthStore } from '../features/auth/auth.store';

const clientSecondary = [
  { to: '/client/artisans', label: 'Artisans', Icon: UsersRound },
  { to: '/client/favoris', label: 'Favoris', Icon: Heart },
  { to: '/client/devis', label: 'Devis', Icon: FileText },
  { to: '/client/paiements', label: 'Paiements', Icon: ReceiptText },
  { to: '/client/avis', label: 'Mes avis', Icon: Star },
  { to: '/client/notifications', label: 'Notifications', Icon: Bell },
  { to: '/client/support', label: 'Support', Icon: ShieldQuestion }
];

const artisanSecondary = [
  { to: '/artisan/devis', label: 'Devis', Icon: FileText },
  { to: '/artisan/reglements', label: 'Règlements', Icon: WalletCards },
  { to: '/artisan/portfolio', label: 'Portfolio', Icon: Images },
  { to: '/artisan/certifications', label: 'Certifications', Icon: Award },
  { to: '/artisan/messages', label: 'Messages', Icon: MessageCircle },
  { to: '/artisan/support', label: 'Support', Icon: ShieldQuestion }
];

interface MobileTopBarProps {
  showNotification?: boolean;
}

export function MobileTopBar({ showNotification = true }: MobileTopBarProps) {
  const role = useAuthStore((state) => state.user?.role);
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const isArtisan = role === 'artisan';
  const secondary = isArtisan ? artisanSecondary : clientSecondary;
  const homePath = isArtisan ? '/artisan' : '/client';
  const subtitle = isArtisan ? 'Espace professionnel' : 'Espace client';
  const notificationsPath = isArtisan ? '/artisan/notifications' : '/client/notifications';

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 -mt-[max(16px,env(safe-area-inset-top))] mb-6 border-b border-black/5 bg-white/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <Link to={homePath} className="min-w-0">
            <BrandMark subtitle={subtitle} />
          </Link>

          <div className="flex items-center gap-2">
            {showNotification ? (
              <Link
                to={notificationsPath}
                className="relative grid size-10 place-items-center rounded-xl bg-[#F4F6F4] text-[#334139]"
                aria-label="Notifications"
              >
                <Bell size={19} />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid size-10 place-items-center rounded-xl bg-[#F4F6F4] text-[#334139]"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <button className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Fermer" />
          <div className="absolute inset-x-3 top-3 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[28px] bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between px-1 pb-3">
              <div>
                <p className="font-black text-[var(--artisan-ink)]">{isArtisan ? 'Espace artisan' : 'Menu client'}</p>
                <p className="mt-0.5 text-xs text-[var(--artisan-muted)]">
                  {isArtisan ? 'Pilotez votre activité' : 'Accès rapide à toutes vos fonctionnalités'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-xl bg-[#F4F6F4]"
                aria-label="Fermer le menu"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {secondary.map(({ to, label, Icon }) => {
                const active = location.pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                      active
                        ? 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]'
                        : 'bg-[#F7F8F6] text-[#526159]'
                    }`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-white shadow-sm' : 'bg-white/70'}`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 truncate">{label}</span>
                  </Link>
                );
              })}
            </div>

            <Link
              to={isArtisan ? '/artisan/profil' : '/client/profil'}
              className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl border border-black/5 px-3 py-3 text-sm font-bold text-[#526159]"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-[#F4F6F4]"><UserRound size={18} /></span>
              Mon profil
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
