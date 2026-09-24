import { useEffect, useState } from 'react';

const DATA_SAVER_KEY = 'artisan_ci_data_saver';
const LARGE_TEXT_KEY = 'artisan_ci_large_text';

export function applyAccessibilityPreferences() {
  const dataSaver = localStorage.getItem(DATA_SAVER_KEY) === '1' || navigator.connection?.saveData === true;
  const largeText = localStorage.getItem(LARGE_TEXT_KEY) === '1';
  document.documentElement.dataset.dataSaver = dataSaver ? 'true' : 'false';
  document.documentElement.dataset.largeText = largeText ? 'true' : 'false';
}

export function setDataSaver(enabled) {
  localStorage.setItem(DATA_SAVER_KEY, enabled ? '1' : '0');
  document.documentElement.dataset.dataSaver = enabled ? 'true' : 'false';
  window.dispatchEvent(new CustomEvent('artisan:data-saver', { detail: enabled }));
}

export function setLargeText(enabled) {
  localStorage.setItem(LARGE_TEXT_KEY, enabled ? '1' : '0');
  document.documentElement.dataset.largeText = enabled ? 'true' : 'false';
}

export function useDataSaver() {
  const initial = () => localStorage.getItem(DATA_SAVER_KEY) === '1' || navigator.connection?.saveData === true;
  const [enabled, setEnabled] = useState(initial);
  useEffect(() => {
    const listener = (event) => setEnabled(Boolean(event.detail));
    window.addEventListener('artisan:data-saver', listener);
    return () => window.removeEventListener('artisan:data-saver', listener);
  }, []);
  return enabled;
}
