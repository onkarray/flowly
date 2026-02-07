import { useState } from 'react'

const TRACKS = [
  {
    id: 'lofi-focus',
    name: 'Lofi Focus',
    src: '/music/lofi-focus.mp3',
    gradient: 'from-purple-500/20 to-indigo-500/20',
    accent: '#A78BFA',
    icon: '🎵',
  },
  {
    id: 'deep-work',
    name: 'Deep Work',
    src: '/music/deep-work.mp3',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    accent: '#22D3EE',
    icon: '🧠',
  },
  {
    id: 'calm-flow',
    name: 'Calm Flow',
    src: '/music/calm-flow.mp3',
    gradient: 'from-green-500/20 to-emerald-500/20',
    accent: '#34D399',
    icon: '🌊',
  },
  {
    id: 'study-beats',
    name: 'Study Beats',
    src: '/music/study-beats.mp3',
    gradient: 'from-orange-500/20 to-amber-500/20',
    accent: '#FBBF24',
    icon: '📚',
  },
  {
    id: 'zen-mode',
    name: 'Zen Mode',
    src: '/music/zen-mode.mp3',
    gradient: 'from-pink-500/20 to-rose-500/20',
    accent: '#FB7185',
    icon: '🧘',
  },
]

export { TRACKS }

export default function MusicPicker({ audio, onConfirm, onBack }) {
  const [selected, setSelected] = useState(null) // track id or null for no music
  const [previewing, setPreviewing] = useState(null)

  const handleSelect = (track) => {
    if (selected === track.id) {
      // Deselect
      setSelected(null)
      audio.stopPreview()
      setPreviewing(null)
    } else {
      setSelected(track.id)
    }
  }

  const handlePreview = (e, track) => {
    e.stopPropagation()
    if (previewing === track.id) {
      audio.stopPreview()
      setPreviewing(null)
    } else {
      audio.preview(track)
      setPreviewing(track.id)
    }
  }

  const handleNoMusic = () => {
    setSelected('none')
    audio.stopPreview()
    setPreviewing(null)
  }

  const handleConfirm = () => {
    audio.stopPreview()
    if (selected === 'none' || !selected) {
      onConfirm(null)
    } else {
      const track = TRACKS.find(t => t.id === selected)
      onConfirm(track)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 animate-fade-in">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white mb-2">Pick Your Vibe</h2>
          <p className="text-text-muted text-sm">Choose background music for your reading session</p>
        </div>

        {/* Track list */}
        <div className="flex flex-col gap-2.5">
          {TRACKS.map((track) => {
            const isSelected = selected === track.id
            const isPreviewing = previewing === track.id
            return (
              <button
                key={track.id}
                onClick={() => handleSelect(track)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer
                  ${isSelected
                    ? `bg-gradient-to-r ${track.gradient} border-2`
                    : 'bg-surface border border-border hover:border-text-muted/30'
                  }
                `}
                style={isSelected ? { borderColor: track.accent } : {}}
              >
                {/* Icon */}
                <span className="text-xl w-8 text-center shrink-0">{track.icon}</span>

                {/* Name */}
                <span className={`text-sm font-medium flex-1 text-left ${isSelected ? 'text-white' : 'text-text-muted'}`}>
                  {track.name}
                </span>

                {/* Preview button */}
                <button
                  onClick={(e) => handlePreview(e, track)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isPreviewing
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                  title={isPreviewing ? 'Stop preview' : 'Preview'}
                >
                  {isPreviewing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  )}
                </button>

                {/* Selected check */}
                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: track.accent }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}

          {/* No music option */}
          <button
            onClick={handleNoMusic}
            className={`
              w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer
              ${selected === 'none'
                ? 'bg-surface border-2 border-text-muted/50'
                : 'bg-surface border border-border hover:border-text-muted/30'
              }
            `}
          >
            <span className="text-xl w-8 text-center shrink-0">🔇</span>
            <span className={`text-sm font-medium flex-1 text-left ${selected === 'none' ? 'text-white' : 'text-text-muted'}`}>
              No Music
            </span>
            {selected === 'none' && (
              <div className="w-5 h-5 rounded-full bg-text-muted/50 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border border-border text-text-muted hover:text-white hover:border-text-muted/50 transition-all cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className={`
              flex-[2] py-3 rounded-xl text-sm font-semibold transition-all
              ${selected
                ? 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] cursor-pointer'
                : 'bg-surface text-text-muted border border-border cursor-not-allowed'
              }
            `}
          >
            Start Reading
          </button>
        </div>
      </div>
    </div>
  )
}
