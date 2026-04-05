import { useState, useRef, useEffect } from 'react';

// ─── useCadence ───────────────────────────────────────────────────────────────
// Estima passos por minuto usando velocidade GPS + comprimento de passada.
// Não depende do pedômetro — funciona só com GPS ativo.
//
// SPM = (velocidade em m/min) / passada (m)
// Passos da sessão = distância percorrida / passada
// ─────────────────────────────────────────────────────────────────────────────

const SPM_MIN = 40;
const SPM_MAX = 220;

export function useCadence(
  speedMs: number,
  distanceM: number,
  strideM: number
) {
  const [data, setData] = useState({
    stepsPerMinute: 0,
    sessionSteps: 0,
    elapsedSeconds: 0,
  });

  // EMA para suavizar o SPM e evitar oscilações bruscas
  const spmEmaRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const isMoving = speedMs > 0.3 && strideM > 0;

    if (isMoving && !runningRef.current) {
      // Começa a contar o tempo quando o usuário começa a se mover
      runningRef.current = true;
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }

      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          const elapsed = Math.floor(
            (Date.now() - (startTimeRef.current ?? Date.now())) / 1000
          );
          setData((d) => ({ ...d, elapsedSeconds: elapsed }));
        }, 1000);
      }
    }

    if (!isMoving && runningRef.current) {
      runningRef.current = false;
    }

    if (!isMoving) {
      // Quando parado: SPM decai para 0 suavemente
      spmEmaRef.current = Math.round(spmEmaRef.current * 0.85);
      setData((d) => ({
        ...d,
        stepsPerMinute: spmEmaRef.current,
        sessionSteps: strideM > 0 ? Math.round(distanceM / strideM) : d.sessionSteps,
      }));
      return;
    }

    // SPM bruto a partir da velocidade GPS
    const speedMPerMin = speedMs * 60;
    const rawSpm = strideM > 0 ? speedMPerMin / strideM : 0;
    const clampedSpm = Math.min(SPM_MAX, Math.max(SPM_MIN, rawSpm));

    // EMA 80% anterior + 20% novo (suavização forte para GPS)
    const alpha = spmEmaRef.current === 0 ? 1.0 : 0.2;
    const smoothed = Math.round(spmEmaRef.current * (1 - alpha) + clampedSpm * alpha);
    spmEmaRef.current = smoothed;

    const sessionSteps = strideM > 0 ? Math.round(distanceM / strideM) : 0;

    setData((d) => ({
      ...d,
      stepsPerMinute: smoothed,
      sessionSteps,
    }));
  }, [speedMs, distanceM, strideM]);

  const reset = () => {
    spmEmaRef.current = 0;
    startTimeRef.current = null;
    runningRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setData({ stepsPerMinute: 0, sessionSteps: 0, elapsedSeconds: 0 });
  };

  // Limpa o timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { data, reset };
}
