export const DATA_CHANGED_EVENT = 'artisan-ci:data-changed';

export function notifyDataChanged(detail = {}) {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail }));
}
