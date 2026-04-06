// src/App.tsx — SUBSTITUI O ARQUIVO ANTERIOR INTEIRO
// Mudanças: nome PaceUp, mapa integrado, editor de BPM, useRunningPlugin removido

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGPS, formatPace } from './hooks/useGPS';
import { useCalibration } from './hooks/useCalibration';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useCadence } from './hooks/useCadence';
import { useWorkoutHistory } from './hooks/useWorkoutHistory';
import { useSpeechCoach } from './hooks/useSpeechCoach';
import { useTiroWorkout } from './hooks/useTiroWorkout';
import { checkSupabaseHealth, isSupabaseConfigured } from './lib/supabase';
import type { WorkoutSession } from './hooks/useWorkoutHistory';
import { GPSMap } from './components/GPSMap';
import type { MusicMode } from './hooks/useMusicEngine';
import './App.css';

export default function App() {
  const buildLabel = __APP_BUILD__.slice(0, 19).replace('T', ' ');
  const gps   = useGPS();
  const cal   = useCalibration();
  const music = useMusicEngine();
  const history = useWorkoutHistory();
  const coach = useSpeechCoach();
  const tiro = useTiroWorkout();
  const [showIntro, setShowIntro] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'desativado' | 'ok' | 'falha'>('desativado');
  const introAutoRef = useRef<number | null>(null);

  const rawStride     = cal.data.strideM * (1 + (gps.data.speedMs - 3) * 0.05);
  const dynamicStride = Math.min(
    cal.data.strideM * 1.12,
    Math.max(cal.data.strideM * 0.88, rawStride)
  );

  const cadence = useCadence(gps.data.speedMs, gps.data.smoothedDistance, dynamicStride);
  const [lastSummary, setLastSummary] = useState<WorkoutSession | null>(null);

  const [targetPaceInput, setTargetPaceInput] = useState('5.30');
  const importHistoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    introAutoRef.current = window.setTimeout(() => {
      setShowIntro(false);
    }, 500);

    return () => {
      if (introAutoRef.current !== null) window.clearTimeout(introAutoRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setBackendStatus('desativado');
      return;
    }

    let mounted = true;
    checkSupabaseHealth()
      .then((ok) => {
        if (!mounted) return;
        setBackendStatus(ok ? 'ok' : 'falha');
      })
      .catch(() => {
        if (!mounted) return;
        setBackendStatus('falha');
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ── BPM manual ──────────────────────────────────────────────────────────────
  const [bpmInput, setBpmInput] = useState('');
  const [bpmManualOverride, setBpmManualOverride] = useState(false);

  useEffect(() => {
    if (music.data.bpm <= 0) return;

    if (music.data.bpmSource === 'detected' && bpmManualOverride) {
      return;
    }

    if (!bpmManualOverride || music.data.bpmSource !== 'detected') {
      setBpmInput(String(music.data.bpm));
    }
  }, [music.data.bpm, music.data.bpmSource, bpmManualOverride]);

  function handleBpmChange(val: string) {
    setBpmInput(val);
    setBpmManualOverride(true);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 60 && n <= 200) {
      music.setManualBPM(n);
    }
  }

  function adjustBpm(delta: number) {
    const current = parseInt(bpmInput || String(music.data.bpm || 120), 10);
    const next    = Math.min(200, Math.max(60, current + delta));
    setBpmInput(String(next));
    setBpmManualOverride(true);
    music.setManualBPM(next);
  }

  function handleTapTempo() {
    setBpmManualOverride(true);
    music.tapTempo();
  }

  function adjustPlaybackRate(delta: number) {
    const next = music.data.playbackRate + delta;
    music.setManualPlaybackRate(next);
  }

  function setPlaybackMode(mode: 'auto' | 'manual') {
    music.setRateControlMode(mode);
  }

  function toggleMetronome() {
    if (music.data.metronomeOn) {
      music.stopMetronome();
      return;
    }

    const target = music.data.mode === 'target_pace'
      ? Math.round(music.data.targetCadence || cadence.data.stepsPerMinute || parseInt(bpmInput || '120', 10))
      : Math.round(parseInt(bpmInput || String(music.data.bpm || 120), 10));

    music.startMetronome(target);
  }

  // ── Refs para o tick de música ───────────────────────────────────────────────
  const tickRef    = useRef(music.tick);
  const spmRef     = useRef(cadence.data.stepsPerMinute);
  const strideRef  = useRef(dynamicStride);
  const modeRef    = useRef(music.data.mode);
  const tpInputRef = useRef(targetPaceInput);
  const confidenceRef = useRef(70);
  const paceRef = useRef(0);

  useEffect(() => { tickRef.current   = music.tick;                   }, [music.tick]);
  useEffect(() => { spmRef.current    = cadence.data.stepsPerMinute;  }, [cadence.data.stepsPerMinute]);
  useEffect(() => { strideRef.current = dynamicStride;                }, [dynamicStride]);
  useEffect(() => { modeRef.current   = music.data.mode;              }, [music.data.mode]);
  useEffect(() => { tpInputRef.current = targetPaceInput;             }, [targetPaceInput]);

  useEffect(() => {
    const id = setInterval(() => {
      const tp = modeRef.current === 'target_pace'
        ? parseFloat(tpInputRef.current) || 0
        : undefined;
      tickRef.current(spmRef.current, strideRef.current, tp, confidenceRef.current, paceRef.current);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // ── Derivados ────────────────────────────────────────────────────────────────
  const gpsActive   = gps.data.status === 'active';
  const gpsPaused   = gps.data.status === 'paused';
  const calRunning  = cal.data.status === 'running';
  const musicPlaying = music.data.status === 'playing';

  const paceBySPM   = cadence.data.stepsPerMinute > 0
    ? 1000 / (cadence.data.stepsPerMinute * dynamicStride)
    : 0;

  const paceError   = gps.data.averagePace > 0 && paceBySPM > 0
    ? Math.abs(gps.data.averagePace - paceBySPM)
    : 0;

  const paceErrorLabel = paceError === 0 ? '--'
    : paceError < 0.2   ? 'Perfeito'
    : paceError < 0.4   ? 'Aceitavel'
    : 'Verificar';

  const targetPaceNumber = parseFloat(targetPaceInput) || 0;
  const heroPace         = gps.data.averagePace > 0 ? gps.data.averagePace : 0;
  const heroPaceText     = heroPace > 0 ? formatPace(heroPace) : '--:--';
  const musicTempoBpm    = music.data.bpm > 0 ? music.data.bpm * music.data.playbackRate : 0;
  const musicEstimatedPace = musicTempoBpm > 0
    ? 1000 / (musicTempoBpm * dynamicStride)
    : 0;

  useEffect(() => {
    tiro.setReferencePaceMinKm(targetPaceNumber || 5);
  }, [targetPaceNumber, tiro]);

  useEffect(() => {
    tiro.updateTelemetry({
      currentDistanceM: gps.data.smoothedDistance,
      currentPaceMinKm: gps.data.instantPace > 0 ? gps.data.instantPace : gps.data.averagePace,
      currentElapsedSeconds: gps.data.elapsedSeconds,
    });
  }, [
    gps.data.smoothedDistance,
    gps.data.instantPace,
    gps.data.averagePace,
    gps.data.elapsedSeconds,
    tiro,
  ]);

  useEffect(() => {
    if (!tiro.sessionSummary) return;

    const summary: WorkoutSession = {
      id: `tiro-${Date.now()}`,
      startedAt: new Date(Date.now() - tiro.sessionSummary.totalElapsedSeconds * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      distanceM: tiro.sessionSummary.totalDistanceM,
      elapsedSeconds: tiro.sessionSummary.totalElapsedSeconds,
      averagePace: tiro.sessionSummary.averageTiroPace,
      routePoints: [...gps.data.routePoints],
      musicFileName: music.data.fileName,
      musicMode: music.data.mode,
      workoutType: 'tiro',
      tiroBlocksCompleted: tiro.sessionSummary.blocksCompleted,
      tiroRepeatBlocksCompleted: tiro.sessionSummary.repeatBlocksCompleted,
      tiroAveragePace: tiro.sessionSummary.averageTiroPace,
      tiroTemplateName: tiro.sessionSummary.templateName,
    };

    history.appendSession({
      startedAt: summary.startedAt,
      distanceM: summary.distanceM,
      elapsedSeconds: summary.elapsedSeconds,
      averagePace: summary.averagePace,
      routePoints: summary.routePoints,
      musicFileName: summary.musicFileName,
      musicMode: summary.musicMode,
      workoutType: summary.workoutType,
      tiroBlocksCompleted: summary.tiroBlocksCompleted,
      tiroRepeatBlocksCompleted: summary.tiroRepeatBlocksCompleted,
      tiroAveragePace: summary.tiroAveragePace,
      tiroTemplateName: summary.tiroTemplateName,
    });

    setLastSummary(summary);
    tiro.clearSummary();
  }, [gps.data.routePoints, history, music.data.fileName, music.data.mode, tiro]);

  const paceDiff = useMemo(() => {
    if (!heroPace || !targetPaceNumber) return null;
    return heroPace - targetPaceNumber;
  }, [heroPace, targetPaceNumber]);

  const distanceGapM = Math.max(0, gps.data.rawDistance - gps.data.smoothedDistance);
  const distanceGapPct = gps.data.rawDistance > 0
    ? (distanceGapM / gps.data.rawDistance) * 100
    : 0;

  const goalStatus = useMemo(() => {
    if (paceDiff === null) return 'Sem meta ativa';
    if (Math.abs(paceDiff) <= 0.15) return 'Dentro da meta';
    return paceDiff < 0 ? 'Abaixo da meta' : 'Acima da meta';
  }, [paceDiff]);

  const paceZoneFill = useMemo(() => {
    if (!targetPaceNumber || !heroPace) return 50;
    const fastEdge = Math.max(3, targetPaceNumber - 0.3);
    const slowEdge = Math.min(15, targetPaceNumber + 0.3);
    const pct = ((slowEdge - heroPace) / (slowEdge - fastEdge)) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [heroPace, targetPaceNumber]);

  const recentPaceBars = useMemo(() => {
    const source = history.sessions.slice(0, 6).map((s) => s.averagePace).filter((p) => p > 0);
    if (source.length === 0) return [];

    const min = Math.min(...source);
    const max = Math.max(...source);
    return source.map((pace) => {
      const normalized = max === min ? 0.7 : (max - pace) / (max - min);
      return {
        pace,
        height: 26 + normalized * 36,
        fast: pace <= targetPaceNumber || pace <= 5.3,
      };
    });
  }, [history.sessions, targetPaceNumber]);

  const splitRows = useMemo(() => {
    const source = recentPaceBars.length > 0
      ? recentPaceBars
      : [{ pace: gps.data.averagePace || 0, height: 48, fast: true }];

    const maxHeight = Math.max(...source.map((s) => s.height), 1);
    return source.slice(0, 6).map((item, idx) => ({
      idx: idx + 1,
      pace: item.pace,
      width: Math.max(32, Math.round((item.height / maxHeight) * 100)),
      fast: item.fast,
    }));
  }, [recentPaceBars, gps.data.averagePace]);

  const targetSource = music.data.mode === 'target_pace'
    ? 'Fonte: pace escolhido'
    : 'Fonte: musica como guia';

  const gpsConfidence = useMemo(() => {
    const accuracyScore = gps.data.accuracy <= 8 ? 1
      : gps.data.accuracy <= 16 ? 0.85
      : gps.data.accuracy <= 25 ? 0.65
      : gps.data.accuracy <= 35 ? 0.45
      : 0.2;

    const totalPoints = gps.data.acceptedPoints + gps.data.rejectedPoints;
    const routeScore = totalPoints > 0 ? gps.data.acceptedPoints / totalPoints : 0.6;
    return Math.round((accuracyScore * 0.6 + routeScore * 0.4) * 100);
  }, [gps.data.accuracy, gps.data.acceptedPoints, gps.data.rejectedPoints]);

  const cadenceConfidence = useMemo(() => {
    if (cadence.data.stepsPerMinute <= 0 || gps.data.speedMs <= 0.5) return 25;

    const spm = cadence.data.stepsPerMinute;
    const rangeScore = spm >= 145 && spm <= 190 ? 1 : spm >= 130 && spm <= 205 ? 0.75 : 0.45;
    const movementScore = gps.data.speedMs >= 2.0 ? 1 : gps.data.speedMs >= 1.2 ? 0.75 : 0.5;
    return Math.round((rangeScore * 0.6 + movementScore * 0.4) * 100);
  }, [cadence.data.stepsPerMinute, gps.data.speedMs]);

  const bpmConfidence = useMemo(() => {
    if (!music.data.bpm) return 20;
    if (music.data.bpmSource === 'manual') return 98;
    if (music.data.bpmSource === 'tap') return 92;
    if (music.data.bpmSource === 'detected') return 78;
    return 30;
  }, [music.data.bpm, music.data.bpmSource]);

  const controlConfidence = Math.round((gpsConfidence + cadenceConfidence + bpmConfidence) / 3);

  useEffect(() => {
    confidenceRef.current = controlConfidence;
  }, [controlConfidence]);

  useEffect(() => {
    paceRef.current = gps.data.instantPace || gps.data.averagePace || 0;
  }, [gps.data.instantPace, gps.data.averagePace]);

  useEffect(() => {
    if (!coach.enabled || !gpsActive) return;

    const id = setInterval(() => {
      if (controlConfidence < 45) {
        coach.speak('Sinal fraco agora. Mantenha o ritmo atual por alguns segundos.', { priority: 'normal' });
        return;
      }

      if (music.data.mode === 'target_pace' && paceDiff !== null) {
        if (paceDiff > 0.2) {
          coach.speak('Voce esta acima do pace alvo. Acelere levemente a passada.', { priority: 'high' });
          return;
        }

        if (paceDiff < -0.2) {
          coach.speak('Voce esta abaixo do pace alvo. Pode relaxar um pouco para estabilizar.', { priority: 'normal' });
          return;
        }
      }

      if (cadence.data.stepsPerMinute > 0 && cadence.data.stepsPerMinute < 158) {
        coach.speak('Cadencia baixa. Encurte a passada e aumente a frequencia dos passos.', { priority: 'normal' });
        return;
      }

      if (cadence.data.stepsPerMinute > 188) {
        coach.speak('Cadencia alta. Tente relaxar para manter economia de corrida.', { priority: 'low' });
      }
    }, 15000);

    return () => clearInterval(id);
  }, [
    coach.enabled,
    coach.speak,
    gpsActive,
    controlConfidence,
    music.data.mode,
    paceDiff,
    cadence.data.stepsPerMinute,
  ]);

  const fallbackRoute = lastSummary?.routePoints ?? history.latestSession?.routePoints ?? [];
  const mapRoute = gps.data.routePoints.length > 0 ? gps.data.routePoints : fallbackRoute;
  const fallbackLast = fallbackRoute.length > 0 ? fallbackRoute[fallbackRoute.length - 1] : null;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleStart() {
    if (gpsPaused) {
      await gps.resume();
      return;
    }
    await gps.start();
  }

  async function handlePause() {
    await gps.pause();
    music.pause();
  }

  async function handleStop() {
    const snapshotDistance = gps.data.smoothedDistance;
    const snapshotElapsed = Math.max(gps.data.elapsedSeconds, cadence.data.elapsedSeconds);
    const snapshotPace = snapshotDistance > 0
      ? (gps.data.averagePace > 0 ? gps.data.averagePace : snapshotElapsed > 0 ? (snapshotElapsed / 60) / (snapshotDistance / 1000) : 0)
      : 0;

    const snapshotRoute = [...gps.data.routePoints];

    await gps.stop();

    if (snapshotDistance > 30 && snapshotElapsed > 20 && snapshotRoute.length > 0) {
      const summary: WorkoutSession = {
        id: `summary-${Date.now()}`,
        startedAt: new Date(Date.now() - snapshotElapsed * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        distanceM: snapshotDistance,
        elapsedSeconds: snapshotElapsed,
        averagePace: snapshotPace,
        routePoints: snapshotRoute,
        musicFileName: music.data.fileName,
        musicMode: music.data.mode,
      };

      history.appendSession({
        startedAt: summary.startedAt,
        distanceM: summary.distanceM,
        elapsedSeconds: summary.elapsedSeconds,
        averagePace: summary.averagePace,
        routePoints: summary.routePoints,
        musicFileName: summary.musicFileName,
        musicMode: summary.musicMode,
      });

      setLastSummary(summary);
    }

    music.stop();
    cadence.reset();
  }

  function handleReset() {
    gps.resetSession();
    cadence.reset();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setBpmManualOverride(false);
      setBpmInput('');
      music.loadFile(file);
    }
  }

  useEffect(() => {
    if (!music.data.metronomeOn) return;

    const nextMetronomeBpm = music.data.mode === 'target_pace'
      ? Math.round(music.data.targetCadence || cadence.data.stepsPerMinute || 120)
      : Math.round(parseInt(bpmInput || String(music.data.bpm || 120), 10));

    if (Math.abs(nextMetronomeBpm - music.data.metronomeBpm) >= 2) {
      music.setMetronomeBpm(nextMetronomeBpm);
    }
  }, [
    music.data.metronomeOn,
    music.data.metronomeBpm,
    music.data.targetCadence,
    music.data.mode,
    music.data.bpm,
    music.setMetronomeBpm,
    cadence.data.stepsPerMinute,
    bpmInput,
  ]);

  function exportHistory() {
    const payload = JSON.stringify(history.sessions, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `paceup-historico-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportHistory(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('Arquivo invalido: esperado array de treinos.');
      }

      const imported = history.importSessions(parsed);
      if (imported === 0) {
        throw new Error('Nenhum treino valido foi importado.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao importar historico.';
      window.alert(msg);
    } finally {
      e.target.value = '';
    }
  }

  const error = gps.data.error || cal.data.error || music.data.error;

  const [activePage, setActivePage] = useState<0 | 1 | 2 | 3>(0);
  const touchStartXRef = useRef<number | null>(null);

  function goToPage(index: number) {
    const next = Math.max(0, Math.min(3, index)) as 0 | 1 | 2 | 3;
    setActivePage(next);
  }

  function handleSwipeStart(e: React.TouchEvent<HTMLElement>) {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
  }

  function handleSwipeEnd(e: React.TouchEvent<HTMLElement>) {
    if (touchStartXRef.current === null) return;

    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) < 60) return;
    if (deltaX < 0) goToPage(activePage + 1);
    if (deltaX > 0) goToPage(activePage - 1);
  }

  return (
    <div className="app-shell">
      <div className="app-bg-glow app-bg-glow-1" />
      <div className="app-bg-glow app-bg-glow-2" />

      {showIntro && (
        <section className="intro-overlay" aria-label="Abertura do aplicativo PaceUp">
          <iframe className="intro-frame" src="/logo_intro.html" title="PaceUp intro" />
          <div className="intro-overlay-shade" />
        </section>
      )}

      <main className="app-screen" onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">🏃</div>
            <div>
              <h1>PaceUp</h1>
              <p>corrida com musica no ritmo certo</p>
              <p className="build-info">build {buildLabel}</p>
            </div>
          </div>
          <div className="topbar-right">
            <div className={`gps-pill ${gpsActive ? 'gps-on' : 'gps-off'}`}>
              <span className="gps-dot" />
              {gpsActive ? 'GPS ativo' : gpsPaused ? 'GPS pausado' : 'GPS pronto'}
            </div>
          </div>
        </header>

        {error && <div className="alert-box">⚠️ {error}</div>}

        {gpsPaused && (
          <div className="alert-box">
            ⏸ Sessao pausada restaurada. Toque em Retomar corrida para continuar sem perder progresso.
          </div>
        )}

        <div className="swipe-hint">Deslize para esquerda ou direita para trocar de tela</div>

        {activePage === 3 && lastSummary && (
          <section className="details-card">
            <div className="section-head">
              <h2>Resumo do ultimo treino</h2>
              <span className="mini-badge">
                {new Date(lastSummary.endedAt).toLocaleTimeString('pt-BR')}
              </span>
            </div>

            <div className="details-grid">
              <InfoLine label="Distancia" value={`${(lastSummary.distanceM / 1000).toFixed(2)} km`} />
              <InfoLine label="Tempo" value={formatElapsed(lastSummary.elapsedSeconds)} />
              <InfoLine label="Pace medio" value={formatPace(lastSummary.averagePace)} />
              <InfoLine label="Pontos de rota" value={String(lastSummary.routePoints.length)} />
            </div>

            <div className="calibration-actions">
              <button className="secondary-btn" onClick={() => setLastSummary(null)}>
                Fechar resumo
              </button>
            </div>
          </section>
        )}

        {activePage === 0 && (
          <>
        {/* ── Hero pace ──────────────────────────────────────────────────── */}
        <section className="hero-card">
          <div className="hero-top">
            <div>
              <span className="eyebrow">Pace atual</span>
              <div className="hero-pace">{heroPaceText}</div>
              <div className="hero-unit">min/km</div>
            </div>
            <div className="hero-target">
              <div className="target-ring">
                <div className="target-ring-inner">
                  <strong>
                    {music.data.targetPace > 0
                      ? formatPace(music.data.targetPace)
                      : formatPace(targetPaceNumber)}
                  </strong>
                  <span>alvo</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-diff-row">
            <div className="hero-diff-badge">
              {paceDiff === null
                ? 'Sem comparacao'
                : paceDiff < 0
                ? `▲ ${Math.abs(paceDiff).toFixed(2)} abaixo do alvo`
                : `▼ ${paceDiff.toFixed(2)} acima do alvo`}
            </div>
            <div className="hero-diff-badge">{goalStatus}</div>
            <div className="hero-diff-badge">{targetSource}</div>
          </div>

          <div className="pace-zone-gauge">
            <div className="pace-zone-track">
              <div className="pace-zone-fill" style={{ width: `${paceZoneFill}%` }} />
            </div>
            <div className="pace-zone-labels">
              <span>lento {targetPaceNumber > 0 ? formatPace(targetPaceNumber + 0.3) : '--:--'}</span>
              <span>zona alvo</span>
              <span>{targetPaceNumber > 0 ? formatPace(Math.max(3, targetPaceNumber - 0.3)) : '--:--'} rapido</span>
            </div>
          </div>
        </section>

        {/* ── Metrics ────────────────────────────────────────────────────── */}
        <section className="metrics-grid">
          <MetricCard color="green"  label="Cadencia" value={cadence.data.stepsPerMinute || 0} unit="spm" />
          <MetricCard color="blue"   label="Distancia" value={(gps.data.smoothedDistance / 1000).toFixed(2)} unit="km" />
          <MetricCard color="orange" label="Tempo"     value={formatElapsed(cadence.data.elapsedSeconds)} />
        </section>

        {/* ── MAPA ───────────────────────────────────────────────────────── */}
        <GPSMap
          routePoints={mapRoute}
          currentLat={gps.data.lat || fallbackLast?.lat || 0}
          currentLng={gps.data.lng || fallbackLast?.lng || 0}
          isActive={gpsActive}
        />

        <section className="treino-control-row">
          {!gpsActive && !gpsPaused ? (
            <button className="treino-main-btn" onClick={handleStart}>▶ Iniciar corrida</button>
          ) : gpsActive ? (
            <button className="treino-main-btn" onClick={handlePause}>⏸ Pausar corrida</button>
          ) : (
            <button className="treino-main-btn" onClick={handleStart}>▶ Retomar corrida</button>
          )}
          {gpsActive || gpsPaused ? (
            <button className="treino-side-btn" onClick={handleStop}>■</button>
          ) : (
            <button className="treino-side-btn" onClick={handleReset}>↺</button>
          )}
        </section>
          </>
        )}

        {activePage === 2 && (
          <>
        <section className="tiro-card">
          <div className="section-head">
            <h2>Treino de tiro</h2>
            <span className="mini-badge">garmin style</span>
          </div>

          <div className="tiro-topline">
            <div className="tiro-topline-title">{tiro.activeBlock?.stepType === 'run' ? 'TIRO' : tiro.activeBlock?.name || 'TREINO'}</div>
            <div className="tiro-topline-repeat">{tiro.currentRepeatLabel || 'sequencia'}</div>
          </div>

          <div className="tiro-blocks-mini">
            {tiro.executionBlocks.map((block, index) => (
              <div
                key={`${block.id}-${index}`}
                className={`tiro-block-mini ${index <= tiro.currentIndex ? 'tiro-block-mini-done' : ''} ${block.stepType === 'run' ? 'tiro-block-mini-run' : block.stepType === 'rest' ? 'tiro-block-mini-rest' : block.stepType === 'cooldown' ? 'tiro-block-mini-cooldown' : 'tiro-block-mini-warmup'}`}
              />
            ))}
          </div>

          <div className="tiro-hud-watch-wrap">
            <div className="tiro-hud-watch">
              <svg className="tiro-hud-svg" viewBox="0 0 220 220" fill="none">
                <circle cx="110" cy="110" r="98" stroke="#222432" strokeWidth="8" />
                <circle cx="110" cy="110" r="98" stroke="#ff2a00" strokeWidth="8" strokeDasharray="616" strokeDashoffset="220" strokeLinecap="round" transform="rotate(-90 110 110)" opacity="0.85" />
                <circle cx="110" cy="110" r="82" stroke="#222432" strokeWidth="5" />
                <circle cx="110" cy="110" r="82" stroke="#00e676" strokeWidth="5" strokeDasharray="515" strokeDashoffset="210" strokeLinecap="round" transform="rotate(-90 110 110)" opacity="0.65" />
              </svg>

              <div className="tiro-hud-watch-center">
                <div className="tiro-hud-label">{tiro.activeBlock?.durationType === 'distancia' ? 'Distancia restante' : 'Tempo restante'}</div>
                <div className="tiro-hud-timer">{tiro.activeBlockRemainingText}</div>
                <div className="tiro-hud-pace">{formatPace(gps.data.instantPace || gps.data.averagePace)}</div>
                <div className="tiro-hud-zone">{tiro.activeBlock?.stepType === 'run' ? `${tiro.paceZoneLabel || 'sem zona'} · ${tiro.paceInZone ? 'dentro' : 'fora'}` : 'bloco de suporte'}</div>
              </div>
            </div>
          </div>

          <div className="tiro-summary-grid">
            <div className="tiro-summary">
              <div className="tiro-summary-label">Bloco atual</div>
              <div className="tiro-summary-value">{tiro.activeBlock?.name || '--'}</div>
              <div className="tiro-summary-sub">{tiro.waitingOpen ? 'Bloco open: avance manualmente' : 'Execucao automatica ativa'}</div>
            </div>
            <div className="tiro-summary tiro-summary-red">
              <div className="tiro-summary-label">Pace-alvo</div>
              <div className="tiro-summary-value">{tiro.paceZoneLabel || '--'}</div>
              <div className="tiro-summary-sub">{tiro.running ? 'treino em andamento' : tiro.paused ? 'treino pausado' : 'standby'}</div>
            </div>
          </div>

          <div className="tiro-info-grid">
            <div className="tiro-info-box">
              <div className="tiro-info-val">{tiro.activeBlock?.durationType === 'distancia' ? `${tiro.activeBlock.durationValue}m` : tiro.activeBlockRemainingText}</div>
              <div className="tiro-info-lbl">bloco</div>
            </div>
            <div className="tiro-info-box">
              <div className="tiro-info-val">{tiro.currentRepeatLabel ? tiro.currentRepeatLabel.replace('Tiro ', '') : '--'}</div>
              <div className="tiro-info-lbl">repeticao</div>
            </div>
            <div className="tiro-info-box">
              <div className="tiro-info-val">{tiro.paceZoneLabel || '--'}</div>
              <div className="tiro-info-lbl">pace alvo</div>
            </div>
            <div className="tiro-info-box">
              <div className="tiro-info-val">{(gps.data.smoothedDistance / 1000).toFixed(2)} km</div>
              <div className="tiro-info-lbl">total hoje</div>
            </div>
          </div>

          <div className="tiro-actions">
            {!tiro.running && !tiro.paused ? (
              <button className="tiro-btn tiro-btn-primary" onClick={tiro.startWorkout}>Iniciar tiro</button>
            ) : tiro.running ? (
              <button className="tiro-btn tiro-btn-secondary" onClick={tiro.pauseWorkout}>Pausar tiro</button>
            ) : (
              <button className="tiro-btn tiro-btn-primary" onClick={tiro.resumeWorkout}>Retomar tiro</button>
            )}
            <button className="tiro-btn tiro-btn-secondary" onClick={tiro.nextBlock}>Próximo bloco</button>
            <button className="tiro-btn tiro-btn-secondary" onClick={tiro.resetWorkout}>Resetar</button>
          </div>

          <div className="tiro-ref-box">
            <label htmlFor="tiroPace">Pace base do treino</label>
            <input
              id="tiroPace"
              type="number"
              step="0.05"
              min="3"
              max="15"
              value={targetPaceInput}
              onChange={(e) => setTargetPaceInput(e.target.value)}
            />
            <span>Esse pace ajusta os blocos de distancia e a faixa de alerta.</span>
          </div>

          <div className="tiro-blocks-header">
            <h3>Blocos do treino</h3>
            <button className="secondary-btn" onClick={tiro.addBlock}>Adicionar bloco</button>
          </div>

          <div className="tiro-blocks-list">
            {tiro.blocks.map((block, index) => (
              <div key={block.id} className={`tiro-block ${index === tiro.currentIndex ? 'tiro-block-active' : ''}`}>
                <input
                  type="text"
                  value={block.name}
                  onChange={(e) => tiro.updateBlock(block.id, { name: e.target.value })}
                />
                <select
                  value={block.stepType}
                  onChange={(e) => tiro.updateBlock(block.id, { stepType: e.target.value as 'warmup' | 'run' | 'rest' | 'cooldown' })}
                >
                  <option value="warmup">Aquecimento</option>
                  <option value="run">Tiro</option>
                  <option value="rest">Recuperacao</option>
                  <option value="cooldown">Desaquecimento</option>
                </select>
                <input
                  type="number"
                  min="1"
                  value={block.durationValue}
                  onChange={(e) => tiro.updateBlock(block.id, { durationValue: parseInt(e.target.value, 10) || 0 })}
                />
                <select
                  value={block.durationType}
                  onChange={(e) => tiro.updateBlock(block.id, { durationType: e.target.value as 'tempo' | 'distancia' | 'open' })}
                >
                  <option value="tempo">Tempo</option>
                  <option value="distancia">Distancia</option>
                  <option value="open">Aberto</option>
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={block.repeatCount ?? 1}
                  onChange={(e) => tiro.updateBlock(block.id, { repeatCount: parseInt(e.target.value, 10) || 1 })}
                  disabled={block.stepType !== 'run'}
                  title="Repetições"
                />
                <input
                  type="number"
                  min="1"
                  step="0.05"
                  value={block.targetPaceMin ?? ''}
                  onChange={(e) => tiro.updateBlock(block.id, { targetPaceMin: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="pace min"
                  disabled={block.stepType !== 'run'}
                />
                <input
                  type="number"
                  min="1"
                  step="0.05"
                  value={block.targetPaceMax ?? ''}
                  onChange={(e) => tiro.updateBlock(block.id, { targetPaceMax: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="pace max"
                  disabled={block.stepType !== 'run'}
                />
                <button className="btn-remove" onClick={() => tiro.removeBlock(block.id)}>✖</button>
              </div>
            ))}
          </div>
        </section>
          </>
        )}

        {activePage === 3 && (
          <>
        <section className="details-card data-hero-card">
          <div className="section-head">
            <h2>Resumo pos-treino</h2>
            <span className="mini-badge">strava style</span>
          </div>

          <div className="data-hero-stats">
            <div className="data-hero-stat">
              <div className="data-hero-value">{(gps.data.smoothedDistance / 1000).toFixed(2)}<span> km</span></div>
              <div className="data-hero-label">Distancia</div>
            </div>
            <div className="data-hero-stat">
              <div className="data-hero-value">{formatElapsed(gps.data.elapsedSeconds)}</div>
              <div className="data-hero-label">Tempo</div>
            </div>
            <div className="data-hero-stat">
              <div className="data-hero-value">{formatPace(gps.data.averagePace)}</div>
              <div className="data-hero-label">Pace medio</div>
            </div>
          </div>

          {recentPaceBars.length > 0 && (
            <>
              <div className="data-chart-label">Pace por treino recente</div>
              <div className="data-bars">
                {recentPaceBars.map((bar, idx) => (
                  <div
                    key={`${bar.pace}-${idx}`}
                    className={`data-bar ${bar.fast ? 'data-bar-fast' : 'data-bar-slow'}`}
                    style={{ height: `${bar.height}px` }}
                    title={formatPace(bar.pace)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="data-chart-label" style={{ marginTop: 12 }}>Splits</div>
          <div className="data-splits">
            {splitRows.map((row) => (
              <div key={row.idx} className="data-split-row">
                <div className="data-split-idx">{row.idx}</div>
                <div className="data-split-track">
                  <div className={`data-split-fill ${row.fast ? 'data-split-fast' : 'data-split-slow'}`} style={{ width: `${row.width}%` }} />
                </div>
                <div className="data-split-pace">{row.pace > 0 ? formatPace(row.pace) : '--:--'}</div>
              </div>
            ))}
          </div>

          <div className="data-minimap">
            <svg viewBox="0 0 180 70" fill="none">
              <path d="M12 52 Q34 28 58 39 Q88 52 114 26 Q138 8 160 24" stroke="#00e676" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <circle cx="12" cy="52" r="3.2" fill="#1d9e75" stroke="#fff" strokeWidth="1" />
              <circle cx="160" cy="24" r="3.2" fill="#ff5252" stroke="#fff" strokeWidth="1" />
            </svg>
          </div>
        </section>

        {/* ── Historico recente ───────────────────────────────────────────── */}
        <section className="details-card">
          <div className="section-head">
            <h2>Treinos recentes</h2>
            <span className="mini-badge">{history.sessions.length}</span>
          </div>

          {history.sessions.length === 0 ? (
            <div className="map-placeholder" style={{ height: 90 }}>
              <span>Nenhum treino salvo ainda</span>
            </div>
          ) : (
            <div className="details-grid">
              {history.sessions.slice(0, 3).map((session) => (
                <div key={session.id}>
                  <InfoLine
                    label={new Date(session.endedAt).toLocaleString('pt-BR')}
                    value={`${(session.distanceM / 1000).toFixed(2)} km • ${formatElapsed(session.elapsedSeconds)}`}
                    sub={`Pace medio ${formatPace(session.averagePace)} • ${session.musicFileName || 'sem musica'}`}
                  />
                  <div className="calibration-actions" style={{ paddingTop: 6 }}>
                    <button className="secondary-btn" onClick={() => history.removeSession(session.id)}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {history.sessions.length > 0 && (
            <div className="calibration-actions">
              <button className="secondary-btn" onClick={exportHistory}>Exportar JSON</button>
              <button className="secondary-btn" onClick={() => importHistoryInputRef.current?.click()}>
                Importar JSON
              </button>
              <button className="secondary-btn" onClick={history.clearAll}>Limpar historico</button>
              <input
                ref={importHistoryInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportHistory}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </section>
          </>
        )}

        {activePage === 1 && (
          <>

        {/* ── Musica ─────────────────────────────────────────────────────── */}
        <section className="player-card">
          <div className="section-head">
            <h2>Musica e pace</h2>
            <span className="mini-badge">
              {musicPlaying ? 'tocando' : music.data.hasAudioBuffer ? (music.data.rateControlMode === 'manual' ? 'manual' : 'sugestao') : 'sem musica'}
            </span>
          </div>

          <div className="music-art-hero">
            <div className="music-art-chip">{music.data.bpm || '--'} BPM</div>
            <div className="music-art-icon">🎧</div>
          </div>

          <div className="player-track">
            <div className="track-art">🎵</div>
            <div className="track-meta">
              <div className="track-title">
                {music.data.fileName || 'Nenhuma musica carregada'}
              </div>
              <div className="track-subtitle">
                {music.data.fileName ? 'arquivo carregado para o treino' : 'adicione uma faixa para sincronizar'}
              </div>
              <div className="track-tags">
                <span className="track-tag track-tag-green">batida {music.data.bpm || '--'}</span>
                <span className="track-tag track-tag-blue">{music.data.playbackRate.toFixed(2)}x</span>
                <span className="track-tag track-tag-purple">pace {musicEstimatedPace > 0 ? formatPace(musicEstimatedPace) : '--:--'}</span>
                <span className="track-tag track-tag-purple">passada {dynamicStride.toFixed(2)}m</span>
              </div>
            </div>
          </div>

          <div className="music-pace-summary">
            <div className="music-pace-summary-value">
              {musicEstimatedPace > 0 ? formatPace(musicEstimatedPace) : '--:--'}
            </div>
            <div className="music-pace-summary-label">pace estimado da musica</div>
            <div className="music-pace-summary-sub">
              Batida efetiva {musicTempoBpm > 0 ? Math.round(musicTempoBpm) : '--'} • passada {dynamicStride.toFixed(2)} m
            </div>
          </div>

          <div className="music-tools-row" style={{ marginBottom: 12 }}>
            <button
              className={`secondary-btn ${music.data.rateControlMode === 'manual' ? 'secondary-btn-green' : ''}`}
              onClick={() => setPlaybackMode('manual')}
            >
              Velocidade manual
            </button>
            <button
              className={`secondary-btn ${music.data.rateControlMode === 'auto' ? 'secondary-btn-green' : ''}`}
              onClick={() => setPlaybackMode('auto')}
            >
              Ajuste automatico
            </button>
            <button className="secondary-btn" onClick={() => adjustPlaybackRate(-0.02)}>
              - velocidade
            </button>
            <button className="secondary-btn" onClick={() => adjustPlaybackRate(0.02)}>
              + velocidade
            </button>
          </div>

          {/* BPM Editor */}
          <div className="bpm-editor">
            <span className="bpm-editor-label">Batida da musica</span>
            <div className="bpm-editor-row">
              <button className="step-btn" onClick={() => adjustBpm(-1)} disabled={!music.data.hasAudioBuffer}>−</button>
              <input
                className="bpm-input"
                type="number"
                min="60"
                max="200"
                value={bpmInput}
                onChange={(e) => handleBpmChange(e.target.value)}
                disabled={!music.data.hasAudioBuffer}
              />
              <button className="step-btn" onClick={() => adjustBpm(1)} disabled={!music.data.hasAudioBuffer}>+</button>
            </div>
            {music.data.bpm > 0 && (
              <div className="bpm-detected">
                Detectado {music.data.detectedBpm || '--'} • Tap {music.data.tapBpm || '--'} • Manual {music.data.manualBpm || '--'}
              </div>
            )}

            <div className="music-tools-row">
              <button className="secondary-btn" onClick={handleTapTempo} disabled={!music.data.hasAudioBuffer}>
                Tap Tempo
              </button>
              <button className="secondary-btn" onClick={music.resetTapTempo} disabled={!music.data.hasAudioBuffer}>
                Limpar Tap
              </button>
              <button className={`secondary-btn ${music.data.metronomeOn ? 'secondary-btn-green' : ''}`} onClick={toggleMetronome}>
                {music.data.metronomeOn ? `Metronomo ON (${music.data.metronomeBpm})` : 'Ativar Metronomo'}
              </button>
              <button
                className={`secondary-btn ${coach.enabled ? 'secondary-btn-green' : ''}`}
                onClick={coach.toggle}
                disabled={!coach.isSupported}
              >
                {coach.enabled ? 'Coach Voz ON' : 'Coach Voz OFF'}
              </button>
            </div>
          </div>

          <div className="waveform">
            {Array.from({ length: 36 }).map((_, i) => (
              <span
                key={i}
                className={`wave-bar ${i < 16 ? 'wave-played' : i === 16 ? 'wave-current' : ''}`}
                style={{ height: `${30 + ((i * 13) % 55)}%` }}
              />
            ))}
          </div>
          <div className="time-row"><span>0:00</span><span>--:--</span></div>

          <div className="mode-switch">
            {(['follow_music', 'target_pace'] as MusicMode[]).map((m) => (
              <button
                key={m}
                className={`mode-btn ${music.data.mode === m ? 'mode-btn-active' : ''}`}
                onClick={() => music.setMode(m)}
              >
                {m === 'follow_music' ? 'Musica guia' : 'Pace escolhido'}
              </button>
            ))}
          </div>

          <div className="time-row" style={{ marginBottom: 8 }}>
            <span>
              {music.data.mode === 'follow_music'
                ? 'Modo ativo: a musica guia o seu pace'
                : 'Modo ativo: voce escolhe o pace e a musica acompanha'}
            </span>
            <span>{music.data.mode === 'follow_music' ? 'musica→pace' : 'pace→musica'}</span>
          </div>

          {music.data.mode === 'target_pace' && (
            <div className="target-input-card">
              <label htmlFor="targetPace">Pace-alvo (min/km)</label>
              <input
                id="targetPace"
                type="number"
                step="0.05"
                min="3"
                max="15"
                value={targetPaceInput}
                onChange={(e) => setTargetPaceInput(e.target.value)}
              />
            </div>
          )}

          <div className="upload-row">
            <label className="upload-btn">
              Carregar musica
              <input type="file" accept="audio/*" onChange={handleFileChange} />
            </label>
            <div className="player-controls">
              <button className="icon-btn" onClick={music.stop}>■</button>
              <button
                className="play-btn"
                onClick={musicPlaying ? music.pause : music.play}
                disabled={!music.data.hasAudioBuffer}
              >
                {musicPlaying ? 'Pausar' : 'Play'}
              </button>
            </div>
          </div>
        </section>

          </>
        )}

        {/* ── Botoes fixos ───────────────────────────────────────────────── */}
        <section className="view-switch view-switch-bottom" aria-label="Navegacao lateral">
          <button className={`view-btn ${activePage === 0 ? 'view-btn-active' : ''}`} onClick={() => goToPage(0)}>
            <span>⚡</span>
            Treino
          </button>
          <button className={`view-btn ${activePage === 1 ? 'view-btn-active' : ''}`} onClick={() => goToPage(1)}>
            <span>🎵</span>
            Musica
          </button>
          <button className={`view-btn ${activePage === 2 ? 'view-btn-active' : ''}`} onClick={() => goToPage(2)}>
            <span>◎</span>
            Tiro
          </button>
          <button className={`view-btn ${activePage === 3 ? 'view-btn-active' : ''}`} onClick={() => goToPage(3)}>
            <span>📊</span>
            Dados
          </button>
        </section>

      </main>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MetricCard({ color, label, value, unit }: {
  color: 'green' | 'blue' | 'orange';
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className={`metric-card-ui metric-${color}`}>
      <div className="metric-card-value">
        {value}{unit ? <span>{unit}</span> : null}
      </div>
      <div className="metric-card-label">{label}</div>
    </div>
  );
}

function InfoLine({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="info-line">
      <div>
        <div className="info-label">{label}</div>
        {sub ? <div className="info-sub">{sub}</div> : null}
      </div>
      <div className="info-value">{value}</div>
    </div>
  );
}

function formatElapsed(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
