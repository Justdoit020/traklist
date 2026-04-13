# TrackList — DJ Set Tracklist Detection & Spotify Downloader

Electron + React desktop app voor automatische tracklist-detectie van DJ mixen én het downloaden van Spotify playlists.

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

## Spotify Playlist Downloader

De app bevat een ingebouwde Spotify Playlist Downloader waarmee je alle nummers uit een publieke Spotify playlist kunt downloaden als MP3.

### Vereisten

1. **yt-dlp** — zorg dat `yt-dlp` geïnstalleerd is op je systeem:
   ```bash
   brew install yt-dlp   # macOS via Homebrew
   # of: pip install yt-dlp
   ```
2. **ffmpeg** — vereist voor het converteren naar MP3:
   ```bash
   brew install ffmpeg
   ```
3. **Spotify Developer-account** — maak een gratis app aan op [developer.spotify.com](https://developer.spotify.com/dashboard) en noteer je **Client ID** en **Client Secret**.

### Gebruik

1. Klik op **Spotify Downloader** in de navigatiebalk.
2. Vul je **Client ID** en **Client Secret** in en klik op **Opslaan**.
3. Plak een Spotify playlist-URL (bijv. `https://open.spotify.com/playlist/…`) en klik op **Ophalen**.
4. Kies een **downloadmap** via de knop *Kies map…*.
5. Klik op **↓ Download alle nummers**. Elk nummer wordt als MP3 opgeslagen.

### Noten

- Alleen **publieke** Spotify playlists worden ondersteund (Client Credentials flow — geen inloggen vereist).
- Downloads verlopen via een YouTube-zoekopdracht per nummer via `yt-dlp`.

## Tech
- Electron 29 + React 18
- react-dropzone voor bestandsselectie
- yt-dlp-wrap voor YouTube-downloads
- Ondersteunt: audiobestanden (MP3/WAV/FLAC/AAC) én URL's van YouTube, Mixcloud & SoundCloud
