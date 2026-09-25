import { useEffect, useRef } from 'react';
import { DATA_CHANGED_EVENT } from '../utils/dataSync';

export default function useAutoRefresh(refresh, {
  intervalMs = 20000,
  enabled = true,
} = {}) {
  const callbackRef = useRef(refresh);
  const runningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    const run = async () => {
      if (runningRef.current || document.visibilityState === 'hidden') return;
      runningRef.current = true;
      try {
        await callbackRef.current?.();
      } catch {
        // Les écrans gardent leurs propres messages d'erreur.
      } finally {
        runningRef.current = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener(DATA_CHANGED_EVENT, run);
    window.addEventListener('focus', run);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', onVisible);

    const timer = intervalMs > 0 ? window.setInterval(run, intervalMs) : null;

    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, run);
      window.removeEventListener('focus', run);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}
