import React from 'react';
import './Processing.css';

const STEPS = [
  { threshold: 0, label: 'Mix laden…' },
  { threshold: 20, label: 'Frequentieanalyse uitvoeren…' },
  { threshold: 40, label: 'Overgangen detecteren…' },
  { threshold: 60, label: 'Segmenten fingerprinting…' },
  { threshold: 80, label: 'Nummers matchen…' },
  { threshold: 95, label: 'Tracklist samenstellen…' },
];

function currentStep(progress) {
  let step = STEPS[0];
  for (const s of STEPS) {
    if (progress >= s.threshold) step = s;
  }
  return step;
}

export default function Processing({ progress, source }) {
  const step = currentStep(progress);

  return (
    <div className="processing">
      <div className="processing-vinyl" aria-hidden="true">
        <div className="vinyl">
          <div className="vinyl-inner" />
          <div className="vinyl-label" />
        </div>
      </div>

      <div className="processing-info">
        <h2>Analyseren…</h2>
        <p className="processing-source">{source?.name}</p>

        <div className="progress-bar-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-pct">{progress}%</span>
        </div>

        <p className="processing-step">{step.label}</p>
      </div>
    </div>
  );
}
