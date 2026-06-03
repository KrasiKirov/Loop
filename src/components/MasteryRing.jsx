import React from 'react';

// A compact circular progress ring for a pattern's mastery (0..1).
const MasteryRing = ({ value = 0, size = 44, stroke = 4 }) => {
  const pct = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <svg width={size} height={size} className="mastery-ring" aria-label={`${Math.round(pct * 100)}% mastery`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--border)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--accent)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fontSize={size * 0.28} fill="var(--text)" fontWeight="600"
      >
        {Math.round(pct * 100)}
      </text>
    </svg>
  );
};

export default MasteryRing;
