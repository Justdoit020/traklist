import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './UploadZone.css';

const SUPPORTED_PLATFORMS = ['youtube.com', 'youtu.be', 'mixcloud.com', 'soundcloud.com'];

function isValidUrl(str) {
  try {
    const url = new URL(str.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSupportedPlatform(url) {
  try {
    const { hostname } = new URL(url.trim());
    return SUPPORTED_PLATFORMS.some((p) => hostname.endsWith(p));
  } catch {
    return false;
  }
}

export default function UploadZone({ onSubmit }) {
  const [tab, setTab] = useState('file'); // 'file' | 'url'
  const [urlValue, setUrlValue] = useState('');
  const [urlError, setUrlError] = useState('');
  const [droppedFile, setDroppedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setDroppedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.ogg'] },
    multiple: false,
    noClick: false,
  });

  const handleOpenFile = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.openFile();
      if (filePath) {
        const name = filePath.split('/').pop();
        onSubmit({ type: 'file', name, value: filePath });
      }
    }
  };

  const handleFileSubmit = () => {
    if (!droppedFile) return;
    onSubmit({ type: 'file', name: droppedFile.name, value: droppedFile.path || droppedFile.name });
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    const url = urlValue.trim();
    if (!url) { setUrlError('Voer een URL in.'); return; }
    if (!isValidUrl(url)) { setUrlError('Geen geldige URL.'); return; }
    if (!isSupportedPlatform(url)) {
      setUrlError('Alleen YouTube, Mixcloud en SoundCloud worden ondersteund.');
      return;
    }
    setUrlError('');
    onSubmit({ type: 'url', name: url, value: url });
  };

  return (
    <div className="upload-zone">
      <div className="upload-hero">
        <h1>Detecteer je DJ set tracklist</h1>
        <p>Upload een audiobestand of plak een link van YouTube, Mixcloud of SoundCloud. Het algoritme vindt automatisch elk nummer met tijdstempels.</p>
      </div>

      <div className="upload-card">
        <div className="tab-bar" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'file'}
            className={tab === 'file' ? 'tab active' : 'tab'}
            onClick={() => setTab('file')}
          >
            Audiobestand
          </button>
          <button
            role="tab"
            aria-selected={tab === 'url'}
            className={tab === 'url' ? 'tab active' : 'tab'}
            onClick={() => setTab('url')}
          >
            URL
          </button>
        </div>

        {tab === 'file' && (
          <div className="tab-panel">
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'drag-active' : ''} ${droppedFile ? 'has-file' : ''}`}
            >
              <input {...getInputProps()} />
              {droppedFile ? (
                <div className="drop-file-info">
                  <span className="drop-file-icon">🎵</span>
                  <span className="drop-file-name">{droppedFile.name}</span>
                  <span className="drop-file-size">{(droppedFile.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              ) : (
                <div className="drop-placeholder">
                  <DropIcon active={isDragActive} />
                  <span className="drop-title">{isDragActive ? 'Loslaten om te uploaden' : 'Sleep een bestand hierheen'}</span>
                  <span className="drop-sub">MP3, WAV, FLAC, AAC, M4A, OGG</span>
                </div>
              )}
            </div>

            <div className="file-actions">
              {window.electronAPI && (
                <button className="btn-secondary" onClick={handleOpenFile}>
                  Bladeren…
                </button>
              )}
              <button
                className="btn-primary"
                disabled={!droppedFile}
                onClick={handleFileSubmit}
              >
                Analyseer mix
              </button>
            </div>
          </div>
        )}

        {tab === 'url' && (
          <form className="tab-panel url-panel" onSubmit={handleUrlSubmit}>
            <label htmlFor="mix-url" className="url-label">
              Mix URL
            </label>
            <input
              id="mix-url"
              type="text"
              className={`url-input ${urlError ? 'error' : ''}`}
              placeholder="https://www.youtube.com/watch?v=..."
              value={urlValue}
              onChange={(e) => { setUrlValue(e.target.value); setUrlError(''); }}
              autoComplete="off"
              spellCheck={false}
            />
            {urlError && <span className="url-error" role="alert">{urlError}</span>}
            <div className="platform-badges">
              {['YouTube', 'Mixcloud', 'SoundCloud'].map((p) => (
                <span key={p} className="platform-badge">{p}</span>
              ))}
            </div>
            <button className="btn-primary" type="submit">
              Analyseer mix
            </button>
          </form>
        )}
      </div>

      <div className="feature-strip">
        <div className="feature-item">
          <span className="feature-icon">⚡</span>
          <span>Snelle verwerking</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🎯</span>
          <span>Exacte tijdstempels</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔍</span>
          <span>Slimme segmentatie</span>
        </div>
      </div>
    </div>
  );
}

function DropIcon({ active }) {
  return (
    <svg className={`drop-svg ${active ? 'drop-svg--active' : ''}`} width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1e1b2e" />
      <path d="M24 14v14M18 22l6-8 6 8" stroke="#7c6af7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 34h20" stroke="#7c6af7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
