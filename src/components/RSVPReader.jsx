import { useState, useEffect, useRef, useCallback } from 'react'

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

export default function RSVPReader({ words, chapters, onChapterChange, sourceInfo, onBack, onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(RAMP_START_WPM)
  const [theme, setTheme] = useState('focus')
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showChapterList, setShowChapterList] = useState(false)
  const [fadeClass, setFadeClass] = useState('')
  const [autoRamp, setAutoRamp] = useState(true)
  const [currentChapter, setCurrentChapter] = useState(0)

  // Session stats tracking
  const sessionStartRef = useRef(null)
  const totalPlayTimeRef = useRef(0)
  const playStartRef = useRef(null)
  const wordsReadRef = useRef(0)

  const timerRef = useRef(null)
  const indexRef = useRef(0)
  const wpmRef = useRef(RAMP_START_WPM)
  const isPlayingRef = useRef(false)
  const rampRef = useRef(null)
  const rampElapsedRef = useRef(0)
  const autoRampRef = useRef(true)

  autoRampRef.current = autoRamp

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
    const avgWpm = Math.round((readableWords / totalSeconds) * 60)
    return {
      wordsRead: readableWords,
      timeSeconds: Math.round(totalSeconds),
      avgWpm,
    }
  }, [])

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
  }, [clearTimer, totalWords, words, onDone])

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
    if (currentIndex >= totalWords - 1) {
      setCurrentIndex(0)
      setWpm(RAMP_START_WPM)
      rampElapsedRef.current = 0
      setAutoRamp(true)
      setIsPlaying(true)
    } else {
      setIsPlaying(prev => !prev)
    }
  }, [currentIndex, totalWords])

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

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
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
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [togglePlay, adjustSpeed, skipBack, skipForward, onBack])

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 select-none animate-fade-in">
      <div className="w-full max-w-2xl">

        {/* Top bar: logo + back + WPM + theme */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-text-muted hover:text-white transition-colors cursor-pointer text-sm flex items-center gap-1.5"
              title="Back (Esc)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <span className="text-text-muted/30 hidden sm:inline">|</span>
            <span className="text-xs font-semibold text-text-muted/40 tracking-tight hidden sm:inline">Flowly</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme picker */}
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(prev => !prev)}
                className="flex items-center gap-2 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: orpColor }}
                />
                {ORP_THEMES[theme].name}
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
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* WPM display */}
            <div className="text-sm text-text-muted flex items-center gap-2">
              <span className="text-accent font-semibold">{wpm}</span> WPM
              {autoRamp && rampElapsedRef.current < RAMP_DURATION_MS && (
                <span className="text-[10px] text-accent/70 flex items-center gap-1 animate-pulse">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                  ramping
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Source info */}
        {sourceInfo && (
          <div className="text-center mb-2">
            <p className="text-xs text-text-muted/50 truncate max-w-md mx-auto">{sourceInfo}</p>
          </div>
        )}

        {/* Chapter navigation */}
        {chapters && chapters.length >= 2 && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={prevChapter}
              disabled={currentChapter === 0}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                currentChapter === 0 ? 'text-text-muted/20' : 'text-text-muted hover:text-white hover:bg-surface'
              }`}
              title="Previous chapter"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowChapterList(prev => !prev)}
                className="text-xs text-text-muted hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface"
              >
                <span className="text-accent font-semibold">{currentChapter + 1}/{chapters.length}</span>
                <span className="truncate max-w-[200px]">{chapters[currentChapter].title}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showChapterList && (
                <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-xl p-2 z-20 min-w-[240px] max-w-[320px] max-h-[300px] overflow-y-auto">
                  {chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToChapter(idx)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        idx === currentChapter ? 'bg-accent/15 text-white' : 'text-text-muted hover:text-white hover:bg-border/30'
                      }`}
                    >
                      <span className="text-accent/70 font-mono text-[10px] w-5 shrink-0">{idx + 1}</span>
                      <span className="truncate">{ch.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={nextChapter}
              disabled={currentChapter === chapters.length - 1}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                currentChapter === chapters.length - 1 ? 'text-text-muted/20' : 'text-text-muted hover:text-white hover:bg-surface'
              }`}
              title="Next chapter"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Word display */}
        <div className="h-[160px] sm:h-[200px] flex items-center justify-center relative">
          {/* Focus guide lines */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-0.5 h-6 rounded-full bg-accent/20" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-0.5 h-6 rounded-full bg-accent/20" />

          <div
            className={`font-semibold text-white tracking-wide transition-opacity duration-75 ${fadeClass} ${
              isLongWord ? 'text-4xl sm:text-5xl md:text-7xl' : 'text-5xl sm:text-6xl md:text-8xl'
            }`}
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {renderWord()}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
          {/* Skip back */}
          <button
            onClick={skipBack}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-white hover:border-accent/50 transition-all cursor-pointer"
            title="Back 10 words (←)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>

          {/* Speed down */}
          <button
            onClick={() => adjustSpeed(-50)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-white hover:border-accent/50 transition-all cursor-pointer text-lg font-bold"
            title="-50 WPM (↓)"
          >
            −
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent-hover transition-all cursor-pointer active:scale-95"
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            )}
          </button>

          {/* Speed up */}
          <button
            onClick={() => adjustSpeed(50)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-white hover:border-accent/50 transition-all cursor-pointer text-lg font-bold"
            title="+50 WPM (↑)"
          >
            +
          </button>

          {/* Skip forward */}
          <button
            onClick={skipForward}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-white hover:border-accent/50 transition-all cursor-pointer"
            title="Forward 10 words (→)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-6 sm:mt-8">
          <div className="w-full h-1 bg-border/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-xs text-text-muted">
            <span>{currentIndex + 1} / {totalWords} words</span>
            <span>{wordsRemaining > 0 ? `${minutesLeft} min left` : 'Done'}</span>
          </div>
        </div>

        {/* Keyboard hints — hidden on mobile */}
        <div className="hidden sm:flex items-center justify-center gap-4 mt-8 text-[10px] text-text-muted/30">
          <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/50">Space</kbd> play</span>
          <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/50">↑↓</kbd> speed</span>
          <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/50">←→</kbd> skip</span>
          <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-muted/50">Esc</kbd> exit</span>
        </div>
      </div>
    </div>
  )
}
