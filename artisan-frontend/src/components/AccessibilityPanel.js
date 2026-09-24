import { useEffect, useState } from 'react';
import AppIcon from './AppIcon';
import { applyAccessibilityPreferences, setDataSaver, setLargeText } from '../utils/accessibility';
import { speakText, stopSpeaking } from '../utils/speech';

export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const [dataSaver, setSaverState] = useState(false);
  const [largeText, setLargeTextState] = useState(false);

  useEffect(() => {
    applyAccessibilityPreferences();
    setSaverState(document.documentElement.dataset.dataSaver === 'true');
    setLargeTextState(document.documentElement.dataset.largeText === 'true');
    return () => stopSpeaking();
  }, []);

  const readPage = () => {
    const main = document.querySelector('main') || document.body;
    const text = main.innerText.replace(/\s+/g, ' ').trim();
    speakText(text);
  };

  return (
    <div className="fixed bottom-24 right-4 z-[70] md:bottom-6">
      {open && (
        <div className="mb-3 w-72 rounded-[24px] border border-black/5 bg-white p-3 shadow-2xl">
          <p className="px-2 pb-2 text-sm font-black text-[#111815]">Accessibilité</p>
          <button onClick={readPage} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold hover:bg-[#F4F6F4]"><AppIcon name="volume" className="h-5 w-5 text-[#0B6B50]" /> Lire cette page</button>
          <button onClick={stopSpeaking} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold hover:bg-[#F4F6F4]"><AppIcon name="close" className="h-5 w-5" /> Arrêter la lecture</button>
          <button onClick={() => { const next=!largeText; setLargeTextState(next); setLargeText(next); }} className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-bold hover:bg-[#F4F6F4]"><span>Texte agrandi</span><span className={largeText ? 'text-[#0B6B50]' : 'text-[#829087]'}>{largeText ? 'Activé' : 'Désactivé'}</span></button>
          <button onClick={() => { const next=!dataSaver; setSaverState(next); setDataSaver(next); }} className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-bold hover:bg-[#F4F6F4]"><span>Économie de données</span><span className={dataSaver ? 'text-[#0B6B50]' : 'text-[#829087]'}>{dataSaver ? 'Activée' : 'Désactivée'}</span></button>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} className="grid h-12 w-12 place-items-center rounded-2xl bg-[#111815] text-white shadow-xl" aria-label="Options d’accessibilité" aria-expanded={open}><AppIcon name="volume" className="h-5 w-5" /></button>
    </div>
  );
}
