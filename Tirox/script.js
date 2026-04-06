// Estado Inicial
let blocks = [
  { type: "Aquecimento", mode: "tempo", value: 300 }, // 5 min
  { type: "Tiro Máximo", mode: "distancia", value: 400 }, // 400m
  { type: "Recuperação", mode: "tempo", value: 60 } // 1 min
];

// --- RENDERIZAÇÃO DA INTERFACE ---
function render() {
  const container = document.getElementById("blocks-container");
  container.innerHTML = "";

  blocks.forEach((b, i) => {
    const div = document.createElement("div");
    div.className = "block";

    div.innerHTML = `
      <input type="text" value="${b.type}" onchange="updateType(${i}, this.value)" placeholder="Nome do Alvo">
      <select onchange="updateMode(${i}, this.value)">
        <option value="tempo" ${b.mode === "tempo" ? "selected" : ""}>Seg.</option>
        <option value="distancia" ${b.mode === "distancia" ? "selected" : ""}>Metros</option>
      </select>
      <input type="number" value="${b.value}" onchange="updateValue(${i}, this.value)">
      <button class="btn-remove" onclick="removeBlock(${i})">✖</button>
    `;
    container.appendChild(div);
  });
}

function updateType(i, v) { blocks[i].type = v; }
function updateMode(i, v) { blocks[i].mode = v; }
function updateValue(i, v) { blocks[i].value = parseInt(v) || 0; }

function addBlock() {
  blocks.push({ type: "Novo Alvo", mode: "tempo", value: 60 });
  render();
}

function removeBlock(i) {
  blocks.splice(i, 1);
  render();
}

// --- SISTEMA DE VOZ (O TREINADOR) ---
function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.3;  // Ritmo acelerado
    utterance.pitch = 0.8; // Tom agressivo/grave
    window.speechSynthesis.speak(utterance);
  }
}

// --- MOTOR DE CORRIDA ---
let index = 0;
let timeLeft = 0;
let interval = null;

function startWorkout() {
  index = 0;
  speak("Iniciando combate. Prepare-se.");
  
  // Pequeno delay para a voz terminar antes de rodar o cronômetro
  setTimeout(run, 2000); 
}

function run() {
  if (index >= blocks.length) {
    document.getElementById("status").innerText = "MISSÃO CUMPRIDA";
    document.getElementById("timer").innerText = "00:00";
    speak("Treino finalizado. Bom trabalho.");
    return;
  }

  const b = blocks[index];
  document.getElementById("status").innerText = b.type.toUpperCase();
  
  speak(`Atenção, bloco de ${b.type}.`);

  if (b.mode === "tempo") {
    timeLeft = b.value;
  } else {
    // Simulação: Pace de 5:00/km (300 segundos para 1000m = 0.3s por metro)
    timeLeft = Math.round(b.value * 0.3);
  }

  runTimer();
}

function runTimer() {
  clearInterval(interval);

  interval = setInterval(() => {
    updateTimerDisplay(timeLeft);
    timeLeft--;

    // Contagem regressiva em voz nos últimos 3 segundos
    if (timeLeft === 3) speak("Três");
    if (timeLeft === 2) speak("Dois");
    if (timeLeft === 1) speak("Um");

    if (timeLeft < 0) {
      clearInterval(interval);
      index++;
      run();
    }
  }, 1000);
}

function updateTimerDisplay(s) {
  let m = Math.floor(s / 60);
  let sec = s % 60;
  document.getElementById("timer").innerText =
    `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// --- METRÔNOMO DE ALTA PRECISÃO (Web Audio API) ---
let audioCtx = null;
let metroInterval = null;
let isMetroActive = false;

function playClick() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.type = "square"; // Som mais áspero
  osc.frequency.value = 800; // Frequência do bip
  
  gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.1);
}

function toggleMetronome() {
  const bpm = parseInt(document.getElementById("bpm").value) || 180;
  const btn = document.getElementById("metro-btn");

  if (isMetroActive) {
    clearInterval(metroInterval);
    isMetroActive = false;
    btn.classList.remove("active");
    btn.innerText = "ATIVAR METRÔNOMO";
    return;
  }

  // Permissão do navegador para áudio precisa de interação do usuário
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  isMetroActive = true;
  btn.classList.add("active");
  btn.innerText = "METRÔNOMO ON";

  const intervalMs = 60000 / bpm;
  
  // Toca o primeiro click imediatamente
  playClick(); 
  metroInterval = setInterval(playClick, intervalMs);
}

// Inicia renderização ao carregar a página
window.onload = render;