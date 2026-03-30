// Substitui useStepCounter.ts completamente.
// Não usa nenhum sensor nativo — calcula cadência e passos pela fórmula:
//
//   cadência (spm) = velocidade (m/min) / passada (m)
//   passos sessão  = distância (m) / passada (m)
//
// Vantagem: funciona em qualquer celular, sem permissão, sem crash.

import { useState, useRef, useCallback, useEffect } from 'react';

export interface CadenceData {
  stepsPerMinute: number;   // cadência calculada
  sessionSteps: number;     // passos estimados na sessão
  elapsedSeconds: number;   // tempo desde que os dados começaram
}

export function useCadence(speedMs: number, distanceM: number, strideM: number) {
  const [data, setData] = useState<CadenceData>({
    stepsPerMinute: 0,
    sessionSteps: 0,
    elapsedSeconds: 0,
  });

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  // Inicia o timer de elapsed quando recebe o primeiro dado de GPS
  useEffect(() => {
    if (speedMs > 0 && !activeRef.current) {
      activeRef.current = true;
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1_000);
        setData((d) => ({ ...d, elapsedSeconds: elapsed }));
      }, 1_000);
    }
  }, [speedMs]);

  // Recalcula cadência e passos sempre que velocidade, distância ou passada mudam
  useEffect(() => {
    const safeStride = strideM > 0 ? strideM : 1.12;

    // cadência = velocidade em m/min dividido pela passada
    const speedMmin = speedMs * 60;
    const spm = speedMmin > 0 ? Math.round(speedMmin / safeStride) : 0;

    // passos estimados = distância total / passada
    const sessionSteps = distanceM > 0 ? Math.round(distanceM / safeStride) : 0;

    setData((d) => ({ ...d, stepsPerMinute: spm, sessionSteps }));
  }, [speedMs, distanceM, strideM]);

  const reset = useCallback(() => {
    activeRef.current = false;
    startTimeRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setData({ stepsPerMinute: 0, sessionSteps: 0, elapsedSeconds: 0 });
  }, []);

  return { data, reset };
}
