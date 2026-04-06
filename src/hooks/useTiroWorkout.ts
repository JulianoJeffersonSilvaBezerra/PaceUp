import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type TiroStepType = 'warmup' | 'run' | 'rest' | 'cooldown';
export type TiroDurationType = 'tempo' | 'distancia' | 'open';

export interface TiroBlock {
  id: string;
  stepType: TiroStepType;
  durationType: TiroDurationType;
  name: string;
  durationValue: number;
  targetPaceMin?: number | null;
  targetPaceMax?: number | null;
  repeatCount?: number;
}

export interface TiroExecutionBlock extends TiroBlock {
  executionIndex: number;
  repeatIndex: number;
  repeatTotal: number;
}

export interface TiroWorkoutSummary {
  templateName: string;
  blocksCompleted: number;
  repeatBlocksCompleted: number;
  totalDistanceM: number;
  totalElapsedSeconds: number;
  averageTiroPace: number;
}

export interface TiroTelemetryInput {
  currentDistanceM: number;
  currentPaceMinKm: number;
  currentElapsedSeconds: number;
}

interface SpeakOptions {
  priority?: 'low' | 'normal' | 'high';
}

const PACE_ALERT_COOLDOWN_MS = 8000;
const PACE_CHECK_INTERVAL_MS = 3000;
const DEFAULT_REPEAT_COUNT = 5;
const DEFAULT_WARMUP_SECONDS = 300;
const DEFAULT_REST_SECONDS = 60;
const DEFAULT_COOLDOWN_SECONDS = 300;
const DEFAULT_TIRO_DISTANCE_M = 400;
const DEFAULT_TARGET_PACE_MIN = 4.5;
const DEFAULT_TARGET_PACE_MAX = 5.0;
const DEFAULT_REF_PACE = 5.0;
const COUNTDOWN_SECONDS = 3;

function formatPace(paceMinKm?: number | null): string {
  if (!paceMinKm || !Number.isFinite(paceMinKm) || paceMinKm <= 0) return '--:--';
  const minutes = Math.floor(paceMinKm);
  const seconds = Math.round((paceMinKm - minutes) * 60);
  return `${minutes}:${String(seconds === 60 ? 0 : seconds).padStart(2, '0')}`;
}

function formatSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function speak(text: string, options?: SpeakOptions) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const voices = window.speechSynthesis.getVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.05;
  utterance.pitch = 0.95;
  utterance.volume = 1;

  const voicePtBr = voices.find((voice) => /pt-BR/i.test(voice.lang));
  if (voicePtBr) {
    utterance.voice = voicePtBr;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildDefaultBlocks(): TiroBlock[] {
  return [
    {
      id: 'warmup',
      stepType: 'warmup',
      durationType: 'tempo',
      name: 'Aquecimento',
      durationValue: DEFAULT_WARMUP_SECONDS,
      targetPaceMin: null,
      targetPaceMax: null,
      repeatCount: 1,
    },
    {
      id: 'run',
      stepType: 'run',
      durationType: 'distancia',
      name: 'Tiro',
      durationValue: DEFAULT_TIRO_DISTANCE_M,
      targetPaceMin: DEFAULT_TARGET_PACE_MIN,
      targetPaceMax: DEFAULT_TARGET_PACE_MAX,
      repeatCount: DEFAULT_REPEAT_COUNT,
    },
    {
      id: 'rest',
      stepType: 'rest',
      durationType: 'tempo',
      name: 'Recuperacao',
      durationValue: DEFAULT_REST_SECONDS,
      targetPaceMin: null,
      targetPaceMax: null,
      repeatCount: 1,
    },
    {
      id: 'cooldown',
      stepType: 'cooldown',
      durationType: 'tempo',
      name: 'Desaquecimento',
      durationValue: DEFAULT_COOLDOWN_SECONDS,
      targetPaceMin: null,
      targetPaceMax: null,
      repeatCount: 1,
    },
  ];
}

function cloneBlocks(blocks: TiroBlock[]): TiroBlock[] {
  return blocks.map((block) => ({ ...block }));
}

function normalizeTargetPaceMin(value?: number | null): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, +value.toFixed(2));
}

function normalizeTargetPaceMax(value?: number | null): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, +value.toFixed(2));
}

function normalizeBlock(block: TiroBlock): TiroBlock {
  const stepType = block.stepType;
  const durationType = block.durationType;
  const repeatCount = stepType === 'run' ? Math.max(1, Math.round(block.repeatCount ?? DEFAULT_REPEAT_COUNT)) : 1;
  const durationValue = Math.max(1, Math.round(block.durationValue || (stepType === 'warmup' || stepType === 'cooldown' ? DEFAULT_WARMUP_SECONDS : DEFAULT_REST_SECONDS)));

  return {
    ...block,
    stepType,
    durationType,
    repeatCount,
    durationValue,
    targetPaceMin: normalizeTargetPaceMin(block.targetPaceMin),
    targetPaceMax: normalizeTargetPaceMax(block.targetPaceMax),
    name: block.name?.trim() || defaultNameForStep(stepType),
  };
}

function defaultNameForStep(stepType: TiroStepType): string {
  switch (stepType) {
    case 'warmup': return 'Aquecimento';
    case 'run': return 'Tiro';
    case 'rest': return 'Recuperacao';
    case 'cooldown': return 'Desaquecimento';
    default: return 'Bloco';
  }
}

function expandWorkoutBlocks(blocks: TiroBlock[]): TiroExecutionBlock[] {
  const normalized = blocks.map(normalizeBlock);
  const expanded: TiroExecutionBlock[] = [];

  for (let idx = 0; idx < normalized.length; idx += 1) {
    const block = normalized[idx];

    // Garmin flow: when run is followed by rest, repeat the pair N times.
    if (block.stepType === 'run') {
      const repeatTotal = Math.max(1, block.repeatCount ?? DEFAULT_REPEAT_COUNT);
      const nextBlock = normalized[idx + 1];
      const hasPairedRest = nextBlock?.stepType === 'rest';

      for (let repeatIndex = 1; repeatIndex <= repeatTotal; repeatIndex += 1) {
        expanded.push({
          ...block,
          executionIndex: expanded.length,
          repeatIndex,
          repeatTotal,
        });

        if (hasPairedRest) {
          expanded.push({
            ...nextBlock,
            executionIndex: expanded.length,
            repeatIndex,
            repeatTotal,
          });
        }
      }

      if (hasPairedRest) {
        idx += 1;
      }

      continue;
    }

    expanded.push({
      ...block,
      executionIndex: expanded.length,
      repeatIndex: 1,
      repeatTotal: 1,
    });
  }

  return expanded;
}

export function useTiroWorkout() {
  const [blocks, setBlocks] = useState<TiroBlock[]>(() => buildDefaultBlocks());
  const [executionBlocks, setExecutionBlocks] = useState<TiroExecutionBlock[]>(() => expandWorkoutBlocks(buildDefaultBlocks()));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [referencePaceMinKm, setReferencePaceMinKm] = useState(DEFAULT_REF_PACE);
  const [telemetry, setTelemetry] = useState<TiroTelemetryInput>({
    currentDistanceM: 0,
    currentPaceMinKm: 0,
    currentElapsedSeconds: 0,
  });
  const [summary, setSummary] = useState<TiroWorkoutSummary | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blocksRef = useRef(blocks);
  const executionBlocksRef = useRef(executionBlocks);
  const currentIndexRef = useRef(0);
  const timeLeftRef = useRef(0);
  const telemetryRef = useRef(telemetry);
  const referencePaceRef = useRef(referencePaceMinKm);
  const paceAlertCooldownRef = useRef(0);
  const lastPaceCheckRef = useRef(0);
  const templateStartElapsedRef = useRef(0);
  const templateStartDistanceRef = useRef(0);
  const blockStartElapsedRef = useRef(0);
  const blockStartDistanceRef = useRef(0);
  const currentBlockDistanceRef = useRef(0);
  const blockDistanceAccumulatedRef = useRef(0);
  const totalDistanceAccumulatedRef = useRef(0);
  const blocksCompletedRef = useRef(0);
  const repeatBlocksCompletedRef = useRef(0);
  const repeatTotalRef = useRef(0);

  useEffect(() => {
    blocksRef.current = blocks;
    executionBlocksRef.current = executionBlocks;
  }, [blocks, executionBlocks]);

  useEffect(() => {
    referencePaceRef.current = referencePaceMinKm;
  }, [referencePaceMinKm]);

  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const rebuildExecution = useCallback((nextBlocks: TiroBlock[]) => {
    const normalized = nextBlocks.map(normalizeBlock);
    setBlocks(normalized);
    setExecutionBlocks(expandWorkoutBlocks(normalized));
  }, []);

  const resetCounters = useCallback(() => {
    blocksCompletedRef.current = 0;
    repeatBlocksCompletedRef.current = 0;
    repeatTotalRef.current = executionBlocksRef.current.filter((block) => block.stepType === 'run').length;
    paceAlertCooldownRef.current = 0;
    lastPaceCheckRef.current = 0;
    blockDistanceAccumulatedRef.current = 0;
    totalDistanceAccumulatedRef.current = 0;
    blockStartElapsedRef.current = 0;
    blockStartDistanceRef.current = 0;
    currentBlockDistanceRef.current = 0;
    templateStartElapsedRef.current = telemetryRef.current.currentElapsedSeconds;
    templateStartDistanceRef.current = telemetryRef.current.currentDistanceM;
  }, []);

  const clearStateToIdle = useCallback(() => {
    clearTimer();
    setRunning(false);
    setPaused(false);
    setWaitingOpen(false);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setTimeLeft(0);
    timeLeftRef.current = 0;
    setSummary(null);
  }, [clearTimer]);

  const announceBlock = useCallback((index: number) => {
    const block = executionBlocksRef.current[index];
    if (!block) return;

    const currentRepeat = block.stepType === 'run'
      ? `${block.repeatIndex} de ${block.repeatTotal}`
      : '';
    const paceLabel = block.targetPaceMin && block.targetPaceMax
      ? `pace ${formatPace(block.targetPaceMin)} a ${formatPace(block.targetPaceMax)}`
      : '';

    if (block.stepType === 'warmup') {
      speak('Aquecimento iniciado. Pressione Próximo quando estiver pronto.');
      return;
    }

    if (block.stepType === 'cooldown') {
      speak('Desaquecimento iniciado. Pressione Próximo quando estiver pronto.');
      return;
    }

    if (block.stepType === 'rest') {
      if (block.durationType === 'open') {
        speak('Recuperação aberta. Pressione Próximo quando estiver pronto.');
        return;
      }

      if (block.durationType === 'distancia') {
        speak(`Recuperação. ${block.durationValue} metros.`);
        return;
      }

      speak(`Recuperação. ${block.durationValue} segundos.`);
      return;
    }

    if (block.stepType === 'run') {
      const durationText = block.durationType === 'distancia'
        ? `${block.durationValue} metros`
        : block.durationType === 'tempo'
          ? `${block.durationValue} segundos`
          : 'até pressionar Próximo';
      const paceText = paceLabel
        ? `Corra ${durationText} em ${paceLabel}.`
        : `Corra ${durationText}.`;
      const prefix = `Tiro ${currentRepeat}. `;
      speak(`${prefix}${paceText}`.trim(), { priority: 'high' });
    }
  }, []);

  const finishWorkout = useCallback(() => {
    const finalElapsed = Math.max(0, telemetryRef.current.currentElapsedSeconds - templateStartElapsedRef.current);
    clearTimer();
    setRunning(false);
    setPaused(false);
    setWaitingOpen(false);
    setTimeLeft(0);
    timeLeftRef.current = 0;
    currentIndexRef.current = 0;
    setCurrentIndex(0);

    const totalDistanceM = Math.max(
      totalDistanceAccumulatedRef.current,
      telemetryRef.current.currentDistanceM - templateStartDistanceRef.current
    );
    const averageTiroPace = repeatBlocksCompletedRef.current > 0 && blockDistanceAccumulatedRef.current > 0
      ? (finalElapsed / 60) / (blockDistanceAccumulatedRef.current / 1000)
      : 0;

    setSummary({
      templateName: 'Treino de tiro',
      blocksCompleted: blocksCompletedRef.current,
      repeatBlocksCompleted: repeatBlocksCompletedRef.current,
      totalDistanceM,
      totalElapsedSeconds: finalElapsed,
      averageTiroPace,
    });

    speak('Treino concluído. Bom trabalho.');
  }, [clearTimer]);

  const startCurrentBlock = useCallback((index: number) => {
    const block = executionBlocksRef.current[index];
    if (!block) {
      finishWorkout();
      return;
    }

    currentIndexRef.current = index;
    setCurrentIndex(index);
    setWaitingOpen(block.durationType === 'open');

    blockStartElapsedRef.current = telemetryRef.current.currentElapsedSeconds;
    blockStartDistanceRef.current = telemetryRef.current.currentDistanceM;
    currentBlockDistanceRef.current = 0;
    paceAlertCooldownRef.current = 0;

    announceBlock(index);

    if (block.durationType === 'open') {
      setTimeLeft(0);
      timeLeftRef.current = 0;
      return;
    }

    const durationSeconds = block.durationType === 'distancia'
      ? Math.max(1, Math.round((block.durationValue * Math.max(referencePaceRef.current || DEFAULT_REF_PACE, 2.5) * 60) / 1000))
      : Math.max(1, Math.round(block.durationValue));

    setTimeLeft(durationSeconds);
    timeLeftRef.current = durationSeconds;
  }, [announceBlock, finishWorkout]);

  const advanceBlock = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    const currentBlock = executionBlocksRef.current[currentIndexRef.current];
    const currentBlockDistance = Math.max(0, telemetryRef.current.currentDistanceM - blockStartDistanceRef.current);
    totalDistanceAccumulatedRef.current += currentBlockDistance;

    if (currentBlock?.stepType === 'run') {
      repeatBlocksCompletedRef.current += 1;
      blockDistanceAccumulatedRef.current += currentBlockDistance;
    }

    blocksCompletedRef.current += 1;

    if (nextIndex >= executionBlocksRef.current.length) {
      finishWorkout();
      return;
    }

    startCurrentBlock(nextIndex);
  }, [finishWorkout, startCurrentBlock]);

  const tick = useCallback(() => {
    const block = executionBlocksRef.current[currentIndexRef.current];
    if (!block || !running || paused) return;

    if (block.durationType === 'open') {
      return;
    }

    const nextTime = timeLeftRef.current - 1;
    timeLeftRef.current = nextTime;
    setTimeLeft(nextTime);

    if (nextTime === COUNTDOWN_SECONDS) speak('Três');
    if (nextTime === COUNTDOWN_SECONDS - 1) speak('Dois');
    if (nextTime === COUNTDOWN_SECONDS - 2) speak('Um');

    if (block.durationType === 'distancia') {
      const currentDistanceDelta = Math.max(0, telemetryRef.current.currentDistanceM - blockStartDistanceRef.current);
      currentBlockDistanceRef.current = currentDistanceDelta;

      if (currentDistanceDelta >= block.durationValue) {
        advanceBlock();
        return;
      }
    }

    if (nextTime < 0) {
      advanceBlock();
    }
  }, [advanceBlock, paused, running]);

  const startWorkout = useCallback(() => {
    if (executionBlocksRef.current.length === 0) return;

    resetCounters();
    clearTimer();
    setRunning(true);
    setPaused(false);
    setSummary(null);
    startCurrentBlock(0);

    timerRef.current = setInterval(tick, 1000);
  }, [clearTimer, resetCounters, startCurrentBlock, tick]);

  const pauseWorkout = useCallback(() => {
    if (!running) return;
    clearTimer();
    setPaused(true);
    setRunning(false);
  }, [clearTimer, running]);

  const resumeWorkout = useCallback(() => {
    if (!paused || executionBlocksRef.current.length === 0) return;

    setRunning(true);
    setPaused(false);
    timerRef.current = setInterval(tick, 1000);
  }, [paused, tick]);

  const stopWorkout = useCallback(() => {
    clearTimer();
    setRunning(false);
    setPaused(false);
    setWaitingOpen(false);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setTimeLeft(0);
    timeLeftRef.current = 0;
    window.speechSynthesis?.cancel?.();
  }, [clearTimer]);

  const nextBlock = useCallback(() => {
    const block = executionBlocksRef.current[currentIndexRef.current];
    if (!block) return;

    if (block.durationType === 'open') {
      advanceBlock();
      return;
    }

    advanceBlock();
  }, [advanceBlock]);

  const resetWorkout = useCallback(() => {
    stopWorkout();
    const defaults = buildDefaultBlocks();
    rebuildExecution(defaults);
    setReferencePaceMinKm(DEFAULT_REF_PACE);
    setSummary(null);
  }, [rebuildExecution, stopWorkout]);

  const addBlock = useCallback(() => {
    setBlocks((current) => {
      const next: TiroBlock[] = [
        ...cloneBlocks(current),
        {
          id: createId('block'),
          stepType: 'run',
          durationType: 'distancia',
          name: 'Novo tiro',
          durationValue: DEFAULT_TIRO_DISTANCE_M,
          targetPaceMin: DEFAULT_TARGET_PACE_MIN,
          targetPaceMax: DEFAULT_TARGET_PACE_MAX,
          repeatCount: 1,
        } as TiroBlock,
      ];
      setExecutionBlocks(expandWorkoutBlocks(next));
      return next;
    });
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<TiroBlock>) => {
    setBlocks((current) => {
      const next = current.map((block) => (block.id === id ? normalizeBlock({ ...block, ...patch }) : block));
      setExecutionBlocks(expandWorkoutBlocks(next));
      return next;
    });
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((current) => {
      const next = current.filter((block) => block.id !== id);
      const safeNext = next.length > 0 ? next : buildDefaultBlocks();
      setExecutionBlocks(expandWorkoutBlocks(safeNext));
      return safeNext;
    });
  }, []);

  const updateTelemetry = useCallback((input: TiroTelemetryInput) => {
    telemetryRef.current = input;
    setTelemetry(input);

    const block = executionBlocksRef.current[currentIndexRef.current];
    if (!block || !running || paused) return;

    if (block.durationType === 'distancia') {
      const currentDistanceDelta = Math.max(0, input.currentDistanceM - blockStartDistanceRef.current);
      currentBlockDistanceRef.current = currentDistanceDelta;
      if (currentDistanceDelta >= block.durationValue) {
        advanceBlock();
        return;
      }
    }

    if (block.targetPaceMin && block.targetPaceMax && input.currentPaceMinKm > 0) {
      const now = Date.now();
      if (now - lastPaceCheckRef.current < PACE_CHECK_INTERVAL_MS) {
        return;
      }
      lastPaceCheckRef.current = now;

      if (now - paceAlertCooldownRef.current >= PACE_ALERT_COOLDOWN_MS) {
        if (input.currentPaceMinKm > block.targetPaceMax) {
          speak('Acelere, voce esta abaixo da zona de pace', { priority: 'normal' });
          paceAlertCooldownRef.current = now;
        } else if (input.currentPaceMinKm < block.targetPaceMin) {
          speak('Reduza o ritmo, voce esta acima da zona de pace', { priority: 'normal' });
          paceAlertCooldownRef.current = now;
        }
      }
    }
  }, [advanceBlock, paused, running]);

  const activeBlock = executionBlocks[currentIndex] ?? executionBlocks[0] ?? null;

  const currentRepeatLabel = activeBlock?.stepType === 'run'
    ? `Tiro ${activeBlock.repeatIndex} de ${activeBlock.repeatTotal}`
    : null;

  const paceZoneLabel = activeBlock?.targetPaceMin && activeBlock?.targetPaceMax
    ? `alvo ${formatPace(activeBlock.targetPaceMin)} – ${formatPace(activeBlock.targetPaceMax)}`
    : null;

  const paceInZone = Boolean(
    activeBlock?.targetPaceMin &&
    activeBlock?.targetPaceMax &&
    telemetry.currentPaceMinKm > 0 &&
    telemetry.currentPaceMinKm >= activeBlock.targetPaceMin &&
    telemetry.currentPaceMinKm <= activeBlock.targetPaceMax
  );

  const activeBlockRemainingDistance = activeBlock?.durationType === 'distancia'
    ? Math.max(0, activeBlock.durationValue - currentBlockDistanceRef.current)
    : 0;

  const activeBlockRemainingText = activeBlock?.durationType === 'distancia'
    ? `${Math.max(0, Math.ceil(activeBlockRemainingDistance))} m`
    : timeLeft > 0
      ? formatSeconds(timeLeft)
      : activeBlock?.durationType === 'open'
        ? 'PRONTO'
        : formatSeconds(timeLeft);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const sessionSummary = useMemo(() => summary, [summary]);
  const clearSummary = useCallback(() => setSummary(null), []);

  return {
    blocks,
    executionBlocks,
    activeBlock,
    currentIndex,
    currentRepeatLabel,
    paceZoneLabel,
    paceInZone,
    activeBlockRemainingText,
    timeLeft,
    timeLeftText: formatSeconds(timeLeft),
    running,
    paused,
    waitingOpen,
    referencePaceMinKm,
    setReferencePaceMinKm,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    stopWorkout,
    nextBlock,
    resetWorkout,
    addBlock,
    updateBlock,
    removeBlock,
    updateTelemetry,
    sessionSummary,
    clearSummary,
  };
}
