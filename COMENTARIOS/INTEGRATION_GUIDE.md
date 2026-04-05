// ───────────────────────────────────────────────────────────────────────────
// INTEGRAÇÃO NO APP.tsx
// ───────────────────────────────────────────────────────────────────────────
//
// 1. IMPORTAÇÕES NO TOPO:
// ───────────────────────────────────────────────────────────────────────────

import { useRunningPlugin } from './hooks/useRunningPlugin';
import { RunningMap, RouteStats } from './components/RunningMap';

// ───────────────────────────────────────────────────────────────────────────
// 2. NO COMPONENTE App():
// ───────────────────────────────────────────────────────────────────────────

// Dentro do useState inicial:
const gpsRunning = useRunningPlugin();

// Depois dos outros hooks...

// ───────────────────────────────────────────────────────────────────────────
// 3. MODIFICAR O USEEFFECT PRINCIPAL:
// ───────────────────────────────────────────────────────────────────────────

useEffect(() => {
  let interval: ReturnType<typeof setInterval> | null = null;

  if (stepCounter.data.sensorStatus === 'active') {
    // Usar o GPS real (lat/lng) para calcular cadência
    const realDistance = gpsRunning.state.distance;
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
  gpsRunning.state.distance, // ← NOVO
  cadenceTracker.data.currentPaceMinKm,
]);

// ───────────────────────────────────────────────────────────────────────────
// 4. MODIFICAR O BOTÃO DE START:
// ───────────────────────────────────────────────────────────────────────────

const handleStart = async () => {
  try {
    setIsRunning(true);
    
    // Iniciar sensor de passos (pedômetro)
    await stepCounter.start();
    
    // ← NOVO: Iniciar GPS com plugin Running
    await gpsRunning.start();
    
    // Resync cadência
    cadenceTracker.reset();
  } catch (err) {
    alert(`Erro ao iniciar: ${err}`);
    setIsRunning(false);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 5. MODIFICAR O BOTÃO DE STOP:
// ───────────────────────────────────────────────────────────────────────────

const handleStop = async () => {
  setIsRunning(false);
  
  // Parar sensor de passos
  await stepCounter.stop();
  
  // ← NOVO: Parar GPS
  await gpsRunning.stop();
  
  // Parar música
  musicEngine.stop();
};

// ───────────────────────────────────────────────────────────────────────────
// 6. ADICIONAR O MAPA NO JSX (logo após hero-card):
// ───────────────────────────────────────────────────────────────────────────

<div className="app-screen">
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

  {/* HERO CARD COM DISTÂNCIA GPS */}
  <div className="hero-card">
    <div className="hero-top">
      <div>
        <div className="eyebrow">Distância GPS</div>
        <div className="hero-pace">{(gpsRunning.state.distance / 1000).toFixed(2)}</div>
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

  {/* MAPA EM TEMPO REAL */}
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

  {/* RESTO DO SEU CÓDIGO */}
  {/* ... */}
</div>

// ───────────────────────────────────────────────────────────────────────────
// 7. ADICIONAR KEYFRAME NO App.css:
// ───────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────
// 8. ADICIONAR PERMISSÕES NO AndroidManifest.xml:
// ───────────────────────────────────────────────────────────────────────────

<!-- Em android/app/src/main/AndroidManifest.xml, dentro de <manifest> -->

<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- Dentro de <application> -->
<service
  android:name="com.runcadence.app.RunningService"
  android:foregroundServiceType="location"
  android:enabled="true"
  android:exported="false" />

// ───────────────────────────────────────────────────────────────────────────
// CHECKLIST FINAL:
// ───────────────────────────────────────────────────────────────────────────

✅ Copiar RunningPlugin.kt para android/app/src/main/java/com/runcadence/app/
✅ Copiar RunningService.kt para android/app/src/main/java/com/runcadence/app/
✅ Copiar useRunningPlugin.ts para src/hooks/
✅ Copiar RunningMap.tsx para src/components/
✅ Adicionar AndroidManifest.xml permissões
✅ Adicionar build.gradle dependência: com.google.android.gms:play-services-location:21.0.1
✅ Atualizar App.tsx com imports e integração

// ───────────────────────────────────────────────────────────────────────────
// BUILD E DEPLOY:
// ───────────────────────────────────────────────────────────────────────────

npm run build
npx cap sync android
npx cap open android

// Build no Android Studio:
// Build → Build Bundle(s) / APK(s) → Build APK(s)
