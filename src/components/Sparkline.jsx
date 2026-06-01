import React from 'react';

// A small, dependency-free trend line. Pure function of its props.
const Sparkline = ({ points = [], width = 120, height = 32, className }) => {
  if (!points || points.length === 0) {
    return <svg className={className} width={width} height={height} aria-hidden="true" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const n = points.length;

  const coords = points.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y = max === min ? height / 2 : height - ((v - min) / (max - min)) * height;
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
  });

  const line = coords.join(' ');
  const lastX = n === 1 ? width / 2 : width;
  const area = `0,${height} ${line} ${lastX},${height}`;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={area} fill="var(--accent-dim)" stroke="none" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
};

export default Sparkline;
