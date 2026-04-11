import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-drag-region" />
      <div className="header-content">
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="13" stroke="#7c6af7" strokeWidth="2" />
            <circle cx="14" cy="14" r="7" stroke="#7c6af7" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="2.5" fill="#7c6af7" />
            <path d="M14 1 Q21 7 21 14 Q21 21 14 27" stroke="#a89cf7" strokeWidth="1" fill="none" opacity="0.5" />
          </svg>
          <span className="logo-text">TrackList</span>
        </div>
        <span className="header-badge">DJ Set Detection</span>
      </div>
    </header>
  );
}
