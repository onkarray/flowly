import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getIncompleteSessions } from '../lib/sessions'
import UserMenu from './UserMenu'

const DEMO_TEXT = `Speed reading isn't about skimming. It's about training your brain to process words faster without losing comprehension. The average person reads at 200-250 words per minute. With RSVP (Rapid Serial Visual Presentation), you can double or triple that speed.

The secret is eliminating subvocalization - the voice in your head that speaks every word. When words flash one at a time, your brain shifts to visual recognition instead of auditory processing. The colored letter (called ORP - Optimal Recognition Point) helps your eye anchor to each word instantly.

Studies show readers retain 85-90% comprehension at speeds up to 600 WPM with RSVP training. That means you could finish a typical book chapter in 5 minutes instead of 20.

The key is starting slow and letting your brain adjust. That's why speed ramping works - you begin at a comfortable pace and gradually accelerate. By the time you hit 700 WPM, your visual processing has caught up.

Try it yourself. Focus on the colored letter. Let the words flow. Don't fight it. Your brain knows what to do.`

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export { DEMO_TEXT }

export default function LandingPage({ onStart, onStartDemo, onStartPaste, loading = false, loadingProgress = 0, error = '', onRequestLogin, onShowHistory, onSaveForLater, onGoToApp }) {
  const { user, isAuthenticated } = useAuth()
  const [pasteText, setPasteText] = useState('')
  const textareaRef = useRef(null)

  const pasteWordCount = pasteText.trim() ? pasteText.trim().split(/\s+/).length : 0
  const canStartPaste = pasteWordCount >= 50

  // If user is authenticated, redirect to app view
  useEffect(() => {
    if (isAuthenticated) {
      onGoToApp?.()
    }
  }, [isAuthenticated])

  const handlePasteStart = () => {
    if (canStartPaste && !loading) {
      onStartPaste?.(pasteText.trim())
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canStartPaste) {
        e.preventDefault()
        handlePasteStart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canStartPaste, pasteText, loading])

  return (
    <div className="min-h-screen flex flex-col items-center px-4 sm:px-6 animate-fade-in relative">

      {/* Top-right sign in */}
      <div className="absolute top-5 right-5 z-10">
        <button
          onClick={() => onRequestLogin?.()}
          className="text-xs text-text-muted hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Sign in
        </button>
      </div>

      {/* Hero Section */}
      <div className="w-full max-w-2xl pt-16 sm:pt-24 pb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Flowly</h1>
        </div>
        <p className="text-text-muted text-base max-w-md mx-auto">
          Read 2-3x faster with science-backed speed reading. One word at a time, perfectly paced.
        </p>
      </div>

      {/* Two cards side by side */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

        {/* Card 1: Try Demo */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">Try Demo Article</h3>
          </div>
          <p className="text-xs text-text-muted mb-5 flex-1">
            Experience speed reading with a short article about how RSVP works. Full experience — music, themes, speed ramping.
          </p>
          <button
            onClick={() => onStartDemo?.()}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Demo
          </button>
        </div>

        {/* Card 2: Paste Text */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">Paste Your Text</h3>
          </div>
          <textarea
            ref={textareaRef}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste an article, email, notes — anything you want to read faster..."
            rows={4}
            className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-xs text-white placeholder-text-muted/40 resize-none focus:outline-none focus:border-accent/50 transition-colors mb-3 flex-1"
          />
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] ${pasteWordCount >= 50 ? 'text-green-400' : 'text-text-muted/50'}`}>
              {pasteWordCount} word{pasteWordCount !== 1 ? 's' : ''} {pasteWordCount < 50 ? `(min 50)` : ''}
            </span>
            {pasteText.trim() && (
              <button
                onClick={() => setPasteText('')}
                className="text-[10px] text-text-muted/40 hover:text-text-muted cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={handlePasteStart}
            disabled={!canStartPaste || loading}
            className={`
              w-full py-3 rounded-xl text-sm font-semibold transition-all
              ${canStartPaste
                ? 'bg-purple-500 text-white hover:bg-purple-600 active:scale-[0.98] cursor-pointer'
                : 'bg-surface text-text-muted border border-border cursor-not-allowed'
              }
            `}
          >
            Start Reading
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="w-full max-w-2xl mb-6">
          <div className="bg-surface border border-border rounded-xl p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <svg className="animate-spin h-5 w-5 text-accent shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-text-muted">
                {loadingProgress > 0 ? `Extracting text... ${loadingProgress}%` : 'Preparing...'}
              </span>
            </div>
            {loadingProgress > 0 && (
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full max-w-2xl mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5">
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Sign in CTA */}
      <div className="w-full max-w-2xl">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-sm font-semibold text-white mb-1.5">Unlock all features</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start">
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Read from URLs
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Upload PDFs
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  Save progress
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Reading history
                </span>
              </div>
            </div>
            <button
              onClick={() => onRequestLogin?.()}
              className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-800 text-sm font-semibold hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer"
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
        </div>
      </div>

      {/* Keyboard hint */}
      {canStartPaste && !loading && (
        <p className="text-center text-text-muted/40 text-xs mt-6">
          Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted text-[10px]">Cmd+Enter</kbd> to start
        </p>
      )}

      <div className="pb-8" />
    </div>
  )
}
