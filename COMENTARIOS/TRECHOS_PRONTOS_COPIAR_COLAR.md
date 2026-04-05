═══════════════════════════════════════════════════════════════════════════════
📋 TRECHOS PRONTOS PARA COPIAR/COLAR - App.tsx
═══════════════════════════════════════════════════════════════════════════════

Todos os trechos aqui estão prontos para COPIAR E COLAR sem qualquer modificação.

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 1: IMPORTS (adicionar no topo do App.tsx)
═══════════════════════════════════════════════════════════════════════════════

import { useRunningPlugin } from './hooks/useRunningPlugin';
import { RunningMap, RouteStats } from './components/RunningMap';

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 2: HOOK (dentro de function App())
═══════════════════════════════════════════════════════════════════════════════

const gpsRunning = useRunningPlugin();

(Adicione logo abaixo de: const stepCounter = useStepCounter();)

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 3: MODIFICAR handleStart
═══════════════════════════════════════════════════════════════════════════════

const handleStart = async () => {
  try {
    setIsRunning(true);
    
    await stepCounter.start();
    await gpsRunning.start();
    
    cadenceTracker.reset();
  } catch (err) {
    alert(`Erro ao iniciar: ${err}`);
    setIsRunning(false);
  }
};

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 4: MODIFICAR handleStop
═══════════════════════════════════════════════════════════════════════════════

const handleStop = async () => {
  setIsRunning(false);
  
  await stepCounter.stop();
  await gpsRunning.stop();
  
  musicEngine.stop();
};

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 5: MODIFICAR useEffect (o que tem "sensorStatus")
═══════════════════════════════════════════════════════════════════════════════

useEffect(() => {
  let interval: ReturnType<typeof setInterval> | null = null;

  if (stepCounter.data.sensorStatus === 'active') {
    const realDistance = Math.max(gpsRunning.state.distance, 0.001);
    const strideM = (realDistance / Math.max(1, stepCounter.data.sessionSteps)) || 0.7;

    interval = setInterval(() => {
      const currentSPM = stepCounter.data.stepsPerMinute;
      const paceMinKm = cadenceTracker.data.currentPaceMinKm;

      musicEngine.tick(currentSPM, strideM, paceMinKm);
    }, 500);
  }

  return () => {
    if (interval) clearInterval(interval);
  };
}, [
  stepCounter.data.sensorStatus,
  stepCounter.data.stepsPerMinute,
  stepCounter.data.sessionSteps,
  gpsRunning.state.distance,
  cadenceTracker.data.currentPaceMinKm,
]);

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 6: TOPBAR (no JSX - modificar)
═══════════════════════════════════════════════════════════════════════════════

<div className="topbar">
  <div className="brand">
    <div className="brand-icon">🏃</div>
    <div>
      <h1>RunCadence</h1>
      <p>Sync + Cadência</p>
    </div>
  </div>
  <div
    className={`gps-pill ${gpsRunning.state.isTracking ? 'gps-on' : 'gps-off'}`}
  >
    <div className="gps-dot"></div>
    {gpsRunning.state.isTracking ? 'GPS ON' : 'GPS OFF'}
  </div>
</div>

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 7: HERO-CARD (no JSX - modificar)
═══════════════════════════════════════════════════════════════════════════════

<div className="hero-card">
  <div className="hero-top">
    <div>
      <div className="eyebrow">Distância GPS</div>
      <div className="hero-pace">
        {(gpsRunning.state.distance / 1000).toFixed(2)}
      </div>
      <div className="hero-unit">km</div>
    </div>
    <div className="hero-target">
      <div
        className="target-ring"
        style={{
          animation: gpsRunning.state.isTracking ? 'pulse 2s infinite' : 'none',
        }}
      />
    </div>
  </div>
</div>

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 8: MAPA + STATS (no JSX - adicionar após hero-card)
═══════════════════════════════════════════════════════════════════════════════

{/* MAPA */}
<RunningMap
  route={gpsRunning.state.route}
  isTracking={gpsRunning.state.isTracking}
  distance={gpsRunning.state.distance}
/>

{/* ESTATÍSTICAS */}
<RouteStats
  distance={gpsRunning.state.distance}
  pointCount={gpsRunning.state.pointCount}
  accuracy={gpsRunning.state.lastPoint?.accuracy || 0}
/>

═══════════════════════════════════════════════════════════════════════════════
# TRECHO 9: App.css (adicionar no final)
═══════════════════════════════════════════════════════════════════════════════

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

═══════════════════════════════════════════════════════════════════════════════

Total: 9 trechos

Copie cada um exatamente como está aqui e coque no lugar certo.

Sem modificações. Sem gambiarra.

═══════════════════════════════════════════════════════════════════════════════
