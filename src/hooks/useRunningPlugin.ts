import { useCallback, useEffect, useRef, useState } from 'react';
import { Plugins } from '@capacitor/core';

const { RunningPlugin } = Plugins;

export interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number;
  bearing?: number;
  speed?: number;
  timestamp?: number;
}

export interface RunningState {
  isTracking: boolean;
  distance: number; // metros
  route: GPSPoint[];
  lastPoint: GPSPoint | null;
  error: string | null;
  pointCount: number;
}

// ───────────────────────────────────────────────────────────────────────────
// HOOK: useRunningPlugin
// ───────────────────────────────────────────────────────────────────────────
// Gerencia GPS real, rota completa e cálculo de distância via Haversine

export function useRunningPlugin() {
  const [state, setState] = useState<RunningState>({
    isTracking: false,
    distance: 0,
    route: [],
    lastPoint: null,
    error: null,
    pointCount: 0,
  });

  const listenerRef = useRef<any>(null);
  const distanceRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // 1. REGISTRAR LISTENER PARA ATUALIZAÇÕES EM TEMPO REAL
  // ───────────────────────────────────────────────────────────────────────────

  const registerListener = useCallback(async () => {
    try {
      if (listenerRef.current) {
        await listenerRef.current.remove();
      }

      listenerRef.current = await RunningPlugin?.addListener?.(
        'location_update',
        (event: any) => {
          const newPoint: GPSPoint = {
            lat: event.lat,
            lng: event.lng,
            accuracy: event.accuracy,
            altitude: event.altitude,
            bearing: event.bearing,
            speed: event.speed,
            timestamp: event.timestamp,
          };

          setState((prev) => ({
            ...prev,
            lastPoint: newPoint,
            route: [...prev.route, newPoint],
            pointCount: prev.pointCount + 1,
          }));
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, error: `Erro ao registrar listener: ${msg}` }));
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ATUALIZAR DISTÂNCIA PERIODICAMENTE (a cada 2 segundos)
  // ───────────────────────────────────────────────────────────────────────────

  const updateDistance = useCallback(async () => {
    try {
      const result = await RunningPlugin?.getDistance?.();
      if (result) {
        setState((prev) => ({
          ...prev,
          distance: result.distance || 0,
        }));
      }
    } catch (err) {
      // Silencioso - apenas continua
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. INICIAR RASTREAMENTO
  // ───────────────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null, route: [], pointCount: 0 }));

      // Limpar intervalo anterior
      if (distanceRefreshIntervalRef.current) {
        clearInterval(distanceRefreshIntervalRef.current);
      }

      // Registrar listener
      await registerListener();

      // Iniciar plugin Android
      await RunningPlugin?.startTracking?.();

      // Atualizar distância a cada 2 segundos
      distanceRefreshIntervalRef.current = setInterval(() => {
        updateDistance();
      }, 2000);

      setState((prev) => ({ ...prev, isTracking: true }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, error: msg, isTracking: false }));
    }
  }, [registerListener, updateDistance]);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PARAR RASTREAMENTO
  // ───────────────────────────────────────────────────────────────────────────

  const stop = useCallback(async () => {
    try {
      // Parar plugin
      await RunningPlugin?.stopTracking?.();

      // Remover listener
      if (listenerRef.current) {
        await listenerRef.current.remove();
        listenerRef.current = null;
      }

      // Parar atualização de distância
      if (distanceRefreshIntervalRef.current) {
        clearInterval(distanceRefreshIntervalRef.current);
        distanceRefreshIntervalRef.current = null;
      }

      setState((prev) => ({ ...prev, isTracking: false }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, error: msg }));
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 5. OBTER ROTA COMPLETA
  // ───────────────────────────────────────────────────────────────────────────

  const getRoute = useCallback(async () => {
    try {
      const result = await RunningPlugin?.getRoute?.();
      return result?.route || [];
    } catch (err) {
      console.error('Erro ao obter rota:', err);
      return [];
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 6. CLEANUP AO DESMONTAR
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (state.isTracking) {
        stop();
      }
      if (listenerRef.current) {
        listenerRef.current.remove();
      }
      if (distanceRefreshIntervalRef.current) {
        clearInterval(distanceRefreshIntervalRef.current);
      }
    };
  }, []);

  return {
    state,
    start,
    stop,
    getRoute,
  };
}
