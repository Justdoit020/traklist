# TrackList — DJ Set Tracklist Detection

Electron + React desktop app voor automatische tracklist-detectie van DJ mixen.

## Ontwikkeling starten

```bash
npm install
npm run electron:dev
```

## macOS app bouwen (.dmg)

```bash
npm run electron:build:mac
```

Het `.dmg` bestand staat daarna in `dist/`. Sleep de app naar je `/Applications` map.

## Eén-klik build + installatie (macOS)

```bash
./build-and-install.command
```

Dit script doet automatisch:
- dependencies installeren
- macOS build draaien
- nieuwste `.dmg` mounten
- `TrackList.app` installeren in `~/Applications`
- app direct openen

## Tech
- Electron 29 + React 18
- react-dropzone voor bestandsselectie
- Ondersteunt: audiobestanden (MP3/WAV/FLAC/AAC) én URL's van YouTube, Mixcloud & SoundCloud
