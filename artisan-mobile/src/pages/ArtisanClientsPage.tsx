import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, ChevronRight, CircleDollarSign, Search, UserRound, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MobileTopBar } from '../components/MobileTopBar';
import { getArtisanClients } from '../features/artisan/artisan.api';

function money(value: number | string): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} FCFA`;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function ArtisanClientsPage() {
  const [search, setSearch] = useState('');
  const clients = useQuery({
    queryKey: ['artisan-clients'],
    queryFn: getArtisanClients
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients.data ?? [];
    return (clients.data ?? []).filter((item) =>
      item.username.toLowerCase().includes(query) || item.last_service.toLowerCase().includes(query)
    );
  }, [clients.data, search]);

  const totals = useMemo(() => {
    const data = clients.data ?? [];
    return {
      clients: data.length,
      appointments: data.reduce((sum, item) => sum + item.appointments_count, 0),
      paid: data.reduce((sum, item) => sum + Number(item.paid_total || 0), 0)
    };
  }, [clients.data]);

  return (
    <div>
      <MobileTopBar />

      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--artisan-green)]">Relation client</p>
        <h1 className="mt-1.5 text-[28px] font-black tracking-[-0.045em] text-[var(--artisan-ink)]">Mes clients</h1>
        <p className="mt-1 text-sm leading-5 text-[var(--artisan-muted)]">Retrouvez les personnes avec lesquelles vous avez réellement travaillé.</p>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-3xl border border-black/5 bg-white p-3.5 shadow-[var(--artisan-shadow-sm)]">
          <UsersRound size={17} className="text-[var(--artisan-green)]" />
          <p className="mt-4 text-xl font-black tracking-[-0.04em] text-[var(--artisan-ink)]">{totals.clients}</p>
          <p className="mt-0.5 text-[10px] font-bold text-[var(--artisan-muted)]">Clients</p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-3.5 shadow-[var(--artisan-shadow-sm)]">
          <CalendarCheck size={17} className="text-[var(--artisan-orange)]" />
          <p className="mt-4 text-xl font-black tracking-[-0.04em] text-[var(--artisan-ink)]">{totals.appointments}</p>
          <p className="mt-0.5 text-[10px] font-bold text-[var(--artisan-muted)]">Rendez-vous</p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-3.5 shadow-[var(--artisan-shadow-sm)]">
          <CircleDollarSign size={17} className="text-[#9A6B00]" />
          <p className="mt-4 truncate text-[15px] font-black tracking-[-0.035em] text-[var(--artisan-ink)]">{new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(totals.paid)}</p>
          <p className="mt-0.5 text-[10px] font-bold text-[var(--artisan-muted)]">FCFA réglés</p>
        </div>
      </section>

      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-[var(--artisan-shadow-sm)]">
        <Search size={18} className="shrink-0 text-[var(--artisan-green)]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un client ou un service…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--artisan-muted-light)]"
        />
      </label>

      <section className="mt-4 space-y-3">
        {clients.isPending ? [1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl bg-white" />) : null}

        {clients.isError ? (
          <div className="rounded-3xl bg-[var(--artisan-danger-soft)] p-5 text-sm font-semibold text-[var(--artisan-danger)]">
            Impossible de charger vos clients.
          </div>
        ) : null}

        {!clients.isPending && !clients.isError && filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#CBD5D0] bg-white/70 px-5 py-10 text-center">
            <UsersRound className="mx-auto text-[var(--artisan-green)]" size={31} />
            <p className="mt-3 text-sm font-black text-[var(--artisan-ink)]">Aucun client trouvé</p>
            <p className="mt-1 text-xs leading-5 text-[var(--artisan-muted)]">Les clients apparaissent après leurs premières demandes de rendez-vous.</p>
          </div>
        ) : null}

        {filtered.map((client) => (
          <article key={client.id} className="rounded-3xl border border-black/5 bg-white p-4 shadow-[var(--artisan-shadow-card)]">
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]">
                <UserRound size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-black text-[var(--artisan-ink)]">{client.username}</h2>
                    <p className="mt-1 truncate text-xs font-semibold text-[var(--artisan-muted)]">Dernier service : {client.last_service}</p>
                  </div>
                  <ChevronRight size={18} className="mt-1 shrink-0 text-[#A0AAA5]" />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-[#F7F8F6] px-2.5 py-2">
                    <p className="text-[13px] font-black text-[var(--artisan-ink)]">{client.appointments_count}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-[var(--artisan-muted)]">Rendez-vous</p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F8F6] px-2.5 py-2">
                    <p className="text-[13px] font-black text-[var(--artisan-ink)]">{client.completed_count}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-[var(--artisan-muted)]">Terminés</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--artisan-gold-soft)] px-2.5 py-2">
                    <p className="truncate text-[11px] font-black text-[#8A6200]">{money(client.paid_total)}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-[#9A7A24]">Réglés</p>
                  </div>
                </div>

                <p className="mt-3 text-[10px] font-semibold text-[var(--artisan-muted)]">Dernier rendez-vous · {dateLabel(client.last_appointment_at)}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
