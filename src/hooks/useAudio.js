import { useState, useRef, useEffect, useCallback } from 'react'

const VOLUME_KEY = 'flowly-volume'
const FADE_DURATION = 1000

function getSavedVolume() {
  try {
    const v = localStorage.getItem(VOLUME_KEY)
    return v !== null ? parseFloat(v) : 0.5
  } catch {
    return 0.5
  }
}

function saveVolume(v) {
  try {
    localStorage.setItem(VOLUME_KEY, String(v))
  } catch {
    // localStorage not available
  }
}

export default function useAudio() {
  const [currentTrack, setCurrentTrack] = useState(null) // { id, name, src }
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(getSavedVolume)
  const [isMuted, setIsMuted] = useState(false)

  const audioRef = useRef(null)
  const fadeIntervalRef = useRef(null)

  // Create audio element once
  useEffect(() => {
    const audio = new Audio()
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = getSavedVolume()
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
    saveVolume(clamped)
    if (clamped > 0 && isMuted) {
      setIsMuted(false)
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  /**
   * Load and optionally play a track.
   * Call this only from a user interaction handler (for iOS Safari).
   */
  const loadTrack = useCallback((track, autoplay = false) => {
    const audio = audioRef.current
    if (!audio) return

    // Stop current
    audio.pause()
    audio.currentTime = 0

    if (!track) {
      setCurrentTrack(null)
      setIsPlaying(false)
      return
    }

    audio.src = track.src
    setCurrentTrack(track)

    if (autoplay) {
      const playPromise = audio.play()
      if (playPromise) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false))
      }
    }
  }, [])

  /**
   * Preview a track (play a short clip). Used in the picker.
   */
  const preview = useCallback((track) => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.src = track.src
    audio.currentTime = 0
    audio.volume = isMuted ? 0 : volume

    const p = audio.play()
    if (p) {
      p.then(() => {
        setCurrentTrack(track)
        setIsPlaying(true)
      }).catch(() => {})
    }
  }, [volume, isMuted])

  const stopPreview = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
  }, [])

  /**
   * Start playing the current track (call from user interaction).
   */
  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    audio.volume = isMuted ? 0 : volume
    const p = audio.play()
    if (p) {
      p.then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [currentTrack, volume, isMuted])

  /**
   * Pause playback.
   */
  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setIsPlaying(false)
  }, [])

  /**
   * Fade out and stop. Returns a promise that resolves when fade is complete.
   */
  const fadeOut = useCallback(() => {
    return new Promise((resolve) => {
      const audio = audioRef.current
      if (!audio || audio.paused) {
        setIsPlaying(false)
        resolve()
        return
      }

      const startVol = audio.volume
      if (startVol === 0) {
        audio.pause()
        setIsPlaying(false)
        resolve()
        return
      }

      const steps = 20
      const interval = FADE_DURATION / steps
      const decrement = startVol / steps
      let currentVol = startVol

      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)

      fadeIntervalRef.current = setInterval(() => {
        currentVol -= decrement
        if (currentVol <= 0) {
          clearInterval(fadeIntervalRef.current)
          fadeIntervalRef.current = null
          audio.volume = 0
          audio.pause()
          // Restore volume setting for next play
          audio.volume = isMuted ? 0 : volume
          setIsPlaying(false)
          resolve()
        } else {
          audio.volume = currentVol
        }
      }, interval)
    })
  }, [volume, isMuted])

  /**
   * Clean up everything.
   */
  const destroy = useCallback(() => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
    }
    setCurrentTrack(null)
    setIsPlaying(false)
  }, [])

  return {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    loadTrack,
    preview,
    stopPreview,
    play,
    pause,
    fadeOut,
    destroy,
  }
}
