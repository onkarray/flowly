import { useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import LandingPage from './components/LandingPage'
import MusicPicker from './components/MusicPicker'
import RSVPReader from './components/RSVPReader'
import CompletionScreen from './components/CompletionScreen'
import MusicPlayer from './components/MusicPlayer'
import useAudio from './hooks/useAudio'
import { extractTextFromURL, extractTextFromFile, textToWords } from './utils/extractText'

const SAMPLE_TEXT = `The human brain is an extraordinary machine capable of processing information at speeds far beyond what most people realize. Traditional reading methods taught in schools barely scratch the surface of our cognitive potential.

When we read normally, our eyes move in small jumps called saccades, pausing briefly on each word or group of words. These pauses, known as fixations, are where actual reading happens. But here is the secret most people never learn.

A huge amount of time during normal reading is wasted on unnecessary eye movements, re-reading, and subvocalization, that inner voice that reads along with you. Speed reading techniques like RSVP, which stands for Rapid Serial Visual Presentation, eliminate these inefficiencies by presenting words one at a time in a fixed position.

Your eyes stay still while words come to you. This removes saccadic movement entirely and forces your brain to process words faster. Research shows that with practice, most people can comfortably read at three hundred to five hundred words per minute using RSVP, compared to the average reading speed of two hundred to two hundred fifty words per minute.

The key is starting at a comfortable speed and gradually increasing. Your brain will adapt. Within a few sessions, speeds that once felt impossibly fast begin to feel natural. The future of reading is not about moving your eyes faster. It is about letting the words move to you.`

function App() {
  const [screen, setScreen] = useState('landing')
  const [words, setWords] = useState([])
  const [chapters, setChapters] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState('')
  const [fileInfo, setFileInfo] = useState('')
  const [sessionStats, setSessionStats] = useState(null)

  const audio = useAudio()

  // Step 1: Landing page → extract text → go to music picker
  const handleStart = async ({ url, file }) => {
    setError('')
    setLoading(true)
    setLoadingProgress(0)

    try {
      let result

      if (file) {
        result = await extractTextFromFile(file, (pct) => setLoadingProgress(pct))
      } else if (url && url.trim()) {
        let fullUrl = url.trim()
        if (!/^https?:\/\//i.test(fullUrl)) {
          fullUrl = 'https://' + fullUrl
        }
        result = await extractTextFromURL(fullUrl)
      } else {
        result = { text: SAMPLE_TEXT, pageCount: null, chapters: null }
      }

      const { text, pageCount, chapters: detectedChapters } = result

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
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setLoadingProgress(0)
    }
  }

  // Step 2: Music picker → start reading with selected track
  const handleMusicConfirm = (track) => {
    if (track) {
      // loadTrack + autoplay — called from user click so iOS Safari allows it
      audio.loadTrack(track, true)
    } else {
      audio.loadTrack(null)
    }
    setScreen('reader')
  }

  const handleMusicBack = () => {
    audio.stopPreview()
    setScreen('landing')
    setWords([])
    setChapters(null)
    setFileInfo('')
  }

  const handleChapterChange = (chapterIndex) => {
    if (chapters && chapters[chapterIndex]) {
      setWords(chapters[chapterIndex].words)
    }
  }

  const handleBack = () => {
    audio.fadeOut()
    setScreen('landing')
    setWords([])
    setChapters(null)
    setError('')
    setFileInfo('')
    setSessionStats(null)
  }

  const handleDone = async (stats) => {
    await audio.fadeOut()
    setSessionStats(stats || null)
    setScreen('done')
  }

  return (
    <>
      {screen === 'landing' && (
        <LandingPage
          onStart={handleStart}
          loading={loading}
          loadingProgress={loadingProgress}
          error={error}
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
        <>
          <RSVPReader
            words={words}
            chapters={chapters}
            onChapterChange={handleChapterChange}
            sourceInfo={fileInfo}
            onBack={handleBack}
            onDone={handleDone}
          />
          <MusicPlayer audio={audio} />
        </>
      )}
      {screen === 'done' && (
        <CompletionScreen
          stats={sessionStats}
          onBack={handleBack}
        />
      )}
      <Analytics />
    </>
  )
}

export default App
