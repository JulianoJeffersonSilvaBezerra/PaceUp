// ──────────────────────────────────────────────────────────────────────────────
// Caminho: src/hooks/useGPS.ts
// Substitui o arquivo anterior INTEIRO por este.
// Adiciona: lat, lng, routePoints (array do trajeto completo)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { registerPlugin } from '@capacitor/core';

// ── Interface do plugin nativo ─────────────────────────────────────────────────
interface RunningPluginInterface {
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  addListener(
    event: 'gpsUpdate',
    handler: (data: GPSUpdate) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export interface GPSUpdate {
  distance:       number;
  speedMs:        number;
  accuracy:       number;
  elapsedSeconds: number;
  averagePace:    number;
  lat:            number;
  lng:            number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

const RunningPlugin = registerPlugin<RunningPluginInterface>('RunningPlugin');

// ── Helpers ────────────────────────────────────────────────────────────────────
export function formatPace(p: number): string {
  if (!p || !Number.isFinite(p) || p <= 0 || p > 30) return '--:--';
  let m = Math.floor(p);
  let s = Math.round((p - m) * 60);
  if (s === 60) { m += 1; s = 0; }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Hook principal ─────────────────────────────────────────────────────────────
export function useGPS() {
  const [data, setData] = useState({
    status:           'idle' as 'idle' | 'starting' | 'active' | 'error',
    smoothedDistance: 0,
    averagePace:      0,
    speedMs:          0,
    accuracy:         0,
    elapsedSeconds:   0,
    lat:              0,
    lng:              0,
    routePoints:      [] as RoutePoint[],
    error:            null as string | null,
  });

  const listenerRef   = useRef<{ remove: () => Promise<void> } | null>(null);
  const routeRef      = useRef<RoutePoint[]>([]);

  const start = useCallback(async () => {
    try {
      setData((d) => ({ ...d, status: 'starting', error: null }));
      routeRef.current = [];

      listenerRef.current = await RunningPlugin.addListener('gpsUpdate', (update) => {
        // Só adiciona ponto ao trajeto se tiver coordenadas válidas
        if (update.lat !== 0 && update.lng !== 0) {
          const newPoint: RoutePoint = {
            lat:       update.lat,
            lng:       update.lng,
            timestamp: Date.now(),
          };

          // Evita pontos duplicados (menos de 3 metros de diferença)
          const last = routeRef.current[routeRef.current.length - 1];
          if (!last || haversineM(last.lat, last.lng, newPoint.lat, newPoint.lng) > 3) {
            routeRef.current = [...routeRef.current, newPoint];
          }
        }

        setData({
          status:           'active',
          smoothedDistance: Math.round(update.distance),
          averagePace:      update.averagePace,
          speedMs:          +update.speedMs.toFixed(2),
          accuracy:         Math.round(update.accuracy),
          elapsedSeconds:   update.elapsedSeconds,
          lat:              update.lat,
          lng:              update.lng,
          routePoints:      routeRef.current,
          error:            null,
        });
      });

      await RunningPlugin.startTracking();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setData((d) => ({ ...d, status: 'error', error: msg }));
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await RunningPlugin.stopTracking();
      await listenerRef.current?.remove();
      listenerRef.current = null;
    } catch {
      // silencioso
    } finally {
      setData((d) => ({ ...d, status: 'idle' }));
    }
  }, []);

  const resetSession = useCallback(() => {
    routeRef.current = [];
    setData((d) => ({
      ...d,
      smoothedDistance: 0,
      averagePace:      0,
      speedMs:          0,
      accuracy:         0,
      elapsedSeconds:   0,
      lat:              0,
      lng:              0,
      routePoints:      [],
      error:            null,
    }));
  }, []);

  return { data, start, stop, resetSession };
}

// ── Haversine: distância em metros entre dois pontos ──────────────────────────
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
