import React, { useState, useEffect } from 'react';
import './SpotifyPanel.css';

function isSpotifyPlaylistUrl(url) {
  return /spotify\.com\/playlist\/[a-zA-Z0-9]+/.test(url);
}

export default function SpotifyPanel({ onResult }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [error, setError] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // Load saved credentials from the main process (encrypted via safeStorage)
  useEffect(() => {
    if (!window.electronAPI?.loadSpotifyCredentials) {
      setShowCredentials(true);
      return;
    }
    window.electronAPI.loadSpotifyCredentials().then(({ clientId: id, clientSecret: secret }) => {
      setClientId(id);
      setClientSecret(secret);
      if (!id || !secret) setShowCredentials(true);
    }).catch(() => setShowCredentials(true));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUrlError(false);

    const url = playlistUrl.trim();

    if (!clientId.trim()) { setError('Voer je Spotify Client ID in.'); return; }
    if (!clientSecret.trim()) { setError('Voer je Spotify Client Secret in.'); return; }
    if (!url) { setError('Voer een Spotify playlist URL in.'); setUrlError(true); return; }
    if (!isSpotifyPlaylistUrl(url)) { setError('Geen geldige Spotify playlist URL.'); setUrlError(true); return; }

    if (!window.electronAPI?.fetchSpotifyPlaylist) {
      setError('Spotify ophalen werkt alleen in de desktop app.');
      return;
    }

    // Persist credentials securely before fetching
    try {
      await window.electronAPI.saveSpotifyCredentials({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });
    } catch {
      // Non-fatal: credentials will not be saved, but fetch can still proceed
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.fetchSpotifyPlaylist({
        playlistUrl: url,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });
      onResult(result);
    } catch (err) {
      setError(err.message || 'Er is een fout opgetreden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="spotify-panel" onSubmit={handleSubmit} noValidate>
      <label htmlFor="spotify-url" className="spotify-label">
        Spotify Playlist URL
      </label>
      <input
        id="spotify-url"
        type="text"
        className={`spotify-input ${urlError ? 'error' : ''}`}
        placeholder="https://open.spotify.com/playlist/…"
        value={playlistUrl}
        onChange={(e) => { setPlaylistUrl(e.target.value); setError(''); setUrlError(false); }}
        autoComplete="off"
        spellCheck={false}
        disabled={loading}
      />

      <button
        type="button"
        className="spotify-credentials-toggle"
        onClick={() => setShowCredentials((v) => !v)}
      >
        <SpotifyIcon />
        {showCredentials ? 'Verberg API-instellingen' : 'API-instellingen'}{' '}
        <span className="spotify-chevron">{showCredentials ? '▲' : '▼'}</span>
      </button>

      {showCredentials && (
        <div className="spotify-credentials">
          <p className="spotify-credentials-hint">
            Maak een app aan op{' '}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
              developer.spotify.com/dashboard
            </a>{' '}
            om je Client ID en Client Secret te krijgen.
          </p>
          <div className="spotify-field-row">
            <label htmlFor="spotify-client-id" className="spotify-field-label">Client ID</label>
            <input
              id="spotify-client-id"
              type="text"
              className="spotify-cred-input"
              placeholder="Client ID"
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setError(''); }}
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
            />
          </div>
          <div className="spotify-field-row">
            <label htmlFor="spotify-client-secret" className="spotify-field-label">Client Secret</label>
            <input
              id="spotify-client-secret"
              type="password"
              className="spotify-cred-input"
              placeholder="Client Secret"
              value={clientSecret}
              onChange={(e) => { setClientSecret(e.target.value); setError(''); }}
              autoComplete="off"
              disabled={loading}
            />
          </div>
        </div>
      )}

      {error && <span className="spotify-error" role="alert">{error}</span>}

      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Ophalen…' : 'Haal playlist op'}
      </button>
    </form>
  );
}

function SpotifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 1 1-.277-1.215c3.809-.87 7.076-.496 9.712 1.115.294.18.387.563.207.857zm1.224-2.724a.779.779 0 0 1-1.072.257C14.152 12.257 10.7 11.8 7.539 12.7a.779.779 0 0 1-.455-1.49c3.55-.998 7.366-.52 10.19 1.218a.779.779 0 0 1 .536 1.272zm.105-2.835c-3.223-1.914-8.54-2.09-11.617-1.156a.934.934 0 1 1-.543-1.788c3.532-1.073 9.404-.866 13.115 1.337a.934.934 0 0 1-.955 1.607z" />
    </svg>
  );
}
