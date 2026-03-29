import { useEffect } from 'react';
import { useStepCounter } from './hooks/useStepCounter';
import { useGPS, formatPace } from './hooks/useGPS';
import { useCalibration } from './hooks/useCalibration';
import { useMusicEngine } from './hooks/useMusicEngine';
import './App.css';

export default function App() {
  const steps = useStepCounter();
  const gps = useGPS();
  const cal = useCalibration();
  const music = useMusicEngine();

  useEffect(() => {
    const i = setInterval(() => {
      music.tick(steps.data.stepsPerMinute, cal.data.strideM);
    }, 5000);

    return () => clearInterval(i);
  }, [music, steps.data.stepsPerMinute, cal.data.strideM]);

  return (
    <div className="debug-screen">
      <h1>🚀 RunCadence</h1>

      <div className="block">
        <h2>Cadência</h2>
        <p>{steps.data.stepsPerMinute} spm</p>
        <small>Status: {steps.data.sensorStatus}</small>
      </div>

      <div className="block">
        <h2>Passos da sessão</h2>
        <p>{steps.data.sessionSteps}</p>
      </div>

      <div className="block">
        <h2>Pace GPS</h2>
        <p>{formatPace(gps.data.averagePace)}</p>
        <small>Status: {gps.data.status}</small>
      </div>

      <div className="block">
        <h2>Distância</h2>
        <p>{gps.data.smoothedDistance} m</p>
      </div>

      <div className="block">
        <h2>Pace Música</h2>
        <p>{formatPace(music.data.targetPace)}</p>
      </div>

      {steps.data.error && (
        <div className="block">
          <h2>Erro pedômetro</h2>
          <p>{steps.data.error}</p>
        </div>
      )}

      {gps.data.error && (
        <div className="block">
          <h2>Erro GPS</h2>
          <p>{gps.data.error}</p>
        </div>
      )}

      <button
        onClick={async () => {
          await steps.start();
          await gps.start();
        }}
      >
        Iniciar
      </button>

      <button
        onClick={async () => {
          await steps.stop();
          await gps.stop();
        }}
      >
        Parar
      </button>
    </div>
  );
}