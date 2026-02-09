import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import LandingPage, { DEMO_TEXT } from './components/LandingPage'
import AppDashboard from './components/AppDashboard'
import MusicPicker from './components/MusicPicker'
import RSVPReader from './components/RSVPReader'
import CompletionScreen from './components/CompletionScreen'
import ReadingHistory from './components/ReadingHistory'
import AdminErrors from './components/AdminErrors'
import AdminFeedback from './components/AdminFeedback'
import FeedbackWidget from './components/FeedbackWidget'
import MusicPlayer from './components/MusicPlayer'
import LoginModal from './components/LoginModal'
import ErrorBoundary from './components/ErrorBoundary'
import { useToast } from './components/Toast'
import useAudio from './hooks/useAudio'
import { extractTextFromURL, extractTextFromFile, textToWords } from './utils/extractText'
import { cleanText } from './utils/cleanText'
import { logError } from './utils/errorLogger'
import { createSession, completeSession, syncOfflineQueue, getSession } from './lib/sessions'
import { saveItem, detectSourceType } from './lib/savedItems'

function App() {
  const { user, isAuthenticated, onSignOut } = useAuth()
  const showToast = useToast()
  const [screen, setScreen] = useState(() => isAuthenticated ? 'app' : 'landing')
  const [words, setWords] = useState([])
  const [chapters, setChapters] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState('')
  const [fileInfo, setFileInfo] = useState('')
  const [sessionStats, setSessionStats] = useState(null)

  // Session tracking
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [contentText, setContentText] = useState('')
  const [sourceType, setSourceType] = useState('sample')
  const [sourceUrl, setSourceUrl] = useState(null)
  const [resumePosition, setResumePosition] = useState(0)

  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')

  const audio = useAudio()

  // Redirect to landing page on sign out
  useEffect(() => {
    const unsubscribe = onSignOut(() => {
      setScreen('landing')
      setWords([])
      setChapters(null)
      setError('')
      setFileInfo('')
      setSessionStats(null)
      setCurrentSessionId(null)
      setResumePosition(0)
      setShowLoginModal(false)
    })
    return unsubscribe
  }, [onSignOut])

  // When user signs in (from any method), go to app dashboard
  useEffect(() => {
    if (isAuthenticated && screen === 'landing') {
      setScreen('app')
      syncOfflineQueue().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleRequestLogin = (message) => {
    setLoginMessage(message || '')
    setShowLoginModal(true)
  }

  const handleLoginClose = () => {
    setShowLoginModal(false)
    if (isAuthenticated) {
      syncOfflineQueue().catch(() => {})
      // After login, go to app dashboard
      if (screen === 'landing') {
        setScreen('app')
      }
    }
  }

  const handleGoToApp = useCallback(() => {
    setScreen('app')
  }, [])

  // ─── Start reading from URL or file ───────────────────
  const handleStart = async ({ url, file, resumeSession }) => {
    setError('')
    setLoading(true)
    setLoadingProgress(0)

    try {
      if (resumeSession) {
        // Fetch full session data (including content_text) if not already present
        let fullSession = resumeSession
        if (!fullSession.content_text) {
          fullSession = await getSession(resumeSession.id)
          if (!fullSession || !fullSession.content_text) {
            throw new Error('Could not load session content. The session may have been deleted.')
          }
        }
        const resumeWords = textToWords(fullSession.content_text)
        setWords(resumeWords)
        setChapters(null)
        setContentText(fullSession.content_text)
        setSourceType(fullSession.source_type)
        setSourceUrl(fullSession.source_url)
        setFileInfo(fullSession.title)
        setCurrentSessionId(fullSession.id)
        setResumePosition(resumeSession.current_position || 0)
        setScreen('music')
        setLoading(false)
        return
      }

      let result
      let detectedSourceType = 'sample'
      let detectedSourceUrl = null

      if (file) {
        result = await extractTextFromFile(file, (pct) => setLoadingProgress(pct))
        detectedSourceType = 'file'
      } else if (url && url.trim()) {
        let fullUrl = url.trim()
        if (!/^https?:\/\//i.test(fullUrl)) {
          fullUrl = 'https://' + fullUrl
        }
        result = await extractTextFromURL(fullUrl)
        detectedSourceType = 'url'
        detectedSourceUrl = fullUrl
      } else {
        throw new Error('No input provided.')
      }

      const { text, pageCount, chapters: detectedChapters } = result

      setContentText(text)
      setSourceType(detectedSourceType)
      setSourceUrl(detectedSourceUrl)
      setCurrentSessionId(null)
      setResumePosition(0)

      if (detectedChapters && detectedChapters.length >= 2) {
        const chapterData = detectedChapters.map(ch => ({
          title: ch.title,
          words: textToWords(ch.text),
        })).filter(ch => ch.words.length > 3)

        if (chapterData.length >= 2) {
          setChapters(chapterData)
          setWords(chapterData[0].words)

          const totalWords = chapterData.reduce((sum, ch) => sum + ch.words.filter(w => w !== '¶').length, 0)
          if (pageCount) {
            setFileInfo(`${file.name} — ${pageCount} pages, ${chapterData.length} chapters, ~${totalWords} words`)
          } else {
            setFileInfo(file
              ? `${file.name} — ${chapterData.length} chapters, ~${totalWords} words`
              : `${chapterData.length} chapters, ~${totalWords} words`
            )
          }

          setScreen('music')
          return
        }
      }

      const wordArray = textToWords(text)
      if (wordArray.length < 5) {
        throw new Error('Not enough text to read. Try a different article or paste text directly.')
      }

      setChapters(null)
      setWords(wordArray)

      if (file && pageCount !== null) {
        const realWords = wordArray.filter(w => w !== '¶').length
        setFileInfo(`${file.name} — ${pageCount} pages, ~${realWords} words`)
      } else if (file) {
        const realWords = wordArray.filter(w => w !== '¶').length
        setFileInfo(`${file.name} — ~${realWords} words`)
      } else {
        setFileInfo('')
      }

      setScreen('music')
    } catch (err) {
      logError(err, { componentName: 'App.handleStart' })
      setError(err.message || 'Something went wrong. Please try again.')
      showToast('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setLoadingProgress(0)
    }
  }

  // ─── Start demo article ───────────────────────────────
  const handleStartDemo = () => {
    const text = DEMO_TEXT
    const wordArray = textToWords(text)
    setWords(wordArray)
    setChapters(null)
    setContentText(text)
    setSourceType('sample')
    setSourceUrl(null)
    setFileInfo('Demo Article')
    setCurrentSessionId(null)
    setResumePosition(0)
    setError('')
    setScreen('music')
  }

  // ─── Start from pasted text ───────────────────────────
  const handleStartPaste = (rawText) => {
    const text = cleanText(rawText)
    const wordArray = textToWords(text)
    if (wordArray.length < 5) {
      setError('Not enough text. Paste at least 50 words.')
      return
    }
    setWords(wordArray)
    setChapters(null)
    setContentText(text)
    setSourceType('paste')
    setSourceUrl(null)
    setFileInfo(`Pasted text — ~${wordArray.filter(w => w !== '¶').length} words`)
    setCurrentSessionId(null)
    setResumePosition(0)
    setError('')
    setScreen('music')
  }

  // ─── Music picker → create session → start reading ───
  const handleMusicConfirm = async (track) => {
    if (track) {
      audio.loadTrack(track, true)
    } else {
      audio.loadTrack(null)
    }

    if (isAuthenticated && user && !currentSessionId && sourceType !== 'sample') {
      try {
        const realWords = words.filter(w => w !== '¶').length
        const title = fileInfo || (sourceUrl ? new URL(sourceUrl).hostname : 'Pasted Text')
        const session = await createSession({
          userId: user.id,
          title,
          sourceType,
          sourceUrl,
          contentText,
          wordCount: realWords,
        })
        if (session?.id) {
          setCurrentSessionId(session.id)
        }
      } catch (err) {
        logError(err, { componentName: 'App.handleMusicConfirm' })
      }
    }

    setScreen('reader')
  }

  const handleMusicBack = () => {
    audio.stopPreview()
    setScreen(isAuthenticated ? 'app' : 'landing')
    setWords([])
    setChapters(null)
    setFileInfo('')
    setCurrentSessionId(null)
    setResumePosition(0)
  }

  const handleChapterChange = (chapterIndex) => {
    if (chapters && chapters[chapterIndex]) {
      setWords(chapters[chapterIndex].words)
    }
  }

  const handleBack = () => {
    audio.fadeOut()
    setScreen(isAuthenticated ? 'app' : 'landing')
    setWords([])
    setChapters(null)
    setError('')
    setFileInfo('')
    setSessionStats(null)
    setCurrentSessionId(null)
    setResumePosition(0)
  }

  const handleDone = async (stats) => {
    await audio.fadeOut()
    setSessionStats(stats || null)

    if (isAuthenticated && currentSessionId && stats) {
      try {
        await completeSession(currentSessionId, {
          timeSpentSeconds: stats.timeSeconds,
          averageWpm: stats.avgWpm,
          wordsRead: stats.wordsRead,
        })
      } catch (err) {
        logError(err, { componentName: 'App.handleDone' })
      }
    }

    setScreen('done')
  }

  const handleShowHistory = useCallback(() => {
    setScreen('history')
  }, [])

  const handleShowAdmin = useCallback(() => {
    setScreen('admin')
  }, [])

  const handleShowFeedbackAdmin = useCallback(() => {
    setScreen('feedback-admin')
  }, [])

  const handleHistoryBack = useCallback(() => {
    setScreen(isAuthenticated ? 'app' : 'landing')
  }, [isAuthenticated])

  // ─── Save for Later ─────────────────────────────────
  const handleSaveForLater = async (urlToSave) => {
    if (!isAuthenticated || !user) {
      handleRequestLogin('Sign in to save articles for later')
      return
    }
    try {
      let fullUrl = urlToSave.trim()
      if (!/^https?:\/\//i.test(fullUrl)) {
        fullUrl = 'https://' + fullUrl
      }
      const hostname = new URL(fullUrl).hostname.replace(/^www\./, '')
      const srcType = detectSourceType(fullUrl)
      await saveItem({
        userId: user.id,
        title: hostname,
        sourceUrl: fullUrl,
        sourceType: srcType,
      })
      showToast('Saved to reading queue!')
    } catch (err) {
      logError(err, { componentName: 'App.handleSaveForLater' })
      showToast('Failed to save. Try again.')
    }
  }

  // ─── Read Now from Queue ────────────────────────────
  const handleReadNow = (item) => {
    if (item.source_url) {
      handleStart({ url: item.source_url })
    }
  }

  return (
    <>
      {screen === 'landing' && (
        <LandingPage
          onStart={handleStart}
          onStartDemo={handleStartDemo}
          onStartPaste={handleStartPaste}
          loading={loading}
          loadingProgress={loadingProgress}
          error={error}
          onRequestLogin={handleRequestLogin}
          onShowHistory={handleShowHistory}
          onGoToApp={handleGoToApp}
        />
      )}
      {screen === 'app' && (
        <AppDashboard
          onStart={handleStart}
          onStartPaste={handleStartPaste}
          onSaveForLater={handleSaveForLater}
          onReadNow={handleReadNow}
          loading={loading}
          loadingProgress={loadingProgress}
          error={error}
          onShowHistory={handleShowHistory}
          onShowAdmin={handleShowAdmin}
          onShowFeedbackAdmin={handleShowFeedbackAdmin}
        />
      )}
      {screen === 'music' && (
        <MusicPicker
          audio={audio}
          onConfirm={handleMusicConfirm}
          onBack={handleMusicBack}
        />
      )}
      {screen === 'reader' && (
        <ErrorBoundary name="RSVPReader">
          <RSVPReader
            words={words}
            chapters={chapters}
            onChapterChange={handleChapterChange}
            sourceInfo={fileInfo}
            onBack={handleBack}
            onDone={handleDone}
            sessionId={currentSessionId}
            resumePosition={resumePosition}
          />
          <MusicPlayer audio={audio} />
        </ErrorBoundary>
      )}
      {screen === 'done' && (
        <CompletionScreen
          stats={sessionStats}
          sessionId={currentSessionId}
          onBack={handleBack}
          onRequestLogin={handleRequestLogin}
        />
      )}
      {screen === 'history' && (
        <ReadingHistory
          onBack={handleHistoryBack}
          onResume={(session) => handleStart({ resumeSession: session })}
          onReadNow={handleReadNow}
        />
      )}

      {screen === 'admin' && (
        <AdminErrors
          onBack={() => setScreen(isAuthenticated ? 'app' : 'landing')}
        />
      )}

      {screen === 'feedback-admin' && (
        <AdminFeedback
          onBack={() => setScreen(isAuthenticated ? 'app' : 'landing')}
        />
      )}

      {/* Feedback widget — hidden during active reading */}
      <FeedbackWidget hidden={screen === 'reader'} />

      {showLoginModal && (
        <LoginModal
          onClose={handleLoginClose}
          message={loginMessage}
        />
      )}
    </>
  )
}

export default App
