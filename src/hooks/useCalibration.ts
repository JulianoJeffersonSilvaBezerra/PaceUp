import { useState, useRef } from 'react';

export function useCalibration() {
  const [data, setData] = useState({
    status: 'idle',
    strideM: 1.1,
    sessionCount: 0,
  });

  const startSteps = useRef(0);
  const startDist = useRef(0);

  const startCalibration = (steps: number, dist: number) => {
    startSteps.current = steps;
    startDist.current = dist;
    setData(d => ({ ...d, status: 'running' }));
  };

  const finishCalibration = (steps: number, dist: number) => {
    const deltaSteps = steps - startSteps.current;
    const deltaDist = dist - startDist.current;

    if (deltaSteps > 0) {
      const stride = deltaDist / deltaSteps;

      setData(d => ({
        status: 'idle',
        strideM: stride,
        sessionCount: d.sessionCount + 1,
      }));
    }
  };

  const reset = () => {
    setData({
      status: 'idle',
      strideM: 1.1,
      sessionCount: 0,
    });
  };

  return { data, startCalibration, finishCalibration, reset };
}