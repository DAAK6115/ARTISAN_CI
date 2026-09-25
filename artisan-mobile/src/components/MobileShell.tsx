import { CalendarDays, Home, MessageCircle, Search, UserRound, UsersRound, Wrench } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../features/auth/auth.store';

const clientNav = [
  { to: '/client', label: 'Accueil', Icon: Home, end: true },
  { to: '/client/recherche', label: 'Rechercher', Icon: Search },
  { to: '/client/rendez-vous', label: 'Rendez-vous', Icon: CalendarDays },
  { to: '/client/messages', label: 'Messages', Icon: MessageCircle },
  { to: '/client/profil', label: 'Profil', Icon: UserRound }
];

const artisanNav = [
  { to: '/artisan', label: 'Accueil', Icon: Home, end: true },
  { to: '/artisan/agenda', label: 'Agenda', Icon: CalendarDays },
  { to: '/artisan/prestations', label: 'Prestations', Icon: Wrench },
  { to: '/artisan/clients', label: 'Clients', Icon: UsersRound },
  { to: '/artisan/profil', label: 'Profil', Icon: UserRound }
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((state) => state.user?.role);
  const nav = role === 'artisan' ? artisanNav : clientNav;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] bg-[var(--artisan-surface)]">
      <main className="min-h-dvh px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))] sm:px-5">
        {children}
      </main>

      <nav
        className="fixed inset-x-3 bottom-3 z-50 mx-auto w-[calc(100%-24px)] max-w-[536px] rounded-[24px] border border-black/5 bg-white/95 p-1.5 shadow-[var(--artisan-shadow-nav)] backdrop-blur-xl"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
        aria-label={role === 'artisan' ? 'Navigation mobile artisan' : 'Navigation mobile client'}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center gap-1 rounded-[18px] px-1 py-2 text-[10px] font-bold transition ${
                  isActive
                    ? 'bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]'
                    : 'text-[var(--artisan-muted)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="grid size-7 place-items-center">
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  </span>
                  <span className="w-full truncate text-center">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
