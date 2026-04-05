import { useEffect, useMemo, useRef, useState } from 'react';
import { useGPS, formatPace } from './hooks/useGPS';
import { useCalibration } from './hooks/useCalibration';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useCadence } from './hooks/useCadence';
import type { MusicMode } from './hooks/useMusicEngine';
import './App.css';

export default function App() {
  const gps = useGPS();
  const cal = useCalibration();
  const music = useMusicEngine();

  const rawStride = cal.data.strideM * (1 + (gps.data.speedMs - 3) * 0.05);
  const dynamicStride = Math.min(
    cal.data.strideM * 1.12,
    Math.max(cal.data.strideM * 0.88, rawStride)
  );

  const cadence = useCadence(
    gps.data.speedMs,
    gps.data.smoothedDistance,
    dynamicStride
  );

  const [targetPaceInput, setTargetPaceInput] = useState('5.30');

  const tickRef = useRef(music.tick);
  const spmRef = useRef(cadence.data.stepsPerMinute);
  const strideRef = useRef(dynamicStride);
  const modeRef = useRef(music.data.mode);
  const tpInputRef = useRef(targetPaceInput);

  useEffect(() => {
    tickRef.current = music.tick;
  }, [music.tick]);

  useEffect(() => {
    spmRef.current = cadence.data.stepsPerMinute;
  }, [cadence.data.stepsPerMinute]);

  useEffect(() => {
    strideRef.current = dynamicStride;
  }, [dynamicStride]);

  useEffect(() => {
    modeRef.current = music.data.mode;
  }, [music.data.mode]);

  useEffect(() => {
    tpInputRef.current = targetPaceInput;
  }, [targetPaceInput]);

  useEffect(() => {
    const id = setInterval(() => {
      const tp =
        modeRef.current === 'target_pace'
          ? parseFloat(tpInputRef.current) || 0
          : undefined;

      tickRef.current(spmRef.current, strideRef.current, tp);
    }, 5000);

    return () => clearInterval(id);
  }, []);

  const gpsActive = gps.data.status === 'active';
  const calRunning = cal.data.status === 'running';
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
    paceError === 0
      ? '--'
      : paceError < 0.2
      ? 'Perfeito'
      : paceError < 0.4
      ? 'Aceitável'
      : 'Verificar';

  const targetPaceNumber = parseFloat(targetPaceInput) || 0;

  const heroPace = gps.data.averagePace > 0 ? gps.data.averagePace : 0;
  const heroPaceText = heroPace > 0 ? formatPace(heroPace) : '--:--';

  const paceDiff = useMemo(() => {
    if (!heroPace || !targetPaceNumber) return null;
    const diff = heroPace - targetPaceNumber;
    return diff;
  }, [heroPace, targetPaceNumber]);

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
    if (file) {
      music.loadFile(file);
    }
  }

  const error = gps.data.error || cal.data.error || music.data.error;

  const levelProgress = Math.min(
    100,
    Math.round((gps.data.smoothedDistance / 5000) * 100)
  );

  const achievementItems = [
    {
      icon: '🔥',
      label: 'Sequência',
      active: cadence.data.elapsedSeconds > 0,
    },
    {
      icon: '⚡',
      label: 'Ritmo',
      active: gps.data.speedMs > 1.8,
    },
    {
      icon: '🎵',
      label: 'Música',
      active: music.data.hasAudioBuffer,
    },
    {
      icon: '📍',
      label: 'GPS',
      active: gpsActive,
    },
  ];

  return (
    <div className="app-shell">
      <div className="app-bg-glow app-bg-glow-1" />
      <div className="app-bg-glow app-bg-glow-2" />

      <main className="app-screen">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">🏃</div>
            <div>
              <h1>RunCadence</h1>
              <p>corrida com música no ritmo certo</p>
            </div>
          </div>

          <div className={`gps-pill ${gpsActive ? 'gps-on' : 'gps-off'}`}>
            <span className="gps-dot" />
            {gpsActive ? 'GPS ativo' : 'GPS pronto'}
          </div>
        </header>

        {error && <div className="alert-box">⚠️ {error}</div>}

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
                ? 'Sem comparação'
                : paceDiff < 0
                ? `▲ ${Math.abs(paceDiff).toFixed(2)} abaixo do alvo`
                : `▼ ${paceDiff.toFixed(2)} acima do alvo`}
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          <MetricCard
            color="green"
            label="Cadência"
            value={cadence.data.stepsPerMinute || 0}
            unit="spm"
          />
          <MetricCard
            color="blue"
            label="Distância"
            value={(gps.data.smoothedDistance / 1000).toFixed(2)}
            unit="km"
          />
          <MetricCard
            color="orange"
            label="Tempo"
            value={formatElapsed(cadence.data.elapsedSeconds)}
          />
        </section>

        <section className="pace-bars-card">
          <div className="section-head">
            <h2>Pace e comparação</h2>
            <span className="mini-badge">
              {gps.data.averagePace > 0 ? 'ao vivo' : 'aguardando movimento'}
            </span>
          </div>

          <div className="comparison-grid">
            <InfoLine
              label="Pace médio GPS"
              value={formatPace(gps.data.averagePace)}
            />
            <InfoLine
              label="Pace por fórmula"
              value={formatPace(paceBySPM)}
            />
            <InfoLine
              label="Pace-alvo"
              value={
                music.data.targetPace > 0
                  ? formatPace(music.data.targetPace)
                  : formatPace(targetPaceNumber)
              }
            />
            <InfoLine
              label="Erro GPS × fórmula"
              value={paceError > 0 ? `${paceError.toFixed(2)} min/km` : '--'}
              sub={paceError > 0 ? paceErrorLabel : undefined}
            />
          </div>
        </section>

        <section className="player-card">
          <div className="section-head">
            <h2>Música</h2>
            <span className="mini-badge">
              {musicPlaying ? 'tocando' : 'pronta'}
            </span>
          </div>

          <div className="player-track">
            <div className="track-art">🎵</div>

            <div className="track-meta">
              <div className="track-title">
                {music.data.fileName || 'Nenhuma música carregada'}
              </div>
              <div className="track-subtitle">
                {music.data.fileName
                  ? 'arquivo carregado para o treino'
                  : 'adicione uma faixa para sincronizar com o pace'}
              </div>

              <div className="track-tags">
                <span className="track-tag track-tag-green">
                  {music.data.bpm || '--'} BPM
                </span>
                <span className="track-tag track-tag-blue">
                  {music.data.playbackRate.toFixed(2)}×
                </span>
                <span className="track-tag track-tag-purple">
                  passada {dynamicStride.toFixed(2)}m
                </span>
              </div>
            </div>
          </div>

          <div className="waveform">
            {Array.from({ length: 36 }).map((_, i) => (
              <span
                key={i}
                className={`wave-bar ${
                  i < 16 ? 'wave-played' : i === 16 ? 'wave-current' : ''
                }`}
                style={{ height: `${30 + ((i * 13) % 55)}%` }}
              />
            ))}
          </div>

          <div className="time-row">
            <span>1:44</span>
            <span>3:46</span>
          </div>

          <div className="mode-switch">
            {(['follow_music', 'target_pace'] as MusicMode[]).map((m) => (
              <button
                key={m}
                className={`mode-btn ${
                  music.data.mode === m ? 'mode-btn-active' : ''
                }`}
                onClick={() => music.setMode(m)}
              >
                {m === 'follow_music' ? 'Seguir música' : 'Pace-alvo'}
              </button>
            ))}
          </div>

          {music.data.mode === 'target_pace' && (
            <div className="target-input-card">
              <label htmlFor="targetPace">Pace-alvo</label>
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
              Carregar música
              <input type="file" accept="audio/*" onChange={handleFileChange} />
            </label>

            <div className="player-controls">
              <button className="icon-btn" onClick={music.stop}>
                ■
              </button>
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

        <section className="control-card">
          <div className="section-head">
            <h2>Controle de pace</h2>
            <span className="mini-badge">
              {music.data.mode === 'target_pace' ? 'auto ativo' : 'manual'}
            </span>
          </div>

          <div className="pace-control-box">
            <button
              className="step-btn"
              onClick={() =>
                setTargetPaceInput((prev) =>
                  Math.max(3, (parseFloat(prev || '5.30') - 0.05)).toFixed(2)
                )
              }
            >
              −
            </button>

            <div className="pace-display-box">
              <div className="pace-display-value">
                {targetPaceNumber.toFixed(2)}
              </div>
              <div className="pace-display-unit">min/km</div>
            </div>

            <button
              className="step-btn"
              onClick={() =>
                setTargetPaceInput((prev) =>
                  Math.min(15, (parseFloat(prev || '5.30') + 0.05)).toFixed(2)
                )
              }
            >
              +
            </button>
          </div>
        </section>

        <section className="progress-card">
          <div className="section-head">
            <h2>Progresso</h2>
            <span className="mini-badge">{levelProgress}% da meta de 5 km</span>
          </div>

          <div className="xp-row">
            <div>
              <div className="xp-title">Meta da sessão</div>
              <div className="xp-sub">
                {(gps.data.smoothedDistance / 1000).toFixed(2)} km de 5.00 km
              </div>
            </div>
            <div className="xp-value">
              {Math.round(gps.data.smoothedDistance)} XP
            </div>
          </div>

          <div className="xp-bar">
            <div
              className="xp-fill"
              style={{ width: `${levelProgress}%` }}
            />
          </div>

          <div className="achievement-grid">
            {achievementItems.map((item) => (
              <div
                key={item.label}
                className={`achievement ${item.active ? 'active' : ''}`}
              >
                <div className="achievement-icon">{item.icon}</div>
                <div className="achievement-label">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="details-card">
          <div className="section-head">
            <h2>Detalhes técnicos</h2>
            <span className="mini-badge">debug leve</span>
          </div>

          <div className="details-grid">
            <InfoLine label="Precisão GPS" value={`${gps.data.accuracy} m`} />
            <InfoLine label="Velocidade" value={`${gps.data.speedMs} m/s`} />
            <InfoLine
              label="Passos estimados"
              value={String(cadence.data.sessionSteps)}
            />
            <InfoLine
              label="Buffer carregado"
              value={music.data.hasAudioBuffer ? 'Sim' : 'Não'}
            />
            <InfoLine label="Status calibração" value={cal.data.status} />
            <InfoLine
              label="Passada calibrada"
              value={`${cal.data.strideM.toFixed(4)} m`}
            />
          </div>

          <div className="calibration-actions">
            {!calRunning ? (
              <button
                className="secondary-btn"
                onClick={() =>
                  cal.startCalibration(
                    cadence.data.sessionSteps,
                    gps.data.smoothedDistance
                  )
                }
                disabled={!gpsActive}
              >
                Iniciar calibração
              </button>
            ) : (
              <button
                className="secondary-btn secondary-btn-green"
                onClick={() =>
                  cal.finishCalibration(
                    cadence.data.sessionSteps,
                    gps.data.smoothedDistance
                  )
                }
              >
                Finalizar calibração
              </button>
            )}

            <button className="secondary-btn" onClick={cal.reset}>
              Reset calibração
            </button>
          </div>
        </section>

        <footer className="bottom-actions">
          {!gpsActive ? (
            <button className="run-btn-main" onClick={handleStart}>
              ▶ Iniciar corrida
            </button>
          ) : (
            <button className="run-btn-main run-btn-stop" onClick={handleStop}>
              ■ Parar corrida
            </button>
          )}

          <button className="reset-btn-main" onClick={handleReset}>
            ↺
          </button>
        </footer>
      </main>
    </div>
  );
}

function MetricCard({
  color,
  label,
  value,
  unit,
}: {
  color: 'green' | 'blue' | 'orange';
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className={`metric-card-ui metric-${color}`}>
      <div className="metric-card-value">
        {value}
        {unit ? <span>{unit}</span> : null}
      </div>
      <div className="metric-card-label">{label}</div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
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
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}