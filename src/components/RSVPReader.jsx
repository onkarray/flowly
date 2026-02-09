import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateSessionProgress } from '../lib/sessions'
import { createNote } from '../lib/notes'

const ORP_THEMES = {
  focus:  { name: 'Focus',  color: '#FF4444', label: 'Red' },
  calm:   { name: 'Calm',   color: '#22D3EE', label: 'Cyan' },
  energy: { name: 'Energy', color: '#39FF14', label: 'Green' },
  sunset: { name: 'Sunset', color: '#FBBF24', label: 'Yellow' },
}

function getORPIndex(word) {
  const len = word.length
  if (len <= 1) return 0
  if (len <= 3) return 0
  if (len <= 7) return 1
  return Math.floor(len * 0.35)
}

function getExtraDelay(word) {
  if (!word) return 0
  const last = word[word.length - 1]
  if ('.!?'.includes(last)) return 50
  if (',;:'.includes(last)) return 25
  return 0
}

const RAMP_START_WPM = 200
const RAMP_END_WPM = 700
const RAMP_DURATION_MS = 30000
const RAMP_TICK_MS = 500
const AUTOSAVE_INTERVAL_MS = 10000

export default function RSVPReader({ words, chapters, onChapterChange, sourceInfo, onBack, onDone, sessionId, resumePosition = 0 }) {
  const { user, isAuthenticated } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(resumePosition)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(RAMP_START_WPM)
  const [theme, setTheme] = useState('focus')
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showChapterList, setShowChapterList] = useState(false)
  const [fadeClass, setFadeClass] = useState('')
  const [autoRamp, setAutoRamp] = useState(true)
  const [currentChapter, setCurrentChapter] = useState(0)

  // Mid-session notes
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const noteInputRef = useRef(null)

  // Session stats tracking
  const sessionStartRef = useRef(null)
  const totalPlayTimeRef = useRef(0)
  const playStartRef = useRef(null)
  const wordsReadRef = useRef(0)

  const timerRef = useRef(null)
  const indexRef = useRef(resumePosition)
  const wpmRef = useRef(RAMP_START_WPM)
  const isPlayingRef = useRef(false)
  const rampRef = useRef(null)
  const rampElapsedRef = useRef(0)
  const autoRampRef = useRef(true)
  const autoSaveRef = useRef(null)
  const sessionIdRef = useRef(sessionId)

  autoRampRef.current = autoRamp
  sessionIdRef.current = sessionId

  // Keep refs in sync
  indexRef.current = currentIndex
  wpmRef.current = wpm
  isPlayingRef.current = isPlaying

  const totalWords = words.length
  const currentWord = words[currentIndex] || ''
  const isLongWord = currentWord.length >= 8
  const orpIndex = getORPIndex(currentWord)
  const orpColor = ORP_THEMES[theme].color

  const progress = totalWords > 0 ? ((currentIndex) / (totalWords - 1)) * 100 : 0
  const wordsRemaining = Math.max(0, totalWords - currentIndex - 1)
  const minutesLeft = wpm > 0 ? (wordsRemaining / wpm).toFixed(1) : '—'

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const chapterRef = useRef(0)
  const chaptersRef = useRef(null)
  chapterRef.current = currentChapter
  chaptersRef.current = chapters

  const getSessionStats = useCallback(() => {
    let totalMs = totalPlayTimeRef.current
    if (playStartRef.current) totalMs += Date.now() - playStartRef.current
    const totalSeconds = Math.max(1, totalMs / 1000)
    const readableWords = wordsReadRef.current
    // Calculate average WPM with sanity bounds (50-2000 WPM)
    const rawWpm = Math.round((readableWords / totalSeconds) * 60)
    const avgWpm = readableWords < 3 ? 0 : Math.min(2000, Math.max(0, rawWpm))
    return {
      wordsRead: readableWords,
      timeSeconds: Math.round(totalSeconds),
      avgWpm,
    }
  }, [])

  // ─── Auto-save progress every 10s ─────────────────
  const saveProgress = useCallback(async () => {
    if (!isAuthenticated || !sessionIdRef.current || String(sessionIdRef.current).startsWith('offline-')) return
    const stats = getSessionStats()
    try {
      await updateSessionProgress(sessionIdRef.current, {
        currentPosition: indexRef.current,
        timeSpentSeconds: stats.timeSeconds,
        averageWpm: stats.avgWpm,
      })
    } catch (err) {
      console.warn('Auto-save failed:', err.message)
    }
  }, [isAuthenticated, getSessionStats])

  // Start/stop autosave interval
  useEffect(() => {
    if (isPlaying && isAuthenticated && sessionId) {
      autoSaveRef.current = setInterval(saveProgress, AUTOSAVE_INTERVAL_MS)
    } else {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current)
        autoSaveRef.current = null
      }
    }
    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current)
        autoSaveRef.current = null
      }
    }
  }, [isPlaying, isAuthenticated, sessionId, saveProgress])

  // Save on pause
  useEffect(() => {
    if (!isPlaying && sessionStartRef.current && isAuthenticated && sessionId) {
      saveProgress()
    }
  }, [isPlaying, isAuthenticated, sessionId, saveProgress])

  const scheduleNext = useCallback(() => {
    clearTimer()
    const idx = indexRef.current
    if (idx >= totalWords - 1) {
      setIsPlaying(false)
      // If there are more chapters, auto-advance
      if (chaptersRef.current && chapterRef.current < chaptersRef.current.length - 1) {
        const nextIdx = chapterRef.current + 1
        setCurrentChapter(nextIdx)
        setCurrentIndex(0)
        onChapterChange?.(nextIdx)
        setTimeout(() => setIsPlaying(true), 500)
      } else {
        onDone?.(getSessionStats())
      }
      return
    }

    const baseDelay = 60000 / wpmRef.current
    const word = words[idx]
    const extra = getExtraDelay(word)

    // Check if next word looks like a paragraph break (double newline was split)
    const isParagraphBreak = word === '¶'

    const delay = isParagraphBreak ? baseDelay + 100 : baseDelay + extra

    timerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return

      const nextIdx = idx + 1
      // Skip paragraph markers
      const skipIdx = words[nextIdx] === '¶' ? nextIdx + 1 : nextIdx
      if (skipIdx >= totalWords) {
        setCurrentIndex(totalWords - 1)
        setIsPlaying(false)
        onDone?.(getSessionStats())
        return
      }

      // Count real words read (not paragraph markers)
      if (words[skipIdx] !== '¶') {
        wordsReadRef.current++
      }

      // Fade effect for paragraph breaks
      if (isParagraphBreak || extra >= 50) {
        setFadeClass('opacity-0')
        setTimeout(() => {
          setCurrentIndex(skipIdx)
          setFadeClass('opacity-100')
          scheduleNext()
        }, 60)
      } else {
        setCurrentIndex(skipIdx)
        scheduleNext()
      }
    }, delay)
  }, [clearTimer, totalWords, words, onDone, getSessionStats])

  // Auto speed ramp
  const startRamp = useCallback(() => {
    if (rampRef.current) clearInterval(rampRef.current)
    rampRef.current = setInterval(() => {
      if (!autoRampRef.current) {
        clearInterval(rampRef.current)
        rampRef.current = null
        return
      }
      rampElapsedRef.current += RAMP_TICK_MS
      const t = Math.min(rampElapsedRef.current / RAMP_DURATION_MS, 1)
      // Ease-out curve for smooth feel
      const eased = 1 - Math.pow(1 - t, 2)
      const newWpm = Math.round(RAMP_START_WPM + (RAMP_END_WPM - RAMP_START_WPM) * eased)
      setWpm(newWpm)
      if (t >= 1) {
        clearInterval(rampRef.current)
        rampRef.current = null
      }
    }, RAMP_TICK_MS)
  }, [])

  const stopRamp = useCallback(() => {
    if (rampRef.current) {
      clearInterval(rampRef.current)
      rampRef.current = null
    }
  }, [])

  // Play/pause control + timing
  useEffect(() => {
    if (isPlaying) {
      if (!sessionStartRef.current) sessionStartRef.current = Date.now()
      playStartRef.current = Date.now()
      scheduleNext()
      if (autoRamp && rampElapsedRef.current < RAMP_DURATION_MS) {
        startRamp()
      }
    } else {
      if (playStartRef.current) {
        totalPlayTimeRef.current += Date.now() - playStartRef.current
        playStartRef.current = null
      }
      clearTimer()
      stopRamp()
    }
    return () => { clearTimer(); stopRamp() }
  }, [isPlaying, scheduleNext, clearTimer, autoRamp, startRamp, stopRamp])

  const togglePlay = useCallback(() => {
    if (showNoteInput) return // Don't toggle while note input is open
    if (currentIndex >= totalWords - 1) {
      setCurrentIndex(0)
      setWpm(RAMP_START_WPM)
      rampElapsedRef.current = 0
      setAutoRamp(true)
      setIsPlaying(true)
    } else {
      setIsPlaying(prev => !prev)
    }
  }, [currentIndex, totalWords, showNoteInput])

  const adjustSpeed = useCallback((delta) => {
    setAutoRamp(false)
    stopRamp()
    setWpm(prev => Math.max(50, Math.min(1200, prev + delta)))
  }, [stopRamp])

  const skipBack = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 10))
  }, [])

  const skipForward = useCallback(() => {
    setCurrentIndex(prev => Math.min(totalWords - 1, prev + 10))
  }, [totalWords])

  const goToChapter = useCallback((idx) => {
    if (!chapters || idx < 0 || idx >= chapters.length) return
    setIsPlaying(false)
    clearTimer()
    setCurrentChapter(idx)
    setCurrentIndex(0)
    onChapterChange?.(idx)
    setShowChapterList(false)
  }, [chapters, clearTimer, onChapterChange])

  const nextChapter = useCallback(() => {
    if (chapters && currentChapter < chapters.length - 1) {
      goToChapter(currentChapter + 1)
    }
  }, [chapters, currentChapter, goToChapter])

  const prevChapter = useCallback(() => {
    if (chapters && currentChapter > 0) {
      goToChapter(currentChapter - 1)
    }
  }, [chapters, currentChapter, goToChapter])

  // ─── Mid-session note handling ─────────────────────
  const openNoteInput = useCallback(() => {
    setIsPlaying(false) // Pause while noting
    setShowNoteInput(true)
    setNoteText('')
    setNoteSaved(false)
    setTimeout(() => noteInputRef.current?.focus(), 100)
  }, [])

  const closeNoteInput = useCallback(() => {
    setShowNoteInput(false)
    setNoteText('')
    setNoteSaved(false)
  }, [])

  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim()) return
    if (!isAuthenticated || !user) return
    if (!sessionId) return

    try {
      await createNote({
        userId: user.id,
        sessionId,
        noteText: noteText.trim(),
        wordPosition: currentIndex,
      })
      setNoteSaved(true)
      setTimeout(() => {
        closeNoteInput()
      }, 800)
    } catch (err) {
      console.warn('Failed to save note:', err)
    }
  }, [noteText, isAuthenticated, user, sessionId, currentIndex, closeNoteInput])

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      // If note input is open, only handle Escape
      if (showNoteInput) {
        if (e.code === 'Escape') {
          e.preventDefault()
          closeNoteInput()
        }
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowUp':
          e.preventDefault()
          adjustSpeed(50)
          break
        case 'ArrowDown':
          e.preventDefault()
          adjustSpeed(-50)
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipBack()
          break
        case 'ArrowRight':
          e.preventDefault()
          skipForward()
          break
        case 'Escape':
          e.preventDefault()
          onBack?.()
          break
        case 'KeyN':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            openNoteInput()
          }
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [togglePlay, adjustSpeed, skipBack, skipForward, onBack, showNoteInput, openNoteInput, closeNoteInput])

  // Restart scheduling when wpm changes during playback
  useEffect(() => {
    if (isPlaying) {
      clearTimer()
      scheduleNext()
    }
  }, [wpm])

  // Render the word with ORP highlight
  const renderWord = () => {
    if (!currentWord || currentWord === '¶') {
      return <span className="text-text-muted/30">···</span>
    }

    const before = currentWord.slice(0, orpIndex)
    const focus = currentWord[orpIndex]
    const after = currentWord.slice(orpIndex + 1)

    return (
      <>
        <span>{before}</span>
        <span className="font-black" style={{ color: orpColor }}>{focus}</span>
        <span>{after}</span>
      </>
    )
  }

  // Tap to play/pause on mobile (on the word area)
  const handleWordAreaTap = useCallback(() => {
    if (showNoteInput) return
    togglePlay()
  }, [togglePlay, showNoteInput])

  // Swipe gestures for mobile
  const touchStartRef = useRef(null)
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.time
    touchStartRef.current = null

    if (dt > 500) return // ignore long touches
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx > 60 && absDx > absDy) {
      // Horizontal swipe
      if (dx > 0) skipBack()
      else skipForward()
    } else if (absDy > 60 && absDy > absDx) {
      // Vertical swipe — speed
      if (dy < 0) adjustSpeed(50) // swipe up = faster
      else adjustSpeed(-50)        // swipe down = slower
    }
  }, [skipBack, skipForward, adjustSpeed])

  return (
    <div
      className="fixed inset-0 bg-bg flex flex-col select-none animate-fade-in z-30"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar — minimal on mobile */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-text-muted hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            title="Back (Esc)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="hidden sm:inline text-sm">Back</span>
          </button>
          <span className="text-text-muted/30 hidden sm:inline">|</span>
          <span className="text-xs font-semibold text-text-muted/40 tracking-tight hidden sm:inline">Flowly</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Note button */}
          {isAuthenticated && sessionId && (
            <button
              onClick={openNoteInput}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
              title="Add note (N)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="hidden sm:inline">Note</span>
            </button>
          )}

          {/* Theme dot */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(prev => !prev)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: orpColor }} />
              <span className="hidden sm:inline">{ORP_THEMES[theme].name}</span>
            </button>
            {showThemePicker && (
              <div className="absolute top-8 right-0 bg-surface border border-border rounded-xl p-2 flex flex-col gap-1 z-10 min-w-[120px]">
                {Object.entries(ORP_THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => { setTheme(key); setShowThemePicker(false) }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      key === theme ? 'bg-border/50 text-white' : 'text-text-muted hover:text-white hover:bg-border/30'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* WPM */}
          <div className="text-xs sm:text-sm text-text-muted flex items-center gap-1.5">
            <span className="text-accent font-semibold">{wpm}</span>
            <span className="hidden sm:inline">WPM</span>
            {autoRamp && rampElapsedRef.current < RAMP_DURATION_MS && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent/70 animate-pulse">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar — thin at top like a reel */}
      <div className="px-4 sm:px-6 shrink-0">
        <div className="w-full h-0.5 bg-border/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Source + chapter info */}
      <div className="text-center px-4 pt-2 shrink-0">
        {sourceInfo && (
          <p className="text-[10px] sm:text-xs text-text-muted/40 truncate">{sourceInfo}</p>
        )}
        {chapters && chapters.length >= 2 && (
          <div className="flex items-center justify-center gap-2 mt-1">
            <button onClick={prevChapter} disabled={currentChapter === 0}
              className={`p-1 rounded transition-colors cursor-pointer ${currentChapter === 0 ? 'text-text-muted/20' : 'text-text-muted hover:text-white'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="relative">
              <button onClick={() => setShowChapterList(prev => !prev)}
                className="text-[10px] sm:text-xs text-text-muted hover:text-white transition-colors cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-surface">
                <span className="text-accent font-semibold">{currentChapter + 1}/{chapters.length}</span>
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{chapters[currentChapter].title}</span>
              </button>
              {showChapterList && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-xl p-2 z-20 min-w-[220px] max-w-[300px] max-h-[250px] overflow-y-auto">
                  {chapters.map((ch, idx) => (
                    <button key={idx} onClick={() => goToChapter(idx)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        idx === currentChapter ? 'bg-accent/15 text-white' : 'text-text-muted hover:text-white hover:bg-border/30'
                      }`}>
                      <span className="text-accent/70 font-mono text-[10px] w-4 shrink-0">{idx + 1}</span>
                      <span className="truncate">{ch.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={nextChapter} disabled={currentChapter === chapters.length - 1}
              className={`p-1 rounded transition-colors cursor-pointer ${currentChapter === chapters.length - 1 ? 'text-text-muted/20' : 'text-text-muted hover:text-white'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ─── WORD DISPLAY — main reel area, fills remaining space ─── */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onClick={handleWordAreaTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Focus guide lines */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 w-0.5 h-8 rounded-full bg-accent/15" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-0.5 h-8 rounded-full bg-accent/15" />

        <div
          className={`font-semibold text-white tracking-wide transition-opacity duration-75 px-4 ${fadeClass} ${
            isLongWord ? 'text-4xl sm:text-5xl md:text-7xl' : 'text-5xl sm:text-6xl md:text-8xl'
          }`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {renderWord()}
        </div>

        {/* Tap hint on mobile when paused */}
        {!isPlaying && !showNoteInput && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 sm:hidden text-[10px] text-text-muted/30 animate-pulse">
            Tap to play · Swipe to navigate
          </div>
        )}
      </div>

      {/* Mid-session note input — overlay at bottom */}
      {showNoteInput && (
        <div className="px-4 sm:px-6 pb-2 animate-fade-in shrink-0">
          <div className="bg-surface border border-accent/30 rounded-xl p-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-accent font-semibold flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Quick Note
              </span>
              <button onClick={closeNoteInput} className="text-text-muted hover:text-white transition-colors cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <textarea ref={noteInputRef} value={noteText} onChange={(e) => setNoteText(e.target.value)}
              placeholder="Capture a thought..." rows={2}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted/40 resize-none focus:outline-none focus:border-accent/50 transition-colors"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSaveNote() } }}
            />
            <div className="flex items-center justify-end mt-2">
              <button onClick={handleSaveNote} disabled={!noteText.trim()}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  noteSaved ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : noteText.trim() ? 'bg-accent text-white hover:bg-accent-hover cursor-pointer'
                  : 'bg-surface text-text-muted/30 border border-border cursor-not-allowed'
                }`}>{noteSaved ? '✓ Saved' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2">
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 max-w-lg mx-auto">
          <button onClick={skipBack}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-border/60 bg-surface/80 flex items-center justify-center text-text-muted hover:text-white hover:border-accent/50 transition-all cursor-pointer active:scale-90"
            title="Back 10 words">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
            </svg>
          </button>

          <button onClick={() => adjustSpeed(-50)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-border/60 bg-surface/80 flex items-center justify-center text-text-muted hover:text-white hover:border-accent/50 transition-all cursor-pointer active:scale-90 text-base font-bold"
            title="-50 WPM">−</button>

          <button onClick={togglePlay}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent-hover transition-all cursor-pointer active:scale-90"
            title="Play/Pause">
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            )}
          </button>

          <button onClick={() => adjustSpeed(50)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-border/60 bg-surface/80 flex items-center justify-center text-text-muted hover:text-white hover:border-accent/50 transition-all cursor-pointer active:scale-90 text-base font-bold"
            title="+50 WPM">+</button>

          <button onClick={skipForward}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-border/60 bg-surface/80 flex items-center justify-center text-text-muted hover:text-white hover:border-accent/50 transition-all cursor-pointer active:scale-90"
            title="Forward 10 words">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
        </div>

        {/* Stats + time remaining */}
        <div className="flex items-center justify-between mt-2.5 text-[10px] sm:text-xs text-text-muted/50 max-w-lg mx-auto">
          <span>{currentIndex + 1} / {totalWords}</span>
          <span>{wordsRemaining > 0 ? `${minutesLeft} min left` : 'Done'}</span>
        </div>

        {/* Keyboard hints — desktop only */}
        <div className="hidden sm:flex items-center justify-center gap-4 mt-4 text-[10px] text-text-muted/25">
          <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/40">Space</kbd> play</span>
          <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/40">↑↓</kbd> speed</span>
          <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/40">←→</kbd> skip</span>
          {isAuthenticated && sessionId && (
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/40">N</kbd> note</span>
          )}
          <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/40">Esc</kbd> exit</span>
        </div>
      </div>
    </div>
  )
}
