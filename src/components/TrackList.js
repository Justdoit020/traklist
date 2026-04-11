import React, { useState } from 'react';
import { formatTime } from '../App';
import './TrackList.css';

export default function TrackList({ tracks, source, onReset }) {
  const [copied, setCopied] = useState(false);
  const [library, setLibrary] = useState(null);
  const [libraryError, setLibraryError] = useState('');
  const [isScanningLibrary, setIsScanningLibrary] = useState(false);

  const totalDuration = tracks.length ? tracks[tracks.length - 1].endSec : 0;
  const genreGroups = buildGenreGroups(library?.tracks || []);

  const exportText = tracks
    .map((t) => `${String(t.id).padStart(2, '0')}. [${formatTime(t.startSec)}] ${t.artist} – ${t.title}`)
    .join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = exportText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = () => {
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tracklist.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenLibrary = async () => {
    if (!window.electronAPI?.openMusicFolder || !window.electronAPI?.scanLibrary) {
      setLibraryError('Muziekbibliotheek scannen werkt alleen in de desktop app.');
      return;
    }

    setLibraryError('');
    setIsScanningLibrary(true);
    try {
      const folderPath = await window.electronAPI.openMusicFolder();
      if (!folderPath) return;
      const result = await window.electronAPI.scanLibrary(folderPath);
      setLibrary(result);
      if (!result.tracks.length) {
        setLibraryError('Geen ondersteunde audiobestanden gevonden in deze map.');
      }
    } catch {
      setLibraryError('Scannen mislukt. Probeer een andere map.');
    } finally {
      setIsScanningLibrary(false);
    }
  };

  const handleExportGenrePlaylist = (genre, genreTracks) => {
    const m3uBody = genreTracks
      .map((track) => {
        const duration = track.durationSec || -1;
        const artist = track.artist || 'Onbekende artiest';
        const title = track.title || track.fileName;
        return `#EXTINF:${duration},${artist} - ${title}\n${track.filePath}`;
      })
      .join('\n');

    const blob = new Blob([`#EXTM3U\n${m3uBody}`], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeGenre = genre.toLowerCase().replace(/[^a-z0-9-_]/gi, '_');
    a.href = url;
    a.download = `playlist-${safeGenre}.m3u`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tracklist">
      <div className="tracklist-header">
        <div className="tracklist-meta">
          <h2>Tracklist</h2>
          <div className="tracklist-stats">
            <span className="stat">{tracks.length} nummers</span>
            <span className="stat-sep">·</span>
            <span className="stat">{formatTime(totalDuration)}</span>
            <span className="stat-sep">·</span>
            <span className="stat source-name" title={source?.name}>{source?.name}</span>
          </div>
        </div>
        <div className="tracklist-actions">
          <button className="btn-icon" onClick={handleCopy} title="Kopieer tracklist">
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span>{copied ? 'Gekopieerd' : 'Kopieer'}</span>
          </button>
          <button className="btn-icon" onClick={handleExport} title="Exporteer als .txt">
            <DownloadIcon />
            <span>Exporteer</span>
          </button>
          <button className="btn-secondary" onClick={onReset}>
            Nieuwe analyse
          </button>
        </div>
      </div>

      <div className="track-table" role="list">
        {tracks.map((track) => (
          <TrackRow key={track.id} track={track} totalDuration={totalDuration} />
        ))}

        <section className="library-panel" aria-label="Muziekbibliotheek">
          <div className="library-panel-header">
            <div>
              <h3>Muziekbibliotheek</h3>
              <p>Importeer je volledige muziekbieb en analyseer ID-tags zoals genre, BPM en key.</p>
            </div>
            <button
              className="btn-primary"
              onClick={handleOpenLibrary}
              disabled={isScanningLibrary}
            >
              {isScanningLibrary ? 'Scannen…' : 'Open muziekbieb'}
            </button>
          </div>

          {libraryError && <p className="library-error">{libraryError}</p>}

          {library && (
            <div className="library-results">
              <div className="library-stats">
                <span>{library.tracks.length} gescand</span>
                <span>{Math.max(library.totalFiles - library.tracks.length, 0)} mislukt</span>
                <span title={library.folderPath}>{library.folderPath}</span>
              </div>

              {!!genreGroups.length && (
                <div className="genre-playlists">
                  <h4>Playlists op basis van genre</h4>
                  <div className="genre-grid">
                    {genreGroups.map((group) => (
                      <div className="genre-card" key={group.genre}>
                        <div className="genre-card-meta">
                          <span className="genre-name">{group.genre}</span>
                          <span className="genre-count">{group.tracks.length} tracks</span>
                        </div>
                        <button
                          className="btn-secondary"
                          onClick={() => handleExportGenrePlaylist(group.genre, group.tracks)}
                        >
                          Exporteer playlist
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!library.tracks.length && (
                <div className="library-track-table" role="list">
                  {library.tracks.slice(0, 250).map((track) => (
                    <LibraryTrackRow key={track.filePath} track={track} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function buildGenreGroups(tracks) {
  const byGenre = new Map();
  tracks.forEach((track) => {
    const genre = track.genre || 'Onbekend';
    if (!byGenre.has(genre)) byGenre.set(genre, []);
    byGenre.get(genre).push(track);
  });

  return Array.from(byGenre.entries())
    .map(([genre, genreTracks]) => ({ genre, tracks: genreTracks }))
    .sort((a, b) => b.tracks.length - a.tracks.length);
}

function LibraryTrackRow({ track }) {
  return (
    <div className="library-track-row" role="listitem">
      <div className="library-track-main">
        <span className="library-track-title">{track.artist} - {track.title}</span>
        <span className="library-track-file" title={track.filePath}>{track.fileName}</span>
      </div>
      <div className="library-track-tags">
        <Tag text={track.genre || 'Onbekend genre'} />
        {track.bpm && <Tag text={`${track.bpm} BPM`} />}
        {track.key && <Tag text={track.key} />}
        {track.album && <Tag text={track.album} />}
      </div>
    </div>
  );
}

function Tag({ text }) {
  return <span className="library-tag">{text}</span>;
}

function TrackRow({ track, totalDuration }) {
  const startPct = (track.startSec / totalDuration) * 100;
  const widthPct = ((track.endSec - track.startSec) / totalDuration) * 100;
  const confidence = Math.round(track.confidence * 100);

  return (
    <div className="track-row" role="listitem">
      <span className="track-num">{track.id}</span>
      <div className="track-main">
        <div className="track-identity">
          <span className="track-artist">{track.artist}</span>
          <span className="track-title">{track.title}</span>
          {track.label && <span className="track-label">{track.label}</span>}
        </div>
        <div className="track-timeline-bar">
          <div
            className="track-timeline-fill"
            style={{ left: `${startPct}%`, width: `${widthPct}%` }}
          />
        </div>
      </div>
      <div className="track-meta">
        <span className="track-time">{formatTime(track.startSec)}</span>
        {track.bpm && <span className="track-bpm">{track.bpm} BPM</span>}
        <span
          className={`track-confidence ${confidence >= 90 ? 'high' : confidence >= 75 ? 'mid' : 'low'}`}
          title={`${confidence}% zekerheid`}
        >
          {confidence}%
        </span>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
