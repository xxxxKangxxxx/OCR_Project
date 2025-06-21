import React from 'react';
import './CircularProgress.css';

const CircularProgress = ({ progress }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="circular-progress-container">
      <svg className="circular-progress" width="100" height="100">
        <circle
          className="circular-progress-background"
          cx="50"
          cy="50"
          r={radius}
          strokeWidth="10"
        />
        <circle
          className="circular-progress-bar"
          cx="50"
          cy="50"
          r={radius}
          strokeWidth="10"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset
          }}
        />
      </svg>
      <div className="circular-progress-text">{Math.round(progress)}%</div>
    </div>
  );
};

export default CircularProgress; 