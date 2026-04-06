import { useCallback, useMemo, useRef, useState } from 'react';

interface SpeakOptions {
  priority?: 'low' | 'normal' | 'high';
}

const BASE_COOLDOWN_MS = 12000;

function getPriorityMultiplier(priority: SpeakOptions['priority']): number {
  if (priority === 'high') return 0.55;
  if (priority === 'low') return 1.6;
  return 1;
}

export function useSpeechCoach() {
  const [enabled, setEnabled] = useState(true);
  const lastMessageRef = useRef<string>('');
  const lastSpokenAtRef = useRef<number>(0);

  const isSupported = useMemo(
    () => typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined',
    []
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
  }, [isSupported]);

  const speak = useCallback(
    (message: string, options?: SpeakOptions) => {
      if (!isSupported || !enabled) return;

      const now = Date.now();
      const cooldown = BASE_COOLDOWN_MS * getPriorityMultiplier(options?.priority);
      if (lastMessageRef.current === message && now - lastSpokenAtRef.current < cooldown) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.02;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const voicePtBr = voices.find((v) => /pt-BR/i.test(v.lang));
      if (voicePtBr) {
        utterance.voice = voicePtBr;
      }

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);

      lastMessageRef.current = message;
      lastSpokenAtRef.current = now;
    },
    [enabled, isSupported]
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stop();
      }
      return next;
    });
  }, [stop]);

  return {
    enabled,
    isSupported,
    speak,
    stop,
    toggle,
  };
}
