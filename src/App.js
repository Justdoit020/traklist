import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import Processing from './components/Processing';
import TrackList from './components/TrackList';
import './App.css';

// Mock tracklist generator – vervang detectTrack() later door echte API-aanroep
function generateMockTracklist(sourceName) {
  const tracks = [
    { artist: 'Bicep', title: 'Glue', label: 'Feel My Bicep', bpm: 128 },
    { artist: 'Four Tet', title: 'Baby', label: 'Text Records', bpm: 124 },
    { artist: 'Floating Points', title: 'LesAlpx', label: 'Pluto', bpm: 130 },
    { artist: 'Jon Hopkins', title: 'Emerald Rush', label: 'Domino', bpm: 126 },
    { artist: 'Caribou', title: 'Can\'t Do Without You', label: 'City Slang', bpm: 122 },
    { artist: 'Moderat', title: 'Bad Kingdom', label: 'Monkeytown', bpm: 132 },
    { artist: 'Rival Consoles', title: 'Sonne', label: 'Erased Tapes', bpm: 128 },
    { artist: 'Stephan Bodzin', title: 'Strand', label: 'Herzblut', bpm: 135 },
  ];

  let currentSec = 0;
  return tracks.map((t, i) => {
    const durationSec = 240 + Math.floor(Math.random() * 180);
    const start = currentSec;
    currentSec += durationSec;
    return {
      id: i + 1,
      ...t,
      startSec: start,
      endSec: currentSec,
      confidence: 0.85 + Math.random() * 0.14,
    };
  });
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export { formatTime };

export default function App() {
  const [view, setView] = useState('upload'); // 'upload' | 'processing' | 'results'
  const [source, setSource] = useState(null); // { type: 'file'|'url', name, value }
  const [tracks, setTracks] = useState([]);
  const [progress, setProgress] = useState(0);

  const handleSubmit = useCallback((src) => {
    setSource(src);

    // Spotify playlists already include the track data — skip processing animation
    if (src.type === 'spotify') {
      setTracks(src.tracks);
      setView('results');
      return;
    }

    setView('processing');
    setProgress(0);

    // Simuleer verwerking met stappen
    const steps = [
      { pct: 15, delay: 600 },
      { pct: 35, delay: 1400 },
      { pct: 55, delay: 2200 },
      { pct: 72, delay: 3200 },
      { pct: 88, delay: 4400 },
      { pct: 100, delay: 5600 },
    ];

    steps.forEach(({ pct, delay }) => {
      setTimeout(() => {
        setProgress(pct);
        if (pct === 100) {
          setTimeout(() => {
            setTracks(generateMockTracklist(src.name));
            setView('results');
          }, 400);
        }
      }, delay);
    });
  }, []);

  const handleReset = useCallback(() => {
    setView('upload');
    setSource(null);
    setTracks([]);
    setProgress(0);
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="main">
        {view === 'upload' && <UploadZone onSubmit={handleSubmit} />}
        {view === 'processing' && <Processing progress={progress} source={source} />}
        {view === 'results' && (
          <TrackList tracks={tracks} source={source} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
