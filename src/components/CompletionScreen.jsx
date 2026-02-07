import { useState } from 'react'

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

export default function CompletionScreen({ stats, onBack }) {
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const { wordsRead = 0, timeSeconds = 0, avgWpm = 0 } = stats || {}

  const handleSave = () => {
    console.log('Session notes saved:', {
      notes,
      stats: { wordsRead, timeSeconds, avgWpm },
      timestamp: new Date().toISOString(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 animate-fade-in">
      <div className="w-full max-w-md">

        {/* Celebration header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-1">Session Complete!</h2>
          <p className="text-text-muted text-sm">Nice work — here's how you did</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {/* Words read */}
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {wordsRead.toLocaleString()}
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Words
            </div>
          </div>

          {/* Time */}
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {formatTime(timeSeconds)}
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Time
            </div>
          </div>

          {/* Avg WPM */}
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">
              {avgWpm}
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Avg WPM
            </div>
          </div>
        </div>

        {/* Notes section */}
        <div className="mb-8">
          <label className="block text-xs text-text-muted mb-2">
            What did you learn? Add notes...
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key takeaways, interesting ideas, things to look up later..."
            rows={4}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted/40 resize-none focus:outline-none focus:border-accent/50 transition-colors"
          />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!notes.trim()}
            className={`
              mt-3 w-full py-2.5 rounded-xl text-sm font-semibold transition-all
              ${notes.trim()
                ? saved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-surface border border-border text-text-muted hover:text-white hover:border-accent/50 cursor-pointer'
                : 'bg-surface border border-border text-text-muted/30 cursor-not-allowed'
              }
            `}
          >
            {saved ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved!
              </span>
            ) : (
              'Save Notes'
            )}
          </button>
        </div>

        {/* Action buttons */}
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all cursor-pointer"
        >
          Read Something Else
        </button>
      </div>
    </div>
  )
}
