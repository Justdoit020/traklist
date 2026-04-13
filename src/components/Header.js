import React from 'react';
import './Header.css';

export default function Header({ mode, onModeChange }) {
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

        <nav className="header-nav" role="navigation">
          <button
            className={`header-nav-btn${mode === 'detect' ? ' active' : ''}`}
            onClick={() => onModeChange('detect')}
          >
            DJ Detection
          </button>
          <button
            className={`header-nav-btn${mode === 'spotify' ? ' active' : ''}`}
            onClick={() => onModeChange('spotify')}
          >
            <SpotifyIcon />
            Spotify Downloader
          </button>
        </nav>
      </div>
    </header>
  );
}

function SpotifyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1db954" />
      <path d="M17.5 16.5c-.2 0-.4-.05-.55-.17-2.1-1.28-4.73-1.57-7.83-.86-.3.07-.6-.11-.67-.41-.07-.3.11-.6.41-.67 3.4-.78 6.32-.45 8.66 1 .27.16.35.51.19.77-.1.2-.3.34-.21.34zm1.1-2.8c-.25 0-.5-.07-.68-.22-2.42-1.48-6.1-1.91-8.96-1.04-.36.1-.74-.1-.85-.46-.1-.36.1-.74.46-.85 3.26-.99 7.3-.5 10.07 1.2.31.19.41.58.22.89-.13.21-.35.48-.26.48zm.1-2.9c-.29 0-.58-.08-.79-.26-2.82-1.67-7.47-1.83-10.16-.96-.41.12-.85-.1-.97-.51-.12-.41.1-.85.51-.97 3.13-.95 8.27-.76 11.55 1.13.36.21.48.67.27 1.03-.15.26-.37.54-.41.54z" fill="white" />
    </svg>
  );
}
