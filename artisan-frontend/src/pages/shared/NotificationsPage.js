import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import useAutoRefresh from '../../hooks/useAutoRefresh';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function notificationTone(notification) {
  const title = String(notification?.titre || '').toLowerCase();
  const link = String(notification?.lien_redirection || '').toLowerCase();

  if (title.includes('paiement') || link.includes('paiement')) {
    return { dot: 'bg-[#E07A32]', icon: 'receipt', iconStyle: 'bg-[#FFF2E7] text-[#C85F18]' };
  }
  if (title.includes('devis') || link.includes('devis')) {
    return { dot: 'bg-[#D8A117]', icon: 'file', iconStyle: 'bg-[#FFF7DD] text-[#8A6500]' };
  }
  if (title.includes('message') || link.includes('messagerie')) {
    return { dot: 'bg-[#3565A8]', icon: 'chat', iconStyle: 'bg-[#EDF4FF] text-[#3565A8]' };
  }
  if (title.includes('certification')) {
    return { dot: 'bg-[#8A6500]', icon: 'award', iconStyle: 'bg-[#FFF7DD] text-[#8A6500]' };
  }
  if (title.includes('support') || title.includes('litige') || title.includes('contest')) {
    return { dot: 'bg-[#B23A31]', icon: 'shield', iconStyle: 'bg-[#FFF0EE] text-[#B23A31]' };
  }
  return { dot: 'bg-[#E07A32]', icon: 'bell', iconStyle: 'bg-[#EAF4F0] text-[#0B6B50]' };
}

function actionLabel(notification, role) {
  const link = String(notification?.lien_redirection || '');
  if (!link) return null;
  if (link.includes('paiements')) return role === 'artisan' ? 'Voir les règlements' : 'Voir le paiement';
  if (link.includes('devis')) return 'Voir le devis';
  if (link.includes('rdv')) return role === 'artisan' ? 'Voir l’agenda' : 'Voir le rendez-vous';
  if (link.includes('certifications')) return 'Voir la certification';
  if (link.includes('support')) return 'Voir le support';
  if (link.includes('messagerie')) return 'Voir le message';
  return 'Ouvrir';
}

function safeNotificationPath(notification, role) {
  const link = String(notification?.lien_redirection || '').trim();
  if (!link.startsWith('/')) return '';
  const allowedPrefix = role === 'artisan' ? '/artisan/' : '/client/';
  return link.startsWith(allowedPrefix) ? link : '';
}

export default function NotificationsPage({ role }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await axios.get('/notifications/');
      setNotifications(response.data || []);
      setError('');
    } catch {
      setError('Impossible de charger vos notifications pour le moment.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load({ silent: true }), { intervalMs: 15000 });

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.lu).length,
    [notifications],
  );

  const openNotification = async (notification) => {
    if (!notification.lu) {
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, lu: true } : item
      )));
      try {
        await axios.patch(`/notifications/${notification.id}/lu/`, {});
      } catch {
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, lu: false } : item
        )));
        return;
      }
    }

    const destination = safeNotificationPath(notification, role);
    if (destination) navigate(destination);
  };

  const markAllRead = async () => {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, lu: true })));
    try {
      await axios.patch('/notifications/mark-all-read/', {});
    } catch {
      setNotifications(previous);
      setError('Impossible de marquer toutes les notifications comme lues.');
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <div className="h-24 animate-pulse rounded-[28px] bg-white" />
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-[24px] bg-white" />)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 pb-28 sm:p-6 lg:pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B6B50]">Centre d’activité</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111815]">Notifications</h1>
          <p className="mt-2 text-sm text-[#718078]">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}.`
              : 'Vous êtes à jour.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {refreshing && <span className="text-xs font-semibold text-[#829087]">Actualisation…</span>}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll}
              className="rounded-xl border border-[#DDE5E0] bg-white px-4 py-2.5 text-sm font-black text-[#334139] hover:bg-[#F5F7F5] disabled:opacity-60"
            >
              {markingAll ? 'Mise à jour…' : 'Tout marquer comme lu'}
            </button>
          )}
          <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]">
            <AppIcon name="bell" className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#E07A32] px-1 text-center text-[10px] font-black leading-5 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
        </div>
      </header>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <section className="mt-6 rounded-[28px] border border-dashed border-[#CAD5CF] bg-white p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]">
            <AppIcon name="bell" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-black text-[#111815]">Aucune notification</h2>
          <p className="mt-1 text-sm text-[#718078]">Les nouvelles activités liées à votre compte apparaîtront ici.</p>
        </section>
      ) : (
        <section className="mt-6 space-y-3" aria-live="polite">
          {notifications.map((notification) => {
            const tone = notificationTone(notification);
            const destination = safeNotificationPath(notification, role);
            const label = destination ? actionLabel(notification, role) : null;
            const actionable = Boolean(destination);

            return (
              <article
                key={notification.id}
                className={`group rounded-[24px] border p-4 transition sm:p-5 ${notification.lu
                  ? 'border-black/5 bg-white'
                  : 'border-[#D7E7E0] bg-[#FBFEFC] shadow-[0_8px_24px_rgba(20,38,30,0.05)]'}`}
              >
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`flex w-full items-start gap-3 text-left ${actionable ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-label={actionable ? `${notification.titre}. ${label || 'Ouvrir'}` : notification.titre}
                >
                  <span className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone.iconStyle}`}>
                    <AppIcon name={tone.icon} className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      {!notification.lu && <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />}
                      <strong className="min-w-0 flex-1 text-[15px] font-black leading-5 text-[#111815]">
                        {notification.titre}
                      </strong>
                    </span>
                    <span className="mt-1.5 block text-sm leading-5 text-[#5F6D65]">{notification.message}</span>
                    <span className="mt-2 block text-[11px] font-semibold text-[#829087]">{formatDate(notification.date_envoi)}</span>
                  </span>

                  {actionable && (
                    <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#718078] transition group-hover:bg-[#EAF4F0] group-hover:text-[#0B6B50]">
                      <AppIcon name="chevron" className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
