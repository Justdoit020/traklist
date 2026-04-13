# TrackList — DJ Set Tracklist Detection

Electron + React desktop app voor automatische tracklist-detectie van DJ mixen.

## Functies

- Upload een audiobestand (MP3/WAV/FLAC/AAC/M4A/OGG) of plak een YouTube-, Mixcloud- of SoundCloud-link om de tracklist automatisch te detecteren.
- **Spotify Playlist Downloader**: importeer een Spotify playlist direct in de app. Je krijgt een volledige tracklist met artiest, titel, album en tijdsduur.

## Spotify instellen

1. Ga naar [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) en maak een nieuwe app aan.
2. Kopieer je **Client ID** en **Client Secret**.
3. Open de Spotify-tab in TrackList, klik op **API-instellingen** en voer je gegevens in.  
   Ze worden lokaal opgeslagen zodat je ze maar één keer hoeft in te vullen.
4. Plak een Spotify playlist-URL (bijv. `https://open.spotify.com/playlist/…`) en klik op **Haal playlist op**.

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
- Spotify Web API (Client Credentials) voor playlist-import
- Ondersteunt: audiobestanden (MP3/WAV/FLAC/AAC) én URL's van YouTube, Mixcloud & SoundCloud
