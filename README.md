# Flowly — Speed Reader

A minimal, distraction-free speed reading app using RSVP (Rapid Serial Visual Presentation). Paste a URL, upload a PDF, or use the built-in sample text to read faster with ORP highlighting and background music.

## Features

- **RSVP Reader** — Words displayed one at a time in a fixed position, eliminating eye movement
- **ORP Highlighting** — Optimal Recognition Point letter highlighted in color for faster word recognition
- **4 Color Themes** — Focus (red), Calm (cyan), Energy (green), Sunset (yellow)
- **Auto Speed Ramping** — Starts at 200 WPM and ramps to 700 WPM over 30 seconds with an ease-out curve
- **URL Text Extraction** — Paste any article URL; text is extracted using Mozilla Readability
- **PDF Upload** — Upload PDFs up to hundreds of pages with progress tracking
- **Chapter Detection** — Automatic chapter/section detection from PDF bookmarks or text patterns
- **Background Music** — 5 ambient tracks to help you focus (Lofi Focus, Deep Work, Calm Flow, Study Beats, Zen Mode)
- **Session Stats** — Words read, time taken, and average WPM displayed at session end
- **Notes** — Jot down takeaways after each reading session
- **Keyboard Shortcuts** — Space (play/pause), arrows (speed/skip), Esc (exit)
- **Mobile Responsive** — Works on phones, tablets, and desktops

## Tech Stack

- [React 19](https://react.dev) + [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Mozilla Readability](https://github.com/mozilla/readability) for article extraction
- [DOMPurify](https://github.com/cure53/DOMPurify) for HTML sanitization
- [pdf.js](https://mozilla.github.io/pdf.js/) (CDN) for PDF text extraction

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

1. **Open the app** — you'll see the landing page
2. **Paste a URL** or **upload a file** (PDF, TXT), or just hit Start to use the sample text
3. **Pick your vibe** — choose background music or go silent
4. **Read** — press Space or tap Play to start. Words appear one at a time with ORP highlighting
5. **Adjust speed** — use ↑↓ keys or the +/- buttons. Auto-ramp will ease you up to 700 WPM
6. **Finish** — see your stats, add notes, then read something else

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `↑` / `↓` | Speed +50 / -50 WPM |
| `←` / `→` | Skip back / forward 10 words |
| `Esc` | Exit to home |
| `Enter` | Start reading (on landing page) |

## Project Structure

```
src/
  App.jsx                  # Main app shell, screen routing
  index.css                # Tailwind + custom theme
  components/
    LandingPage.jsx        # URL input, file upload
    MusicPicker.jsx        # Pre-reading track selection
    RSVPReader.jsx         # Core RSVP engine + controls
    MusicPlayer.jsx        # Floating audio controls
    CompletionScreen.jsx   # Session stats + notes
  hooks/
    useAudio.js            # Audio playback hook
  utils/
    extractText.js         # URL/PDF/file text extraction
public/
  music/                   # Background music tracks
```

## License

MIT
