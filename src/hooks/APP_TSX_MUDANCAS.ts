// ═══════════════════════════════════════════════════════════════════════════════
// MUDANÇAS EXATAS EM App.tsx
// ═══════════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────────
// 1. ADICIONAR IMPORTS NO TOPO DO ARQUIVO
// ───────────────────────────────────────────────────────────────────────────────

import { useRunningPlugin } from './hooks/useRunningPlugin';
import { RunningMap, RouteStats } from './components/RunningMap';

// ───────────────────────────────────────────────────────────────────────────────
// 2. DENTRO DE function App() { }, PROCURAR POR:
//    const stepCounter = useStepCounter();
//    E ADICIONAR LOGO ABAIXO:
// ───────────────────────────────────────────────────────────────────────────────

const stepCounter = useStepCounter();
const cadenceTracker = useCadence();
const musicEngine = useMusicEngine();
const gpsRunning = useRunningPlugin();  // ← NOVA LINHA

// ───────────────────────────────────────────────────────────────────────────────
// 3. PROCURAR POR: const handleStart = async () => {
//    E MODIFICAR PARA:
// ───────────────────────────────────────────────────────────────────────────────

const handleStart = async () => {
  try {
    setIsRunning(true);
    
    await stepCounter.start();
    await gpsRunning.start();  // ← NOVA LINHA: Iniciar GPS real
    
    cadenceTracker.reset();
  } catch (err) {
    alert(`Erro ao iniciar: ${err}`);
    setIsRunning(false);
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// 4. PROCURAR POR: const handleStop = () => {
//    E MODIFICAR PARA:
// ───────────────────────────────────────────────────────────────────────────────

const handleStop = async () => {
  setIsRunning(false);
  
  await stepCounter.stop();
  await gpsRunning.stop();  // ← NOVA LINHA: Parar GPS
  
  musicEngine.stop();
};

// ───────────────────────────────────────────────────────────────────────────────
// 5. PROCURAR POR: useEffect(() => {
//    QUE CONTÉM: if (stepCounter.data.sensorStatus === 'active') {
//    E MODIFICAR PARA:
// ───────────────────────────────────────────────────────────────────────────────

useEffect(() => {
  let interval: ReturnType<typeof setInterval> | null = null;

  if (stepCounter.data.sensorStatus === 'active') {
    // ← NOVO: Usar distância real do GPS
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
  gpsRunning.state.distance,  // ← NOVA LINHA: Dependency
  cadenceTracker.data.currentPaceMinKm,
]);

// ───────────────────────────────────────────────────────────────────────────────
// 6. NO JSX DENTRO DE <div className="app-screen">
//    PROCURAR POR: <div className="topbar">
//    E MODIFICAR PARA:
// ───────────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────────
// 7. NO JSX, PROCURAR POR: <div className="hero-card">
//    E MODIFICAR A SEÇÃO HERO PARA:
// ───────────────────────────────────────────────────────────────────────────────

<div className="hero-card">
  <div className="hero-top">
    <div>
      <div className="eyebrow">Distância GPS (Haversine)</div>
      <div className="hero-pace">
        {(gpsRunning.state.distance / 1000).toFixed(2)}
      </div>
      <div className="hero-unit">km</div>
    </div>
    <div className="hero-target">
      <div
        className="target-ring"
        style={{
          animation: gpsRunning.state.isTracking
            ? 'pulse 2s infinite'
            : 'none',
        }}
      />
    </div>
  </div>
</div>

// ───────────────────────────────────────────────────────────────────────────────
// 8. LOGO APÓS </div> DO HERO-CARD, ADICIONAR:
// ───────────────────────────────────────────────────────────────────────────────

{/* MAPA INTERATIVO */}
<RunningMap
  route={gpsRunning.state.route}
  isTracking={gpsRunning.state.isTracking}
  distance={gpsRunning.state.distance}
/>

{/* ESTATÍSTICAS DA ROTA */}
<RouteStats
  distance={gpsRunning.state.distance}
  pointCount={gpsRunning.state.pointCount}
  accuracy={gpsRunning.state.lastPoint?.accuracy || 0}
/>

// ───────────────────────────────────────────────────────────────────────────────
// 9. NO App.css, ADICIONAR NO FINAL:
// ───────────────────────────────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// FIM DAS MUDANÇAS
// ═══════════════════════════════════════════════════════════════════════════════
