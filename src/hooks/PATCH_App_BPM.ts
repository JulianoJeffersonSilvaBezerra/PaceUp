// ─── PATCH: substitua a seção inteira da <section className="player-card"> ───
// no seu App.tsx pelo trecho abaixo.
// Adiciona: estado bpmInput, botões +/- de BPM e input de edição manual.
// ─────────────────────────────────────────────────────────────────────────────

// 1. Adicione este estado logo após os outros useState no topo do componente App():
//
//    const [bpmInput, setBpmInput] = useState('');
//
// useEffect para sincronizar bpmInput quando BPM é detectado automaticamente:
//
//    useEffect(() => {
//      if (music.data.bpm > 0 && bpmInput === '') {
//        setBpmInput(String(music.data.bpm));
//      }
//    }, [music.data.bpm]);
//
// Função para aplicar BPM manual:
//
//    function handleBpmChange(val: string) {
//      setBpmInput(val);
//      const n = parseInt(val, 10);
//      if (!isNaN(n) && n >= 60 && n <= 200) {
//        music.setManualBPM(n);
//      }
//    }
//
//    function adjustBpm(delta: number) {
//      const current = parseInt(bpmInput || String(music.data.bpm || 120), 10);
//      const next = Math.min(200, Math.max(60, current + delta));
//      setBpmInput(String(next));
//      music.setManualBPM(next);
//    }

// 2. Substitua a <section className="player-card"> inteira por esta:

/*
<section className="player-card">
  <div className="section-head">
    <h2>Música</h2>
    <span className="mini-badge">
      {musicPlaying ? 'tocando' : music.data.hasAudioBuffer ? 'pronta' : 'sem música'}
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
        <span className="track-tag track-tag-blue">
          {music.data.playbackRate.toFixed(2)}×
        </span>
        <span className="track-tag track-tag-purple">
          passada {dynamicStride.toFixed(2)}m
        </span>
      </div>
    </div>
  </div>

  {/* ── BPM EDITOR ── */}
  <div className="bpm-editor">
    <span className="bpm-editor-label">BPM da música</span>
    <div className="bpm-editor-row">
      <button
        className="step-btn"
        onClick={() => adjustBpm(-1)}
        disabled={!music.data.hasAudioBuffer}
      >
        −
      </button>
      <input
        className="bpm-input"
        type="number"
        min="60"
        max="200"
        value={bpmInput}
        onChange={(e) => handleBpmChange(e.target.value)}
        disabled={!music.data.hasAudioBuffer}
      />
      <button
        className="step-btn"
        onClick={() => adjustBpm(1)}
        disabled={!music.data.hasAudioBuffer}
      >
        +
      </button>
    </div>
    {music.data.bpm > 0 && (
      <div className="bpm-detected">
        BPM detectado automaticamente: {music.data.bpm}
      </div>
    )}
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
    <span>0:00</span>
    <span>--:--</span>
  </div>

  <div className="mode-switch">
    {(['follow_music', 'target_pace'] as MusicMode[]).map((m) => (
      <button
        key={m}
        className={`mode-btn ${music.data.mode === m ? 'mode-btn-active' : ''}`}
        onClick={() => music.setMode(m)}
      >
        {m === 'follow_music' ? 'Seguir música' : 'Pace-alvo'}
      </button>
    ))}
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
*/

// 3. Adicione este CSS no final do App.css:
/*
.bpm-editor {
  margin-bottom: 16px;
  padding: 14px;
  background: var(--card-2);
  border: 1px solid var(--border);
  border-radius: 18px;
}

.bpm-editor-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted-2);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.bpm-editor-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bpm-input {
  flex: 1;
  height: 52px;
  border-radius: 14px;
  border: 1px solid var(--border-2);
  background: #0d1118;
  color: var(--text);
  padding: 0 14px;
  font-size: 26px;
  font-weight: 900;
  text-align: center;
}

.bpm-input:focus {
  border-color: rgba(0, 230, 118, 0.35);
  box-shadow: 0 0 0 3px rgba(0, 230, 118, 0.08);
}

.bpm-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.bpm-detected {
  margin-top: 8px;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}
*/
