import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SpotifyDownloader.css';

function msToMin(ms) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ onSaved }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI?.loadSpotifyCredentials().then((creds) => {
      if (creds) {
        setClientId(creds.clientId || '');
        setClientSecret(creds.clientSecret || '');
      }
    });
  }, []);

  const handleSave = async () => {
    await window.electronAPI?.saveSpotifyCredentials({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    if (onSaved) onSaved();
  };

  return (
    <div className="spotify-card">
      <h2>Spotify API-toegang</h2>
      <p className="spotify-info" style={{ marginBottom: 14 }}>
        Maak een gratis app aan op{' '}
        <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
          developer.spotify.com
        </a>{' '}
        en kopieer je <strong>Client ID</strong> en <strong>Client Secret</strong>.
      </p>
      <div className="settings-grid">
        <label>
          Client ID
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="32-karakter Client ID"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label>
          Client Secret
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="••••••••••••••••"
            autoComplete="off"
          />
        </label>
      </div>
      <div className="settings-actions">
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!clientId.trim() || !clientSecret.trim()}
        >
          Opslaan
        </button>
        {saved && <span className="settings-saved">✓ Opgeslagen</span>}
      </div>
    </div>
  );
}

// ─── Track status icons ───────────────────────────────────────────────────────

function TrackStatus({ status }) {
  if (status === 'done') return <span className="spotify-track-status status-done">✓</span>;
  if (status === 'error') return <span className="spotify-track-status status-error">✕</span>;
  if (status === 'downloading') {
    return (
      <span className="spotify-track-status">
        <span className="status-spinner" />
      </span>
    );
  }
  return <span className="spotify-track-status status-queued">–</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SpotifyDownloader() {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const [playlist, setPlaylist] = useState(null); // { name, owner, coverUrl, tracks[] }
  const [outputDir, setOutputDir] = useState('');

  const [trackStatuses, setTrackStatuses] = useState({}); // { [id]: 'queued'|'downloading'|'done'|'error' }
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const abortRef = useRef(false);
  const unsubscribeRef = useRef(null);

  // Subscribe to download progress events from main process
  useEffect(() => {
    if (window.electronAPI?.onDownloadProgress) {
      const unsub = window.electronAPI.onDownloadProgress(({ trackId }) => {
        setTrackStatuses((prev) => {
          const current = prev[trackId];
          if (current === 'done' || current === 'error') return prev;
          return { ...prev, [trackId]: 'downloading' };
        });
      });
      unsubscribeRef.current = unsub;
    }
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, []);

  const isValidSpotifyUrl = (url) => {
    try {
      const u = new URL(url.trim());
      return (u.hostname === 'open.spotify.com' || u.hostname === 'spotify.com') && u.pathname.includes('/playlist/');
    } catch {
      return false;
    }
  };

  const handleFetch = useCallback(async () => {
    const url = playlistUrl.trim();
    if (!url) { setUrlError('Voer een Spotify playlist-URL in.'); return; }
    if (!isValidSpotifyUrl(url)) {
      setUrlError('Voer een geldige Spotify playlist-URL in (bijv. https://open.spotify.com/playlist/…).');
      return;
    }
    setUrlError('');
    setFetchError('');
    setPlaylist(null);
    setTrackStatuses({});
    setIsFetching(true);
    try {
      const result = await window.electronAPI.fetchSpotifyPlaylist({ playlistUrl: url });
      setPlaylist(result);
      const statuses = {};
      result.tracks.forEach((t) => { statuses[t.id] = 'queued'; });
      setTrackStatuses(statuses);
    } catch (err) {
      setFetchError(err.message || 'Ophalen van playlist mislukt.');
    } finally {
      setIsFetching(false);
    }
  }, [playlistUrl]);

  const handleSelectFolder = async () => {
    const dir = await window.electronAPI?.selectFolder();
    if (dir) setOutputDir(dir);
  };

  const handleDownload = useCallback(async () => {
    if (!playlist || !outputDir) return;
    setIsDownloading(true);
    setDownloadError('');
    abortRef.current = false;

    const tracks = playlist.tracks;
    const initialStatuses = {};
    tracks.forEach((t) => { initialStatuses[t.id] = 'queued'; });
    setTrackStatuses(initialStatuses);

    for (const track of tracks) {
      if (abortRef.current) break;
      setTrackStatuses((prev) => ({ ...prev, [track.id]: 'downloading' }));
      try {
        await window.electronAPI.downloadSpotifyTrack({ track, outputDir });
        setTrackStatuses((prev) => ({ ...prev, [track.id]: 'done' }));
      } catch (err) {
        console.error(`Download mislukt voor "${track.title}":`, err);
        setTrackStatuses((prev) => ({ ...prev, [track.id]: 'error' }));
      }
    }

    setIsDownloading(false);
  }, [playlist, outputDir]);

  const handleStop = () => {
    abortRef.current = true;
    setIsDownloading(false);
  };

  const doneCount = Object.values(trackStatuses).filter((s) => s === 'done').length;
  const errorCount = Object.values(trackStatuses).filter((s) => s === 'error').length;
  const totalCount = playlist?.tracks?.length || 0;
  const progressPct = totalCount > 0 ? Math.round(((doneCount + errorCount) / totalCount) * 100) : 0;

  return (
    <div className="spotify-downloader">
      <div className="spotify-hero">
        <h1>Spotify Playlist Downloader</h1>
        <p>Haal de nummers op uit een publieke Spotify playlist en download ze als MP3 via YouTube.</p>
      </div>

      <SettingsPanel />

      {/* Playlist URL */}
      <div className="spotify-card">
        <h2>Playlist ophalen</h2>
        <div className="url-row">
          <input
            type="text"
            className={urlError ? 'error' : ''}
            placeholder="https://open.spotify.com/playlist/…"
            value={playlistUrl}
            onChange={(e) => { setPlaylistUrl(e.target.value); setUrlError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="btn-primary"
            onClick={handleFetch}
            disabled={isFetching || !playlistUrl.trim()}
          >
            {isFetching ? 'Ophalen…' : 'Ophalen'}
          </button>
        </div>
        {urlError && <span className="url-error">{urlError}</span>}
        {fetchError && <div className="spotify-error" style={{ marginTop: 12 }}>{fetchError}</div>}
      </div>

      {/* Playlist preview + download */}
      {playlist && (
        <div className="spotify-card">
          <div className="playlist-info">
            {playlist.coverUrl ? (
              <img className="playlist-cover" src={playlist.coverUrl} alt={playlist.name} />
            ) : (
              <div className="playlist-cover-placeholder">🎵</div>
            )}
            <div className="playlist-meta">
              <span className="playlist-name">{playlist.name}</span>
              {playlist.owner && <span className="playlist-owner">door {playlist.owner}</span>}
              <span className="playlist-count">{totalCount} nummers</span>
            </div>
          </div>

          {/* Output folder */}
          <div className="folder-row">
            <span className="folder-path">{outputDir || 'Geen map geselecteerd'}</span>
            <button className="btn-secondary" onClick={handleSelectFolder}>
              Kies map…
            </button>
          </div>

          {/* Download controls */}
          <div className="download-controls">
            {!isDownloading ? (
              <button
                className="btn-primary"
                onClick={handleDownload}
                disabled={!outputDir || totalCount === 0}
                style={{ background: '#1db954' }}
              >
                ↓ Download alle nummers
              </button>
            ) : (
              <button className="btn-secondary" onClick={handleStop}>
                Stop
              </button>
            )}
            {(doneCount > 0 || errorCount > 0) && (
              <div className="download-summary">
                <strong>{doneCount}</strong> gedownload
                {errorCount > 0 && <>, <strong style={{ color: '#f87171' }}>{errorCount}</strong> mislukt</>}
                {' '}van <strong>{totalCount}</strong>
              </div>
            )}
          </div>

          {downloadError && <div className="spotify-error" style={{ marginBottom: 12 }}>{downloadError}</div>}

          {/* Progress bar */}
          {(isDownloading || doneCount + errorCount > 0) && (
            <div className="overall-progress">
              <div className="overall-progress-bar">
                <div className="overall-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Track list */}
          <div className="spotify-track-list" style={{ marginTop: 16 }}>
            {playlist.tracks.map((track, idx) => (
              <div className="spotify-track-row" key={track.id}>
                <span className="spotify-track-num">{idx + 1}</span>
                <div className="spotify-track-main">
                  <div className="spotify-track-title">{track.title}</div>
                  <div className="spotify-track-artist">{track.artist}</div>
                </div>
                {track.durationMs && (
                  <span className="spotify-track-duration">{msToMin(track.durationMs)}</span>
                )}
                <TrackStatus status={trackStatuses[track.id] || 'queued'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
