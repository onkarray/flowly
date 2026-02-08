import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllSessions, deleteSession } from '../lib/sessions'
import { getSessionNotes, deleteNote, updateNote, exportNotesAsMarkdown } from '../lib/notes'
import { getReadingQueue, deleteSavedItem, updateItemStatus } from '../lib/savedItems'

function formatTime(seconds) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function isWithinDays(dateStr, days) {
  return (Date.now() - new Date(dateStr).getTime()) < days * 86400000
}

// ─── Stats computations ─────────────────────────────
function computeStats(sessions) {
  const now = Date.now()
  const weekMs = 7 * 86400000
  const monthMs = 30 * 86400000

  let weekWords = 0
  let monthWords = 0
  let totalTime = 0
  let totalWpm = 0
  let wpmCount = 0

  for (const s of sessions) {
    const age = now - new Date(s.last_read_at || s.created_at).getTime()
    const words = s.completed ? (s.word_count || 0) : (s.current_position || 0)

    if (age < weekMs) weekWords += words
    if (age < monthMs) monthWords += words
    totalTime += s.time_spent_seconds || 0

    if (s.average_wpm && s.average_wpm > 0) {
      totalWpm += s.average_wpm
      wpmCount++
    }
  }

  const avgWpm = wpmCount > 0 ? Math.round(totalWpm / wpmCount) : 0
  // Time saved: reading at avgWpm vs 230 WPM (average reader)
  const normalTime = monthWords > 0 ? Math.round((monthWords / 230) * 60) : 0
  const actualTime = monthWords > 0 && avgWpm > 0 ? Math.round((monthWords / avgWpm) * 60) : 0
  const timeSaved = Math.max(0, normalTime - actualTime)

  // Reading streak: count consecutive days with sessions
  const sessionDays = new Set(
    sessions.map(s => new Date(s.last_read_at || s.created_at).toDateString())
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (sessionDays.has(d.toDateString())) {
      streak++
    } else if (i > 0) break // allow today to not have a session yet
  }

  return { weekWords, monthWords, avgWpm, timeSaved, streak, totalTime }
}

export default function ReadingHistory({ onBack, onResume, onReadNow }) {
  const { user, isAuthenticated } = useAuth()
  const [sessions, setSessions] = useState([])
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [notes, setNotes] = useState({})
  const [loadingNotes, setLoadingNotes] = useState({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'in_progress', 'completed'
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editNoteText, setEditNoteText] = useState('')
  const [activeTab, setActiveTab] = useState('sessions') // 'sessions', 'queue'

  useEffect(() => {
    if (isAuthenticated && user) {
      Promise.all([
        getAllSessions(user.id),
        getReadingQueue(user.id),
      ])
        .then(([sessionData, queueData]) => {
          setSessions(sessionData)
          setQueue(queueData)
        })
        .catch(() => {
          setSessions([])
          setQueue([])
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  const stats = useMemo(() => computeStats(sessions), [sessions])

  const toggleExpand = async (sessionId) => {
    if (expandedId === sessionId) {
      setExpandedId(null)
      return
    }
    setExpandedId(sessionId)

    if (!notes[sessionId]) {
      setLoadingNotes(prev => ({ ...prev, [sessionId]: true }))
      try {
        const sessionNotes = await getSessionNotes(sessionId)
        setNotes(prev => ({ ...prev, [sessionId]: sessionNotes }))
      } catch {
        setNotes(prev => ({ ...prev, [sessionId]: [] }))
      } finally {
        setLoadingNotes(prev => ({ ...prev, [sessionId]: false }))
      }
    }
  }

  const handleDeleteSession = async (sessionId) => {
    const success = await deleteSession(sessionId)
    if (success) {
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (expandedId === sessionId) setExpandedId(null)
    }
  }

  const handleDeleteNote = async (sessionId, noteId) => {
    const success = await deleteNote(noteId)
    if (success) {
      setNotes(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).filter(n => n.id !== noteId)
      }))
    }
  }

  const startEditNote = (note) => {
    setEditingNoteId(note.id)
    setEditNoteText(note.note_text)
  }

  const saveEditNote = async (sessionId, noteId) => {
    if (!editNoteText.trim()) return
    const updated = await updateNote(noteId, editNoteText.trim())
    if (updated) {
      setNotes(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).map(n => n.id === noteId ? { ...n, note_text: editNoteText.trim() } : n)
      }))
    }
    setEditingNoteId(null)
    setEditNoteText('')
  }

  const handleExportNotes = (session) => {
    const sessionNotes = notes[session.id] || []
    if (sessionNotes.length === 0) return
    const md = exportNotesAsMarkdown(session.title, sessionNotes)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.title.replace(/[^a-zA-Z0-9]/g, '_')}_notes.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteQueueItem = async (itemId) => {
    const success = await deleteSavedItem(itemId)
    if (success) {
      setQueue(prev => prev.filter(q => q.id !== itemId))
    }
  }

  const handleReadNowFromQueue = async (item) => {
    await updateItemStatus(item.id, 'reading')
    onReadNow?.(item)
  }

  // Move queue item up/down
  const moveQueueItem = (index, direction) => {
    const newQueue = [...queue]
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= newQueue.length) return
    ;[newQueue[index], newQueue[targetIdx]] = [newQueue[targetIdx], newQueue[index]]
    setQueue(newQueue)
    // We don't persist priority changes immediately to avoid excessive API calls
    // Priority is the visual order in the queue
  }

  const filteredSessions = useMemo(() => {
    let result = sessions
    if (filter === 'in_progress') result = result.filter(s => !s.completed)
    if (filter === 'completed') result = result.filter(s => s.completed)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s => s.title.toLowerCase().includes(q))
    }
    return result
  }, [sessions, filter, search])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 animate-fade-in">
        <div className="text-center">
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-xl font-bold text-white mb-2">My Library</h2>
          <p className="text-text-muted text-sm mb-6">Sign in to see your reading history</p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover cursor-pointer transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 py-8 animate-fade-in">
      <div className="w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-white">My Library</h2>
          </div>
        </div>

        {/* Stats Dashboard */}
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-surface border border-border rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white">{stats.weekWords.toLocaleString()}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Words this week</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-accent">{stats.streak}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Day streak</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white">{stats.avgWpm || '—'}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Avg WPM</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-green-400">{formatTime(stats.timeSaved)}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Time saved</div>
            </div>
          </div>
        )}

        {/* Tabs: Sessions / Queue */}
        <div className="flex items-center gap-1 mb-5 bg-surface border border-border rounded-xl p-1">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-white'
            }`}
          >
            Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-white'
            }`}
          >
            Queue ({queue.length})
          </button>
        </div>

        {/* ─── Sessions Tab ─────────────────────────────── */}
        {activeTab === 'sessions' && (
          <>
            {/* Filters + Search */}
            <div className="flex items-center gap-3 mb-5">
              {/* Filter pills */}
              <div className="flex items-center gap-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'in_progress', label: 'In Progress' },
                  { key: 'completed', label: 'Completed' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      filter === f.key
                        ? 'bg-accent/15 text-accent border border-accent/25'
                        : 'text-text-muted hover:text-white border border-transparent hover:border-border'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-bg border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-text-muted/40 outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {/* Empty state */}
            {!loading && sessions.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">📖</div>
                <h3 className="text-lg font-semibold text-white mb-2">No sessions yet</h3>
                <p className="text-text-muted text-sm mb-6">Start reading to build your library</p>
                <button
                  onClick={onBack}
                  className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover cursor-pointer transition-all"
                >
                  Start Reading
                </button>
              </div>
            )}

            {/* Sessions list */}
            {!loading && filteredSessions.length > 0 && (
              <div className="space-y-2.5">
                {filteredSessions.map(session => {
                  const isExpanded = expandedId === session.id
                  const progressPct = session.word_count > 0
                    ? Math.round((session.current_position / session.word_count) * 100)
                    : 0
                  const sessionNotes = notes[session.id] || []
                  const sourceIcon = session.source_type === 'url' ? '🔗' : session.source_type === 'file' ? '📄' : '📝'

                  return (
                    <div
                      key={session.id}
                      className={`bg-surface border rounded-xl transition-all ${
                        isExpanded ? 'border-accent/30' : 'border-border'
                      }`}
                    >
                      {/* Session header */}
                      <button
                        onClick={() => toggleExpand(session.id)}
                        className="w-full text-left px-4 py-3.5 cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs">{sourceIcon}</span>
                              <h4 className="text-sm font-medium text-white truncate">{session.title}</h4>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-[10px] text-text-muted">
                              <span>{formatDate(session.created_at)}</span>
                              <span className="text-text-muted/30">·</span>
                              <span>{session.word_count?.toLocaleString()} words</span>
                              <span className="text-text-muted/30">·</span>
                              <span>{formatTime(session.time_spent_seconds)}</span>
                              {session.average_wpm > 0 && (
                                <>
                                  <span className="text-text-muted/30">·</span>
                                  <span className="text-accent">{session.average_wpm} WPM</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {session.completed ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                                Complete
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                                {progressPct}%
                              </span>
                            )}
                            <svg
                              width="14" height="14"
                              viewBox="0 0 24 24"
                              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              className={`text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {!session.completed && (
                          <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-accent/50 rounded-full" style={{ width: `${progressPct}%` }} />
                          </div>
                        )}
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border/50 pt-3">
                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mb-4 flex-wrap">
                            {!session.completed ? (
                              <button
                                onClick={() => onResume(session)}
                                className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                                Continue Reading
                              </button>
                            ) : (
                              <button
                                onClick={() => onResume({ ...session, current_position: 0 })}
                                className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="1 4 1 10 7 10" />
                                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                </svg>
                                Read Again
                              </button>
                            )}
                            {sessionNotes.length > 0 && (
                              <button
                                onClick={() => handleExportNotes(session)}
                                className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-muted text-xs hover:text-white hover:border-accent/30 cursor-pointer transition-all"
                              >
                                Export Notes
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-red-400/60 text-xs hover:text-red-400 hover:border-red-500/30 cursor-pointer transition-all ml-auto"
                            >
                              Delete
                            </button>
                          </div>

                          {/* Notes */}
                          {loadingNotes[session.id] ? (
                            <div className="flex items-center gap-2 py-3">
                              <svg className="animate-spin h-3.5 w-3.5 text-accent" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span className="text-xs text-text-muted">Loading notes...</span>
                            </div>
                          ) : sessionNotes.length > 0 ? (
                            <div>
                              <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                                Notes ({sessionNotes.length})
                              </h5>
                              <div className="space-y-2">
                                {sessionNotes.map(note => (
                                  <div key={note.id} className="bg-bg border border-border/50 rounded-lg p-3">
                                    {editingNoteId === note.id ? (
                                      <div>
                                        <textarea
                                          value={editNoteText}
                                          onChange={(e) => setEditNoteText(e.target.value)}
                                          rows={2}
                                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-accent/50"
                                          autoFocus
                                        />
                                        <div className="flex gap-2 mt-2">
                                          <button
                                            onClick={() => saveEditNote(session.id, note.id)}
                                            className="px-2.5 py-1 rounded-lg bg-accent text-white text-[10px] font-semibold hover:bg-accent-hover cursor-pointer"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => setEditingNoteId(null)}
                                            className="px-2.5 py-1 rounded-lg bg-surface border border-border text-text-muted text-[10px] hover:text-white cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className="text-xs text-white/90 leading-relaxed">{note.note_text}</p>
                                        <div className="flex items-center justify-between mt-2">
                                          <span className="text-[10px] text-text-muted/40">
                                            {note.word_position > 0 ? `Word #${note.word_position}` : 'Session note'}
                                            {' · '}
                                            {new Date(note.created_at).toLocaleString()}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => startEditNote(note)}
                                              className="text-[10px] text-text-muted/40 hover:text-accent cursor-pointer transition-colors"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => handleDeleteNote(session.id, note.id)}
                                              className="text-[10px] text-text-muted/40 hover:text-red-400 cursor-pointer transition-colors"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-text-muted/40 py-2">No notes for this session</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* No search/filter results */}
            {!loading && (search.trim() || filter !== 'all') && filteredSessions.length === 0 && sessions.length > 0 && (
              <div className="text-center py-12">
                <p className="text-text-muted text-sm">No sessions match your filters</p>
                <button
                  onClick={() => { setSearch(''); setFilter('all') }}
                  className="text-accent text-xs mt-2 hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── Queue Tab ────────────────────────────────── */}
        {activeTab === 'queue' && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-20">
                <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {!loading && queue.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">🔖</div>
                <h3 className="text-lg font-semibold text-white mb-2">Queue is empty</h3>
                <p className="text-text-muted text-sm mb-6">Save articles for later from the homepage</p>
                <button
                  onClick={onBack}
                  className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover cursor-pointer transition-all"
                >
                  Go Home
                </button>
              </div>
            )}

            {!loading && queue.length > 0 && (
              <div className="space-y-2">
                {queue.map((item, index) => {
                  const estTime = item.estimated_word_count
                    ? `~${Math.ceil(item.estimated_word_count / 250)} min`
                    : null

                  return (
                    <div
                      key={item.id}
                      className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3"
                    >
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => moveQueueItem(index, -1)}
                          disabled={index === 0}
                          className={`p-0.5 rounded cursor-pointer ${index === 0 ? 'text-text-muted/10' : 'text-text-muted/40 hover:text-white'}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveQueueItem(index, 1)}
                          disabled={index === queue.length - 1}
                          className={`p-0.5 rounded cursor-pointer ${index === queue.length - 1 ? 'text-text-muted/10' : 'text-text-muted/40 hover:text-white'}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
                          <span className="capitalize">{item.source_type}</span>
                          {estTime && (
                            <>
                              <span className="text-text-muted/30">·</span>
                              <span>{estTime}</span>
                            </>
                          )}
                          <span className="text-text-muted/30">·</span>
                          <span>{formatDate(item.added_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleReadNowFromQueue(item)}
                          className="px-3 py-1.5 rounded-lg bg-accent text-white text-[11px] font-semibold hover:bg-accent-hover cursor-pointer transition-all"
                        >
                          Read Now
                        </button>
                        <button
                          onClick={() => handleDeleteQueueItem(item.id)}
                          className="p-1.5 rounded-lg text-text-muted/40 hover:text-red-400 cursor-pointer transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
