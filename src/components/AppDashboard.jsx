import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getReadingQueue, deleteSavedItem } from '../lib/savedItems'
import UserMenu from './UserMenu'

const TABS = [
  { id: 'paste', label: 'Paste Text', icon: 'clipboard' },
  { id: 'url', label: 'URL', icon: 'link' },
  { id: 'pdf', label: 'Upload File', icon: 'file' },
]

const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID || ''

export default function AppDashboard({ onStart, onStartPaste, onSaveForLater, onReadNow, loading = false, loadingProgress = 0, error = '', onShowHistory, onShowAdmin, onShowFeedbackAdmin }) {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('paste')
  const [url, setUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const [adminTaps, setAdminTaps] = useState(0)
  const [queue, setQueue] = useState([])
  const [queueLoading, setQueueLoading] = useState(true)

  // Fetch saved queue on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      getReadingQueue(user.id)
        .then(data => setQueue(data))
        .catch(() => setQueue([]))
        .finally(() => setQueueLoading(false))
    } else {
      setQueueLoading(false)
    }
  }, [isAuthenticated, user])

  const handleDeleteQueueItem = async (itemId) => {
    const success = await deleteSavedItem(itemId)
    if (success) {
      setQueue(prev => prev.filter(q => q.id !== itemId))
    }
  }

  const handleReadFromQueue = (item) => {
    onReadNow?.(item)
  }

  const pasteWordCount = pasteText.trim() ? pasteText.trim().split(/\s+/).length : 0
  const canStartPaste = pasteWordCount >= 50
  const hasUrlInput = url.trim().length > 0
  const hasFileInput = !!fileName

  // Secret admin access: tap logo 5 times
  const handleLogoTap = () => {
    if (user?.id !== ADMIN_USER_ID) return
    const next = adminTaps + 1
    setAdminTaps(next)
    if (next >= 5) setAdminTaps(5) // cap it
    setTimeout(() => setAdminTaps(0), 3000) // reset after 3s
  }
  const showAdminButtons = user?.id === ADMIN_USER_ID && adminTaps >= 5

  const triggerUrlStart = useCallback(() => {
    if (hasUrlInput && !loading) {
      onStart({ url })
    }
  }, [url, loading, onStart])

  const triggerFileStart = useCallback(() => {
    const file = fileInputRef.current?.files?.[0]
    if (file && !loading) {
      onStart({ file })
    }
  }, [loading, onStart])

  const handlePasteStart = () => {
    if (canStartPaste && !loading) {
      onStartPaste?.(pasteText.trim())
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && activeTab === 'url' && hasUrlInput) {
        e.preventDefault()
        triggerUrlStart()
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && activeTab === 'paste' && canStartPaste) {
        e.preventDefault()
        handlePasteStart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, hasUrlInput, canStartPaste, triggerUrlStart, pasteText, loading])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setFileName(file.name)
      fileInputRef.current.files = e.dataTransfer.files
    }
  }

  const tabIcon = (id) => {
    switch (id) {
      case 'clipboard':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
        )
      case 'link':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )
      case 'file':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )
      case 'book':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 sm:px-6 animate-fade-in relative">

      {/* Top bar */}
      <div className="absolute top-5 right-5 z-10 flex items-center gap-3">
        {showAdminButtons && (
          <>
            <button onClick={onShowFeedbackAdmin}
              className="text-xs text-text-muted hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Feedback
            </button>
            <button onClick={onShowAdmin}
              className="text-xs text-text-muted hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Errors
            </button>
          </>
        )}
        <button
          onClick={onShowHistory}
          className="text-xs text-text-muted hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          History
        </button>
        <UserMenu />
      </div>

      <div className="w-full max-w-lg pt-12 sm:pt-20 px-1">

        {/* Header — logo is tappable for secret admin */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center cursor-pointer"
              onClick={handleLogoTap}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Flowly</h1>
          </div>
          <p className="text-text-muted text-sm">
            What would you like to read?
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                ${activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-white'
                }
              `}
            >
              {tabIcon(tab.icon)}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[200px]">

          {/* Paste Text tab */}
          {activeTab === 'paste' && (
            <div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste an article, email, notes — anything you want to read faster..."
                rows={6}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted/40 resize-none focus:outline-none focus:border-accent/50 transition-colors"
              />
              <div className="flex items-center justify-between mt-2 mb-4">
                <span className={`text-[10px] ${pasteWordCount >= 50 ? 'text-green-400' : 'text-text-muted/50'}`}>
                  {pasteWordCount} word{pasteWordCount !== 1 ? 's' : ''} {pasteWordCount < 50 ? '(min 50)' : ''}
                </span>
                {pasteText.trim() && (
                  <button onClick={() => setPasteText('')} className="text-[10px] text-text-muted/40 hover:text-text-muted cursor-pointer">
                    Clear
                  </button>
                )}
              </div>
              <button
                onClick={handlePasteStart}
                disabled={!canStartPaste || loading}
                className={`
                  w-full py-3.5 rounded-xl text-sm font-semibold transition-all
                  ${canStartPaste
                    ? 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] cursor-pointer'
                    : 'bg-surface text-text-muted border border-border cursor-not-allowed'
                  }
                `}
              >
                Start Reading
              </button>
              {canStartPaste && !loading && (
                <p className="text-center text-text-muted/40 text-xs mt-3">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted text-[10px]">Cmd+Enter</kbd> to start
                </p>
              )}
            </div>
          )}

          {/* URL tab */}
          {activeTab === 'url' && (
            <div>
              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste article URL..."
                  className="w-full bg-surface border border-border rounded-xl py-3.5 pl-12 pr-4 text-text text-sm placeholder-text-muted outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={triggerUrlStart}
                  disabled={!hasUrlInput || loading}
                  className={`
                    flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all
                    ${hasUrlInput
                      ? 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] cursor-pointer'
                      : 'bg-surface text-text-muted border border-border cursor-not-allowed'
                    }
                  `}
                >
                  Start Reading
                </button>
                <button
                  onClick={async () => {
                    await onSaveForLater?.(url)
                    setUrl('')
                    // Refresh queue
                    if (isAuthenticated && user) {
                      getReadingQueue(user.id).then(data => setQueue(data)).catch(() => {})
                    }
                  }}
                  disabled={!hasUrlInput || loading}
                  title="Save for later"
                  className={`
                    px-4 py-3.5 rounded-xl text-sm font-semibold transition-all
                    ${hasUrlInput
                      ? 'bg-surface border border-border text-text-muted hover:text-white hover:border-accent/40 active:scale-[0.98] cursor-pointer'
                      : 'bg-surface text-text-muted/30 border border-border cursor-not-allowed'
                    }
                  `}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                </button>
              </div>
              {hasUrlInput && !loading && (
                <p className="text-center text-text-muted/40 text-xs mt-3">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted text-[10px]">Enter</kbd> to start · or bookmark for later
                </p>
              )}
            </div>
          )}

          {/* File Upload tab */}
          {activeTab === 'pdf' && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-4
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
              <button
                onClick={triggerFileStart}
                disabled={!hasFileInput || loading}
                className={`
                  w-full py-3.5 rounded-xl text-sm font-semibold transition-all
                  ${hasFileInput
                    ? 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] cursor-pointer'
                    : 'bg-surface text-text-muted border border-border cursor-not-allowed'
                  }
                `}
              >
                Start Reading
              </button>
            </div>
          )}

        </div>

        {/* Error */}
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

        {/* Loading */}
        {loading && (
          <div className="mt-4">
            <div className="bg-surface border border-border rounded-xl p-5 animate-pulse">
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
            </div>
          </div>
        )}

        {/* ─── Saved for Later (Queue) ─── */}
        {!queueLoading && queue.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                Saved for Later
              </h3>
              <span className="text-[10px] text-text-muted">{queue.length} item{queue.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {queue.slice(0, 5).map(item => (
                <div
                  key={item.id}
                  className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
                      <span className="capitalize">{item.source_type}</span>
                      {item.estimated_word_count && (
                        <>
                          <span className="text-text-muted/30">·</span>
                          <span>~{Math.ceil(item.estimated_word_count / 250)} min</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReadFromQueue(item)}
                      className="px-3 py-1.5 rounded-lg bg-accent text-white text-[11px] font-semibold hover:bg-accent-hover cursor-pointer transition-all active:scale-95"
                    >
                      Read
                    </button>
                    <button
                      onClick={() => handleDeleteQueueItem(item.id)}
                      className="p-1.5 rounded-lg text-text-muted/20 hover:text-red-400 cursor-pointer transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {queue.length > 5 && (
                <button
                  onClick={onShowHistory}
                  className="w-full text-center text-xs text-text-muted hover:text-accent transition-colors py-2 cursor-pointer"
                >
                  View all {queue.length} saved items →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
