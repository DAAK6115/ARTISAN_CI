import { Download, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

type PwaEventDetail = { updateSW?: (reloadPage?: boolean) => Promise<void> };

export function PwaStatusToast() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const onOfflineReady = () => setOfflineReady(true);
    const onNeedRefresh = (event: Event) => {
      const detail = (event as CustomEvent<PwaEventDetail>).detail;
      setUpdateSW(() => detail?.updateSW ?? null);
    };
    window.addEventListener('artisan:pwa-offline-ready', onOfflineReady);
    window.addEventListener('artisan:pwa-update', onNeedRefresh);
    return () => {
      window.removeEventListener('artisan:pwa-offline-ready', onOfflineReady);
      window.removeEventListener('artisan:pwa-update', onNeedRefresh);
    };
  }, []);

  if (!offlineReady && !updateSW) return null;

  return (
    <div className="fixed inset-x-3 bottom-[98px] z-[95] mx-auto max-w-[536px] rounded-[22px] border border-black/5 bg-[#111815] p-3.5 text-white shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[var(--artisan-gold)]">
          {updateSW ? <Download size={18} /> : <Wifi size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{updateSW ? 'Nouvelle version disponible' : 'ARTISAN_CI est prêt hors ligne'}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-white/65">
            {updateSW ? 'Mettez à jour pour profiter des dernières corrections.' : 'Les écrans déjà chargés resteront accessibles sans réseau.'}
          </p>
        </div>
        {updateSW ? (
          <button
            type="button"
            onClick={() => void updateSW(true)}
            className="shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-[#111815]"
          >
            Mettre à jour
          </button>
        ) : (
          <button type="button" onClick={() => setOfflineReady(false)} className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-[11px] font-black">OK</button>
        )}
      </div>
    </div>
  );
}
