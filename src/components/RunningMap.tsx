import React, { useEffect, useRef } from 'react';
import type { GPSPoint } from './useRunningPlugin';

interface MapProps {
  route: GPSPoint[];
  isTracking: boolean;
  distance: number;
}

// ───────────────────────────────────────────────────────────────────────────
// COMPONENTE: RunningMap
// ───────────────────────────────────────────────────────────────────────────
// Usa Leaflet para mostrar mapa em tempo real com rota atual

export const RunningMap: React.FC<MapProps> = ({ route, isTracking, distance }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Inicializar Leaflet
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    // Carregar Leaflet via CDN
    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = () => {
        initMap();
      };
      document.body.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      const L = (window as any).L;

      // ───── Centro padrão (seu app está em Pernambuco, BR)
      const defaultCenter = [-8.7639, -40.5084]; // Petrolina

      mapRef.current = L.map(containerRef.current).setView(defaultCenter, 16);

      // Tile layer OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Atualizar rota no mapa
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || route.length === 0) return;

    const L = (window as any).L;

    // Remover polyline anterior
    if (polylineRef.current) {
      mapRef.current.removeLayer(polylineRef.current);
    }

    // Criar nova polyline
    const coords = route.map((p) => [p.lat, p.lng]);
    polylineRef.current = L.polyline(coords, {
      color: '#00e676',
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1.0,
    }).addTo(mapRef.current);

    // Centralizar no último ponto
    const lastPoint = route[route.length - 1];
    mapRef.current.panTo([lastPoint.lat, lastPoint.lng]);
  }, [route]);

  // ───────────────────────────────────────────────────────────────────────────
  // Atualizar marcador final
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || route.length === 0) return;

    const L = (window as any).L;
    const lastPoint = route[route.length - 1];

    // Remover marcador anterior
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    // Criar novo marcador (círculo pulsando)
    markerRef.current = L.circleMarker([lastPoint.lat, lastPoint.lng], {
      radius: 8,
      fillColor: isTracking ? '#00e676' : '#ff6b35',
      color: '#000',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(mapRef.current);
  }, [route, isTracking]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '320px',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(0, 230, 118, 0.2)',
        marginBottom: '16px',
      }}
    >
      {route.length === 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: 'var(--card)',
            color: 'var(--muted)',
            fontSize: '14px',
          }}
        >
          Mapa aparecerá aqui (GPS ativo)
        </div>
      )}
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// COMPONENTE: RouteStats
// ───────────────────────────────────────────────────────────────────────────
// Mostra estatísticas da rota

interface RouteStatsProps {
  distance: number; // metros
  pointCount: number;
  accuracy: number;
}

export const RouteStats: React.FC<RouteStatsProps> = ({
  distance,
  pointCount,
  accuracy,
}) => {
  const distanceKm = (distance / 1000).toFixed(2);
  const accuracyM = Math.round(accuracy);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
            Distância (Haversine)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--green)' }}>
            {distanceKm} km
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
            Precisão GPS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--blue)' }}>
            ±{accuracyM}m
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
            Pontos Registrados
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--yellow)' }}>
            {pointCount} pontos
          </div>
        </div>
      </div>
    </div>
  );
};
