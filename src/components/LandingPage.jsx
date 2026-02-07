import { useState, useRef, useEffect, useCallback } from 'react'

export default function LandingPage({ onStart, loading = false, loadingProgress = 0, error = '' }) {
  const [url, setUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const triggerStart = useCallback(() => {
    const hasInput = url.trim() || fileName
    if (hasInput && !loading) {
      onStart({ url, file: fileInputRef.current?.files?.[0] })
    }
  }, [url, fileName, loading, onStart])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        triggerStart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [triggerStart])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      setUrl('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setFileName(file.name)
      setUrl('')
      fileInputRef.current.files = e.dataTransfer.files
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => setDragActive(false)

  const handleUrlChange = (e) => {
    setUrl(e.target.value)
    setFileName('')
  }

  const hasInput = url.trim() || fileName

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 animate-fade-in">
      <div className="w-full max-w-lg">

        {/* Logo / Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Flowly</h1>
          </div>
          <p className="text-text-muted text-sm">
            Read faster. Absorb more. One word at a time.
          </p>
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="Paste article URL..."
              className="w-full bg-surface border border-border rounded-xl py-3.5 pl-12 pr-4 text-text text-sm placeholder-text-muted outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* File Upload */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragActive
              ? 'border-accent bg-accent/5'
              : fileName
                ? 'border-accent/50 bg-surface'
                : 'border-border bg-surface hover:border-text-muted'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          {fileName ? (
            <div>
              <div className="text-accent mb-1">
                <svg className="inline" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-sm text-white font-medium">{fileName}</p>
              <p className="text-xs text-text-muted mt-1">Click to change file</p>
            </div>
          ) : (
            <div>
              <div className="text-text-muted mb-2">
                <svg className="inline" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-sm text-text-muted">
                Drop a file here or <span className="text-accent">browse</span>
              </p>
              <p className="text-xs text-text-muted/60 mt-1">PDF, DOC, DOCX, or TXT</p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-6 space-y-3 animate-pulse">
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <svg className="animate-spin h-5 w-5 text-accent shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-text-muted">
                  {loadingProgress > 0 ? `Extracting text... ${loadingProgress}%` : 'Extracting text...'}
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
              {loadingProgress === 0 && (
                <div className="space-y-2">
                  <div className="h-2 rounded-full w-full animate-shimmer" />
                  <div className="h-2 rounded-full w-4/5 animate-shimmer" />
                  <div className="h-2 rounded-full w-3/5 animate-shimmer" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Start Button */}
        {!loading && (
          <button
            onClick={triggerStart}
            disabled={!hasInput}
            className={`
              w-full mt-6 py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${hasInput
                ? 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] cursor-pointer'
                : 'bg-surface text-text-muted border border-border cursor-not-allowed'
              }
            `}
          >
            Start Reading
          </button>
        )}

        {/* Keyboard hint */}
        {!loading && (
          <p className="text-center text-text-muted/40 text-xs mt-6">
            Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted text-[10px]">Enter</kbd> to start
          </p>
        )}
      </div>
    </div>
  )
}
