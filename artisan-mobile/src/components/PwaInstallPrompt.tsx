import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!promptEvent || dismissed || window.matchMedia('(display-mode: standalone)').matches) return null;

  async function install() {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') setPromptEvent(null);
    else setDismissed(true);
  }

  return (
    <div className="fixed inset-x-3 bottom-[98px] z-[90] mx-auto max-w-[536px] rounded-[22px] border border-black/5 bg-white p-3.5 shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--artisan-green-soft)] text-[var(--artisan-green)]"><Download size={18} /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-black text-[var(--artisan-ink)]">Installer ARTISAN_CI</p><p className="mt-0.5 text-[11px] leading-4 text-[var(--artisan-muted)]">Ajoutez l’application à votre écran d’accueil.</p></div>
        <button type="button" onClick={() => void install()} className="rounded-xl bg-[var(--artisan-green)] px-3 py-2 text-[11px] font-black text-white">Installer</button>
        <button type="button" onClick={() => setDismissed(true)} className="grid size-8 place-items-center rounded-xl bg-[#F4F6F4] text-[var(--artisan-muted)]" aria-label="Fermer"><X size={14} /></button>
      </div>
    </div>
  );
}
