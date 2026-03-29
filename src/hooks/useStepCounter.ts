import { useState, useRef, useCallback } from 'react';
import { CapacitorPedometer } from '@capgo/capacitor-pedometer';
import type { PluginListenerHandle } from '@capacitor/core';

export function useStepCounter() {
  const [data, setData] = useState({
    sensorStatus: 'idle',
    totalSteps: 0,
    sessionSteps: 0,
    stepsPerMinute: 0,
    elapsedSeconds: 0,
    error: null as string | null,
  });

  const baseRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const historyRef = useRef<{ t: number; steps: number }[]>([]);
  const spmRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenerRef = useRef<PluginListenerHandle | null>(null);
  const runningRef = useRef(false);

  const calcSPM = useCallback((steps: number) => {
    const now = Date.now();
    historyRef.current.push({ t: now, steps });

    const cutoff = now - 10000;
    historyRef.current = historyRef.current.filter(p => p.t > cutoff);

    if (historyRef.current.length < 2) return spmRef.current;

    const first = historyRef.current[0];
    const last = historyRef.current[historyRef.current.length - 1];

    const deltaSteps = last.steps - first.steps;
    const deltaTime = (last.t - first.t) / 60000;

    if (deltaTime <= 0) return spmRef.current;

    const spm = Math.max(0, Math.round(deltaSteps / deltaTime));
    spmRef.current = spm;
    return spm;
  }, []);

  const start = useCallback(async () => {
    try {
      if (runningRef.current) {
        return;
      }

      setData(d => ({
        ...d,
        sensorStatus: 'starting',
        error: null,
      }));

      const perm = await CapacitorPedometer.requestPermissions();

      if (perm.activityRecognition !== 'granted') {
        setData(d => ({
          ...d,
          sensorStatus: 'idle',
          error: 'Permissão de atividade física negada',
        }));
        return;
      }

      baseRef.current = null;
      historyRef.current = [];
      spmRef.current = 0;

      if (listenerRef.current) {
        await listenerRef.current.remove();
        listenerRef.current = null;
      }

      listenerRef.current = await CapacitorPedometer.addListener(
        'measurement',
        (e: any) => {
          const total = e?.numberOfSteps ?? 0;

          if (baseRef.current === null) {
            baseRef.current = total;
          }

          const sessionSteps = Math.max(0, total - baseRef.current);
          const spm = calcSPM(total);

          setData(d => ({
            ...d,
            sensorStatus: 'active',
            totalSteps: total,
            sessionSteps,
            stepsPerMinute: spm,
            error: null,
          }));
        }
      );

      await CapacitorPedometer.startMeasurementUpdates();

      startTimeRef.current = Date.now();
      runningRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setData(d => ({ ...d, elapsedSeconds: elapsed }));
      }, 1000);
    } catch (err: any) {
      setData(d => ({
        ...d,
        sensorStatus: 'idle',
        error: err?.message ?? 'Erro ao iniciar pedômetro',
      }));
    }
  }, [calcSPM]);

  const stop = useCallback(async () => {
    try {
      await CapacitorPedometer.stopMeasurementUpdates();

      if (listenerRef.current) {
        await listenerRef.current.remove();
        listenerRef.current = null;
      }
    } catch {
    } finally {
      runningRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setData(d => ({
        ...d,
        sensorStatus: 'idle',
      }));
    }
  }, []);

  const resetSession = useCallback(() => {
    baseRef.current = null;
    historyRef.current = [];
    spmRef.current = 0;
    startTimeRef.current = 0;

    setData(d => ({
      ...d,
      sessionSteps: 0,
      stepsPerMinute: 0,
      elapsedSeconds: 0,
      error: null,
    }));
  }, []);

  return { data, start, stop, resetSession };
}