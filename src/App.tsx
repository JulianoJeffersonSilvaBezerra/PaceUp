import { useEffect, useRef, useState } from 'react';
import { useGPS, formatPace } from './hooks/useGPS';
import { useCalibration } from './hooks/useCalibration';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useCadence } from './hooks/useCadence';
import type { MusicMode } from './hooks/useMusicEngine';
import './App.css';

export default function App() {
  const gps   = useGPS();
  const cal   = useCalibration();
  const music = useMusicEngine();

  // Passada dinâmica com clamp ±12%
  const rawStride     = cal.data.strideM * (1 + (gps.data.speedMs - 3) * 0.05);
  const dynamicStride = Math.min(cal.data.strideM * 1.12, Math.max(cal.data.strideM * 0.88, rawStride));

  // Cadência calculada pela fórmula — sem sensor nativo
  const cadence = useCadence(gps.data.speedMs, gps.data.smoothedDistance, dynamicStride);

  const [targetPaceInput, setTargetPaceInput] = useState('5.20');

  // ─── Motor de tick estável ────────────────────────────────────────────────
  const tickRef    = useRef(music.tick);
  const spmRef     = useRef(cadence.data.stepsPerMinute);
  const strideRef  = useRef(dynamicStride);
  const modeRef    = useRef(music.data.mode);
  const tpInputRef = useRef(targetPaceInput);

  useEffect(() => { tickRef.current   = music.tick;                    }, [music.tick]);
  useEffect(() => { spmRef.current    = cadence.data.stepsPerMinute;   }, [cadence.data.stepsPerMinute]);
  useEffect(() => { strideRef.current = dynamicStride;                 }, [dynamicStride]);
  useEffect(() => { modeRef.current   = music.data.mode;               }, [music.data.mode]);
  useEffect(() => { tpInputRef.current = targetPaceInput;              }, [targetPaceInput]);

  useEffect(() => {
    const id = setInterval(() => {
      const tp = modeRef.current === 'target_pace'
        ? parseFloat(tpInputRef.current) || 0
        : undefined;
      tickRef.current(spmRef.current, strideRef.current, tp);
    }, 5_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Estado ───────────────────────────────────────────────────────────────
  const gpsActive    = gps.data.status === 'active';
  const calRunning   = cal.data.status === 'running';
  const musicPlaying = music.data.status === 'playing';

  const paceBySPM =
    cadence.data.stepsPerMinute > 0
      ? 1000 / (cadence.data.stepsPerMinute * dynamicStride)
      : 0;

  const paceError =
    gps.data.averagePace > 0 && paceBySPM > 0
      ? Math.abs(gps.data.averagePace - paceBySPM)
      : 0;

  const paceErrorLabel =
    paceError === 0   ? '--'
    : paceError < 0.2 ? '✅ perfeito'
    : paceError < 0.4 ? '🟡 aceitável'
    : '🔴 verificar';

  async function handleStart() {
    await gps.start();
  }

  async function handleStop() {
    await gps.stop();
    music.stop();
    cadence.reset();
  }

  function handleReset() {
    gps.resetSession();
    cadence.reset();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) music.loadFile(file);
  }

  const error = gps.data.error || cal.data.error || music.data.error;

  return (
    <div className="debug-screen">
      <h1>🏃 RunCadence</h1>

      {error && <div className="error-box">⚠️ {error}</div>}

      {/* STATUS */}
      <section className="block">
        <h2>Status</h2>
        <Row label="GPS"              value={gps.data.status} />
        <Row label="Precisão GPS"     value={gps.data.accuracy} unit="m" />
        <Row label="Música"           value={music.data.status} />
        <Row label="Buffer carregado" value={music.data.hasAudioBuffer ? 'sim' : 'não'} />
      </section>

      {/* MÚSICA */}
      <section className="block highlight-purple">
        <h2>Música</h2>

        <div className="file-row">
          <label className="file-label">
            🎵 Carregar música
            <input type="file" accept="audio/*" className="file-input" onChange={handleFileChange} />
          </label>
        </div>

        {music.data.fileName && <Row label="Arquivo" value={music.data.fileName} mono />}
        <Row label="BPM"           value={music.data.bpm || '--'} />
        <Row label="Playback rate" value={music.data.playbackRate.toFixed(3)} unit="×" big />
        <Row label="Cadência-alvo" value={music.data.targetCadence || '--'} unit="spm" />
        <Row label="Pace-alvo"     value={formatPace(music.data.targetPace)} unit="min/km" />

        <div className="mode-row">
          <span className="label">Modo:</span>
          {(['follow_music', 'target_pace'] as MusicMode[]).map((m) => (
            <button
              key={m}
              className={`mode-chip ${music.data.mode === m ? 'active' : ''}`}
              onClick={() => music.setMode(m)}
            >
              {m === 'follow_music' ? '🎵 seguir música' : '🎯 pace-alvo'}
            </button>
          ))}
        </div>

        {music.data.mode === 'target_pace' && (
          <div className="pace-input-row">
            <span className="label">Pace-alvo (min/km):</span>
            <input
              type="number"
              step="0.05"
              min="3"
              max="15"
              value={targetPaceInput}
              onChange={(e) => setTargetPaceInput(e.target.value)}
              className="pace-input"
            />
          </div>
        )}

        <div className="bpm-manual">
          <span className="label">BPM manual:</span>
          {[140, 150, 160, 170, 180].map((bpm) => (
            <button
              key={bpm}
              className={`bpm-chip ${music.data.bpm === bpm ? 'active' : ''}`}
              onClick={() => music.setManualBPM(bpm)}
            >
              {bpm}
            </button>
          ))}
        </div>

        <div className="music-controls">
          <button
            className="btn btn-play"
            onClick={musicPlaying ? music.pause : music.play}
            disabled={!music.data.hasAudioBuffer}
          >
            {musicPlaying ? '⏸ Pausar' : '▶ Play'}
          </button>
          <button className="btn btn-reset" onClick={music.stop}>■</button>
        </div>
      </section>

      {/* OS 3 PACES */}
      <section className="block highlight-blue">
        <h2>Os 3 paces + validação</h2>
        <Row label="Pace médio GPS"   value={formatPace(gps.data.averagePace)} unit="min/km" big />
        <Row label="Pace por fórmula" value={formatPace(paceBySPM)} unit="min/km" />
        <Row label="Pace-alvo música" value={formatPace(music.data.targetPace)} unit="min/km" />
        <Row
          label="Erro GPS ↔ fórmula"
          value={paceError > 0 ? paceError.toFixed(2) : '--'}
          unit={paceError > 0 ? `min/km  ${paceErrorLabel}` : ''}
        />
      </section>

      {/* CALIBRAÇÃO */}
      <section className={`block ${calRunning ? 'highlight-orange' : 'highlight-gray'}`}>
        <h2>Calibração de passada</h2>
        <Row label="Status"            value={cal.data.status} />
        <Row label="Passada calibrada" value={cal.data.strideM.toFixed(4)} unit="m" />
        <Row label="Passada dinâmica"  value={dynamicStride.toFixed(4)} unit="m" />
        <Row label="Sessões"           value={cal.data.sessionCount} />
        <div className="cal-btn-row">
          {!calRunning ? (
            <button
              className="btn btn-cal-start"
              onClick={() => cal.startCalibration(
                cadence.data.sessionSteps,
                gps.data.smoothedDistance
              )}
              disabled={!gpsActive}
            >
              📍 Iniciar calibração
            </button>
          ) : (
            <button
              className="btn btn-cal-finish"
              onClick={() => cal.finishCalibration(
                cadence.data.sessionSteps,
                gps.data.smoothedDistance
              )}
            >
              ✅ Finalizar
            </button>
          )}
          <button className="btn btn-reset" onClick={cal.reset}>↺</button>
        </div>
        {calRunning && <p className="cal-hint">Corra pelo menos 200m em ritmo constante.</p>}
      </section>

      {/* CADÊNCIA */}
      <section className="block highlight-green">
        <h2>Cadência (calculada por fórmula)</h2>
        <Row label="Passos/min"         value={cadence.data.stepsPerMinute} unit="spm" big />
        <Row label="Passos estimados"   value={cadence.data.sessionSteps} />
        <Row label="Distância GPS"      value={gps.data.smoothedDistance} unit="m" />
        <Row label="Velocidade"         value={gps.data.speedMs} unit="m/s" />
        <Row label="Tempo"              value={formatElapsed(cadence.data.elapsedSeconds)} />
      </section>

      {/* CONTROLES */}
      <div className="btn-row">
        {!gpsActive ? (
          <button className="btn btn-start" onClick={handleStart}>
            ▶ Iniciar
          </button>
        ) : (
          <button className="btn btn-stop" onClick={handleStop}>
            ■ Parar
          </button>
        )}
        <button className="btn btn-reset" onClick={handleReset}>↺ Reset</button>
      </div>
    </div>
  );
}

function Row({ label, value, unit = '', big = false, mono = false }: {
  label: string; value: string | number; unit?: string; big?: boolean; mono?: boolean;
}) {
  return (
    <div className="row">
      <span className="label">{label}</span>
      <span className={['value', big && 'big', mono && 'mono'].filter(Boolean).join(' ')}>
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
