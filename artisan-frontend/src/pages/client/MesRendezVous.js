import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const STATUS_META = {
  en_attente: { label: 'Demande envoyée', badge: 'bg-[#FFF4DE] text-[#9A5D00]', dot: 'bg-[#E7A326]', progress: 1 },
  accepte: { label: 'Accepté', badge: 'bg-[#EAF4F0] text-[#0B6B50]', dot: 'bg-[#0B6B50]', progress: 2 },
  confirme: { label: 'Confirmé', badge: 'bg-[#EAF4F0] text-[#0B6B50]', dot: 'bg-[#0B6B50]', progress: 3 },
  en_route: { label: 'Artisan en route', badge: 'bg-[#EAF5FF] text-[#1269A7]', dot: 'bg-[#2A88C9]', progress: 4 },
  en_cours: { label: 'Prestation en cours', badge: 'bg-[#EEF0FF] text-[#4854B8]', dot: 'bg-[#5965D8]', progress: 5 },
  termine: { label: 'À confirmer', badge: 'bg-[#F4EDFF] text-[#7650A8]', dot: 'bg-[#8660B6]', progress: 6 },
  effectue: { label: 'Clôturé', badge: 'bg-[#EDF1EE] text-[#526159]', dot: 'bg-[#718078]', progress: 7 },
  refuse: { label: 'Refusé', badge: 'bg-[#FFF0EE] text-[#B23A31]', dot: 'bg-[#D84A3A]', progress: 0 },
  annule_client: { label: 'Annulé', badge: 'bg-[#FFF0EE] text-[#B23A31]', dot: 'bg-[#D84A3A]', progress: 0 },
  annule_artisan: { label: 'Annulé par l’artisan', badge: 'bg-[#FFF0EE] text-[#B23A31]', dot: 'bg-[#D84A3A]', progress: 0 },
  annule: { label: 'Annulé', badge: 'bg-[#FFF0EE] text-[#B23A31]', dot: 'bg-[#D84A3A]', progress: 0 },
};

const ACTIVE_STATUSES = new Set(['en_attente', 'accepte', 'confirme', 'en_route', 'en_cours', 'termine']);
const HISTORY_STATUSES = new Set(['effectue', 'refuse', 'annule_client', 'annule_artisan', 'annule']);

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;
  if (Array.isArray(data)) return data[0] || fallback;
  return fallback;
}

function dayKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function formatAgendaDate(date) {
  const value = new Date(date);
  return {
    day: new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(value),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(value).replace('.', '').toUpperCase(),
    weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(value).replace('.', ''),
    time: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(value),
  };
}

function durationLabel(start, end) {
  const minutes = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest.toString().padStart(2, '0')}` : `${hours} h`;
}

function ProgressLine({ status }) {
  const progress = STATUS_META[status]?.progress || 0;
  if (!progress || ['refuse', 'annule_client', 'annule_artisan', 'annule'].includes(status)) return null;
  const steps = ['Demandé', 'Accepté', 'Confirmé', 'En route', 'En cours', 'Terminé', 'Clôturé'];
  return (
    <div className="mt-5 overflow-x-auto pb-1">
      <div className="flex min-w-[520px] items-start">
        {steps.map((label, index) => {
          const done = index + 1 <= progress;
          return (
            <div key={label} className="relative flex flex-1 flex-col items-center text-center">
              {index > 0 ? <span className={`absolute right-1/2 top-[7px] h-[2px] w-full ${index + 1 <= progress ? 'bg-[#0B6B50]' : 'bg-[#DDE5E0]'}`} /> : null}
              <span className={`relative z-10 h-4 w-4 rounded-full border-2 ${done ? 'border-[#0B6B50] bg-[#0B6B50]' : 'border-[#CBD7D0] bg-white'}`} />
              <span className={`mt-2 text-[10px] font-bold ${done ? 'text-[#334139]' : 'text-[#9AA59F]'}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MesRendezVous() {
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('active');

  const fetchRdv = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get('/appointments/mes/');
      setRdvs(response.data);
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Impossible de charger vos rendez-vous.')}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchRdv(); }, []);
  useAutoRefresh(() => fetchRdv(true), { intervalMs: 15000 });

  const annulerRdv = async (rdv) => {
    if (!window.confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return;
    try {
      await axios.patch(`/appointments/${rdv.id}/changer-statut/`, {
        statut: 'annule_client',
        motif: 'Annulation demandée par le client',
      });
      setMessage('✅ Rendez-vous annulé.');
      await fetchRdv(true);
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, "Impossible d'annuler ce rendez-vous.")}`);
    }
  };

  const confirmerFin = async (rdv) => {
    if (!window.confirm('Confirmez-vous que la prestation est bien terminée ?')) return;
    try {
      await axios.post(`/appointments/confirmer/${rdv.id}/`);
      setMessage('✅ Prestation confirmée et rendez-vous clôturé.');
      await fetchRdv(true);
    } catch (error) {
      setMessage(`❌ ${apiErrorMessage(error, 'Confirmation impossible.')}`);
    }
  };

  const stats = useMemo(() => {
    const today = dayKey(new Date());
    return {
      upcoming: rdvs.filter((item) => ACTIVE_STATUSES.has(item.statut)).length,
      today: rdvs.filter((item) => ACTIVE_STATUSES.has(item.statut) && dayKey(item.date_rdv) === today).length,
      active: rdvs.filter((item) => ['en_route', 'en_cours', 'termine'].includes(item.statut)).length,
      completed: rdvs.filter((item) => item.statut === 'effectue').length,
    };
  }, [rdvs]);

  const visible = useMemo(() => {
    const items = [...rdvs].sort((a, b) => {
      const diff = new Date(a.date_rdv) - new Date(b.date_rdv);
      return filter === 'history' ? -diff : diff;
    });
    if (filter === 'active') return items.filter((item) => ACTIVE_STATUSES.has(item.statut));
    if (filter === 'history') return items.filter((item) => HISTORY_STATUSES.has(item.statut));
    return items;
  }, [rdvs, filter]);

  return (
    <div className="mx-auto max-w-[1180px] p-4 pb-28 sm:p-6 lg:pb-8">
      <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_14px_40px_rgba(25,44,34,0.06)] sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Mon planning</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#111815]">Mes rendez-vous</h1>
            <p className="mt-2 text-sm text-[#66736D]">Suivez chaque étape de vos prestations sans avoir à recharger la page.</p>
          </div>
          <div className="inline-flex rounded-2xl bg-[#F3F6F4] p-1">
            {[
              ['active', 'À venir'],
              ['history', 'Historique'],
              ['all', 'Tous'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${filter === value ? 'bg-white text-[#0B6B50] shadow-sm' : 'text-[#66736D]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['À venir', stats.upcoming, 'Rendez-vous ouverts'],
            ["Aujourd’hui", stats.today, 'Prévus ce jour'],
            ['En suivi', stats.active, 'En route / en cours'],
            ['Terminés', stats.completed, 'Prestations clôturées'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-2xl border border-black/5 bg-[#FBFCFB] p-4">
              <p className="text-2xl font-black text-[#111815]">{value}</p>
              <p className="mt-1 text-sm font-black text-[#334139]">{label}</p>
              <p className="mt-1 text-xs text-[#829087]">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${message.startsWith('❌') ? 'border-[#F0CBC7] bg-[#FFF5F3] text-[#A63D34]' : 'border-[#CFE5DB] bg-[#F2FAF6] text-[#0B6B50]'}`}>{message}</div>
      ) : null}

      <section className="mt-6">
        {loading ? (
          <div className="rounded-[28px] border border-black/5 bg-white p-10 text-center text-sm text-[#718078]">Chargement de votre agenda…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#C9D6CF] bg-[#FBFCFB] p-10 text-center">
            <p className="text-lg font-black text-[#334139]">Aucun rendez-vous dans cette vue</p>
            <p className="mt-2 text-sm text-[#718078]">Réservez une prestation pour la voir apparaître ici.</p>
            <Link to="/client/services" className="mt-4 inline-flex rounded-xl bg-[#0B6B50] px-4 py-2.5 text-sm font-black text-white">Trouver un artisan</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((rdv) => {
              const date = formatAgendaDate(rdv.date_rdv);
              const meta = STATUS_META[rdv.statut] || { label: rdv.statut, badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400', progress: 0 };
              return (
                <article key={rdv.id} className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_10px_32px_rgba(30,45,37,0.05)]">
                  <div className="grid md:grid-cols-[112px_1fr]">
                    <div className="flex items-center gap-3 border-b border-black/5 bg-[#F7F9F7] px-5 py-4 md:flex-col md:justify-center md:border-b-0 md:border-r md:px-3 md:text-center">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm md:h-16 md:w-16">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B6B50]">{date.month}</p>
                          <p className="text-2xl font-black leading-none text-[#111815]">{date.day}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold capitalize text-[#66736D]">{date.weekday}</p>
                        <p className="mt-0.5 text-base font-black text-[#111815]">{date.time}</p>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black text-[#111815]">{rdv.service_titre}</h2>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${meta.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-[#526159]">Artisan : <span className="text-[#111815]">{rdv.artisan_nom}</span></p>
                        </div>
                        <div className="rounded-2xl bg-[#F7F9F7] px-4 py-3 text-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#829087]">Horaire</p>
                          <p className="mt-1 font-black text-[#334139]">{date.time} · {durationLabel(rdv.date_rdv, rdv.date_fin)}</p>
                        </div>
                      </div>

                      <ProgressLine status={rdv.statut} />

                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border border-black/5 bg-[#FCFDFC] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.08em] text-[#718078]">Lieu</p>
                          <p className="mt-2 font-black text-[#334139]">{rdv.lieu_intervention === 'atelier' ? 'Dans l’atelier de l’artisan' : 'Chez vous'}</p>
                          {rdv.lieu_intervention === 'chez_client' && rdv.intervention_adresse ? <p className="mt-1 text-sm leading-5 text-[#66736D]">{rdv.intervention_adresse}</p> : null}
                        </div>
                        <div className="rounded-2xl border border-black/5 bg-[#FCFDFC] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.08em] text-[#718078]">Référence</p>
                          <p className="mt-2 text-sm font-bold text-[#526159]">Rendez-vous #{rdv.id}</p>
                          {rdv.commentaires ? <p className="mt-1 line-clamp-2 text-sm text-[#66736D]">{rdv.commentaires}</p> : null}
                        </div>
                      </div>

                      {rdv.motif_annulation ? <div className="mt-4 rounded-2xl bg-[#FFF4F2] px-4 py-3 text-sm text-[#A63D34]"><strong>Motif :</strong> {rdv.motif_annulation}</div> : null}

                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
                        <Link to={`/artisans/${rdv.artisan_nom}`} className="rounded-xl border border-[#DDE5E0] bg-white px-4 py-2.5 text-sm font-black text-[#334139] hover:border-[#9DB5A8]">Voir l’artisan</Link>
                        <Link to={`/client/messagerie/${rdv.artisan_nom}`} className="rounded-xl bg-[#F2F5F3] px-4 py-2.5 text-sm font-black text-[#334139]">Message</Link>
                        {rdv.peut_annuler ? (
                          <button onClick={() => annulerRdv(rdv)} className="rounded-xl border border-[#E7C5C1] bg-white px-4 py-2.5 text-sm font-black text-[#B23A31] hover:bg-[#FFF4F2]">Annuler</button>
                        ) : null}
                        {rdv.transitions_autorisees?.includes('effectue') ? (
                          <button onClick={() => confirmerFin(rdv)} className="rounded-xl bg-[#0B6B50] px-4 py-2.5 text-sm font-black text-white hover:bg-[#095A43]">Confirmer la fin</button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
