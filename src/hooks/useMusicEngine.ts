import { useState, useRef } from 'react';

export function useMusicEngine() {
  const [data, setData] = useState({
    status: 'idle',
    hasAudioBuffer: false,
    bpm: 160,
    targetCadence: 0,
    targetPace: 0,
    playbackRate: 1,
  });

  const currentRate = useRef(1);

  const tick = (spm: number, stride: number) => {
    if (spm <= 0) return;

    const targetCadence = data.bpm;
    const desiredRate = targetCadence / spm;

    // 🔥 correção final
    const newRate =
      currentRate.current +
      (desiredRate - currentRate.current) * 0.3;

    currentRate.current = newRate;

    const pace = 1000 / (targetCadence * stride);

    setData(d => ({
      ...d,
      playbackRate: newRate,
      targetCadence,
      targetPace: pace,
    }));
  };

  return { data, tick };
}