export function speakText(text, { lang = 'fr-FR' } = {}) {
  if (!('speechSynthesis' in window) || !text?.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.trim().slice(0, 12000));
  utterance.lang = lang;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function startSpeechRecognition({ onResult, onError, lang = 'fr-FR' } = {}) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    onError?.('La reconnaissance vocale n’est pas disponible sur ce navigateur.');
    return null;
  }
  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => onResult?.(event.results?.[0]?.[0]?.transcript || '');
  recognition.onerror = () => onError?.('Impossible d’utiliser la reconnaissance vocale.');
  recognition.start();
  return recognition;
}
