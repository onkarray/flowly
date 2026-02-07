import { useState } from 'react'

export default function MusicPlayer({ audio }) {
  const [showControls, setShowControls] = useState(false)

  if (!audio.currentTrack) return null

  const volumePercent = Math.round(audio.volume * 100)

  return (
    <div className="fixed bottom-6 right-6 z-30">
      {/* Expanded controls */}
      {showControls && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-3 w-56 shadow-lg shadow-black/30">
          {/* Track name */}
          <p className="text-xs text-text-muted mb-3 truncate">{audio.currentTrack.name}</p>

          {/* Volume slider */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={audio.toggleMute}
              className="text-text-muted hover:text-white transition-colors cursor-pointer shrink-0"
              title={audio.isMuted ? 'Unmute' : 'Mute'}
            >
              {audio.isMuted || audio.volume === 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : audio.volume < 0.5 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={audio.isMuted ? 0 : volumePercent}
              onChange={(e) => audio.setVolume(parseInt(e.target.value) / 100)}
              className="flex-1 h-1 appearance-none bg-border rounded-full cursor-pointer accent-accent"
              style={{
                background: `linear-gradient(to right, var(--color-accent) ${audio.isMuted ? 0 : volumePercent}%, var(--color-border) ${audio.isMuted ? 0 : volumePercent}%)`,
              }}
            />

            <span className="text-[10px] text-text-muted w-7 text-right tabular-nums">
              {audio.isMuted ? 0 : volumePercent}%
            </span>
          </div>
        </div>
      )}

      {/* Mini FAB button */}
      <button
        onClick={() => setShowControls(prev => !prev)}
        className={`
          w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ml-auto
          ${showControls
            ? 'bg-accent text-white'
            : 'bg-surface border border-border text-text-muted hover:text-white hover:border-accent/50'
          }
          ${audio.isPlaying ? 'animate-pulse-slow' : ''}
        `}
        title="Music controls"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </button>
    </div>
  )
}
