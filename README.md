# Dante's *Inferno* — Illustrated Online Edition

An interactive, bilingual web book of Dante Alighieri's *Inferno* featuring the original Italian verse alongside Henry Wadsworth Longfellow's 1867 English translation, illuminated line by line with 78 public-domain artworks.

## Features

- **Bilingual Reader (`IT · EN`, `EN`, `IT`):** Read all 34 cantos in side-by-side tercets or switch to English-only / Italian-only at any time.
- **Line-Linked Paintings:** Verses connected to an artwork glow with a `✦` marker.
  - **Hover** over an illustrated line to see a floating preview card with the painting, title, artist, and date.
  - **Click** an illustrated line (or any thumbnail in the canto header) to open a full-screen lightbox showing the artwork, artist, date, source note, matching verses, and a direct link to the Wikimedia Commons record.
  - **Keyboard Navigation:** Use `←` / `→` in the lightbox to step through paintings and `Esc` to close.
- **Artwork Gallery:** Browse all 78 illustrations across the *Inferno* and filter by artist.
- **100% Local & Source-Verified:** Runs as a static site (vanilla HTML, CSS, and JavaScript) with no external API calls during reading. Every artist, date, license, and verse range is checked against its source record.

## Getting Started

To keep the Git repository lightweight, the 78 high-resolution painting files (~128 MB) are excluded from Git and downloaded locally upon installation.

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd <repo-folder>
```

### 2. Download the paintings

Run the install command (or the download script directly):

```bash
npm install
# or:
npm run download-paintings
```

The script will display information about the download (source, Public Domain / CC0 license status, file count, destination folder `images/paintings/`, and size) and ask for your consent (`[y/N]`) before downloading any files from Wikimedia Commons.

> **Note:** For non-interactive environments, you can pass `node tools/download-assets.js --yes`.

### 3. Open the book

Once the images are downloaded, you can either open `index.html` directly in your browser or start a local static server:

```bash
npm start
```

Then visit **http://localhost:5173**.

## Project Structure

```text
├── index.html                  # Main reader, table of contents, gallery, and lightbox
├── css/
│   └── style.css               # Dark infernal theme, typography, and responsive layout
├── js/
│   └── app.js                  # Canto renderer, hover preview, lightbox, and routing
├── data/
│   ├── inferno.js              # All 34 cantos in Italian and English (Longfellow)
│   ├── paintings.js            # Source-verified metadata and line mappings for 78 artworks
│   └── commons-metadata.json   # Cached Wikimedia Commons extmetadata snapshot
├── images/
│   └── paintings/              # Local image files (p1.jpg – p78.jpg, git-ignored)
└── tools/
    ├── download-assets.js      # Interactive downloader with user consent prompt
    ├── verify-paintings.js     # Offline verifier checking metadata, licenses, and line ranges
    ├── verify-report.txt       # Latest verification log for all 78 artworks
    ├── build-text.js           # Parses Project Gutenberg texts into data/inferno.js
    └── build-paintings.js      # Initial Wikimedia Commons resolver
```

## Sources & Copyright

All text and images used in this project are in the **Public Domain**:

- **Italian Text:** Dante Alighieri, *La Divina Commedia: Inferno* — via [Project Gutenberg #1000](https://www.gutenberg.org/ebooks/1000).
- **English Translation:** Henry Wadsworth Longfellow (1867) — via [Project Gutenberg #1001](https://www.gutenberg.org/ebooks/1001).
- **Artworks:** 78 public-domain works (`PD-old-100` / `{{PD-Art}}` / `CC0`) sourced from [Wikimedia Commons](https://commons.wikimedia.org/), including illustrations and paintings by:
  - Gustave Doré (1832–1883)
  - William Blake (1757–1827)
  - Sandro Botticelli (c. 1445–1510)
  - Joshua Reynolds (1723–1792)
  - Ary Scheffer (1795–1858)
  - Eugène Delacroix (1798–1863)
  - Anselm Feuerbach (1829–1880)
  - Dante Gabriel Rossetti (1828–1882)
  - Alexandre Cabanel (1823–1889)
  - William-Adolphe Bouguereau (1825–1905)

To re-verify `data/paintings.js` against the cached Wikimedia Commons source records and the Project Gutenberg text at any time, run:

```bash
npm run verify
```
