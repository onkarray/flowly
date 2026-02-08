import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createNote } from '../lib/notes'

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

export default function CompletionScreen({ stats, sessionId, onBack, onRequestLogin }) {
  const { user, isAuthenticated } = useAuth()
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const { wordsRead = 0, timeSeconds = 0, avgWpm = 0 } = stats || {}

  const handleSave = async () => {
    if (!isAuthenticated || !user) {
      onRequestLogin?.('Sign in to save your notes')
      return
    }
    if (!notes.trim()) return
    if (!sessionId) {
      // No session in DB (user wasn't logged in when they started)
      console.warn('No session ID, cannot save note')
      return
    }

    setSaving(true)
    try {
      await createNote({
        userId: user.id,
        sessionId,
        noteText: notes.trim(),
        wordPosition: 0, // Completion note, no specific position
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.warn('Failed to save note:', err)
    } finally {
      setSaving(false)
    }
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

        {/* Sign in CTA for unauthenticated users */}
        {!isAuthenticated && (
          <div className="mb-8 bg-surface border border-accent/20 rounded-xl p-5">
            <p className="text-sm text-white font-medium mb-1">Want to save your progress?</p>
            <p className="text-xs text-text-muted mb-4">
              Sign in to read your own content, save notes, upload PDFs, and track your reading history.
            </p>
            <button
              onClick={() => onRequestLogin?.('Sign in to unlock all features')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-gray-800 text-sm font-semibold hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </div>
        )}

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
            disabled={!notes.trim() || saving}
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
            ) : !isAuthenticated && notes.trim() ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Sign in to Save
              </span>
            ) : saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
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
