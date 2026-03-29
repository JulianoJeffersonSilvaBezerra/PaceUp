import { useState, useRef, useCallback } from 'react';
import { Geolocation, type Position } from '@capacitor/geolocation';

type Point = {
  lat: number;
  lon: number;
};

function haversine(a: Point, b: Point) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;

  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatPace(p: number) {
  if (!p || !Number.isFinite(p)) return '--';

  let m = Math.floor(p);
  let s = Math.round((p - m) * 60);

  if (s === 60) {
    m += 1;
    s = 0;
  }

  return `${m}:${String(s).padStart(2, '0')}`;
}

export function useGPS() {
  const [data, setData] = useState({
    status: 'idle',
    smoothedDistance: 0,
    averagePace: 0,
    speedMs: 0,
    accuracy: 0,
    error: null as string | null,
  });

  const lastRef = useRef<Point | null>(null);
  const distRef = useRef(0);
  const startTimeRef = useRef(0);
  const watchIdRef = useRef<string | null>(null);

  const start = useCallback(async () => {
    try {
      if (watchIdRef.current) return;

      const perm = await Geolocation.requestPermissions();

      if (
        perm.location !== 'granted' &&
        perm.coarseLocation !== 'granted'
      ) {
        setData((d) => ({
          ...d,
          status: 'idle',
          error: 'Permissão de localização negada',
        }));
        return;
      }

      setData((d) => ({
        ...d,
        status: 'starting',
        error: null,
      }));

      startTimeRef.current = Date.now();
      distRef.current = 0;
      lastRef.current = null;

      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (pos: Position | null, err) => {
          if (err) {
            setData((d) => ({
              ...d,
              status: 'idle',
              error: err.message ?? 'Erro ao obter GPS',
            }));
            return;
          }

          if (!pos?.coords) return;

          const coords: Point = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };

          if (lastRef.current) {
            const d = haversine(lastRef.current, coords);

            if (d > 0 && d < 100) {
              distRef.current += d;
            }
          }

          const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
          const speed = elapsedSeconds > 0 ? distRef.current / elapsedSeconds : 0;
          const pace = speed > 0 ? 1000 / (speed * 60) : 0;

          setData({
            status: 'active',
            smoothedDistance: Math.round(distRef.current),
            averagePace: pace,
            speedMs: speed,
            accuracy: pos.coords.accuracy ?? 0,
            error: null,
          });

          lastRef.current = coords;
        }
      );

      watchIdRef.current = watchId;
    } catch (err: any) {
      setData((d) => ({
        ...d,
        status: 'idle',
        error: err?.message ?? 'Erro ao iniciar GPS',
      }));
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      if (watchIdRef.current) {
        await Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
    } catch {
    } finally {
      setData((d) => ({
        ...d,
        status: 'idle',
      }));
    }
  }, []);

  const resetSession = useCallback(() => {
    distRef.current = 0;
    lastRef.current = null;
    startTimeRef.current = 0;

    setData((d) => ({
      ...d,
      smoothedDistance: 0,
      averagePace: 0,
      speedMs: 0,
      accuracy: 0,
      error: null,
      status: 'idle',
    }));
  }, []);

  return { data, start, stop, resetSession };
}