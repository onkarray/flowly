import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID || ''

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const TYPE_STYLES = {
  bug: 'bg-red-500/15 text-red-400 border-red-500/30',
  feature: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  general: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

export default function AdminFeedback({ onBack }) {
  const { user, isAuthenticated } = useAuth()
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const isAdmin = isAuthenticated && user && user.id === ADMIN_USER_ID

  useEffect(() => {
    if (!isAdmin) return
    fetchFeedback()
  }, [isAdmin, typeFilter, statusFilter])

  async function fetchFeedback() {
    setLoading(true)
    try {
      let query = supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (typeFilter !== 'all') query = query.eq('feedback_type', typeFilter)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) throw error
      setFeedback(data || [])
    } catch (err) {
      console.warn('Failed to fetch feedback:', err)
      setFeedback([])
    } finally {
      setLoading(false)
    }
  }

  async function markReviewed(id) {
    try {
      await supabase
        .from('feedback')
        .update({ status: 'reviewed' })
        .eq('id', id)

      setFeedback(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'reviewed' } : f
      ))
      if (selected?.id === id) {
        setSelected(prev => ({ ...prev, status: 'reviewed' }))
      }
    } catch (err) {
      console.warn('Failed to update feedback:', err)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 animate-fade-in">
        <p className="text-text-muted text-sm mb-4">Access denied</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-xs font-medium bg-surface border border-border text-white hover:border-accent/30 transition-all cursor-pointer"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 py-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-text-muted hover:text-white transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Feedback</h1>
          <span className="text-xs text-text-muted bg-surface border border-border rounded-full px-2.5 py-0.5">
            {feedback.length}
          </span>
        </div>
        <button
          onClick={fetchFeedback}
          className="text-xs text-text-muted hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1.5">
          {['all', 'bug', 'feature', 'general'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize
                ${typeFilter === t
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-text-muted hover:text-white'
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {['all', 'new', 'reviewed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize
                ${statusFilter === s
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-text-muted hover:text-white'
                }
              `}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {!loading && feedback.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm text-text-muted">No feedback yet</p>
        </div>
      )}

      {/* Feedback list */}
      {!loading && feedback.length > 0 && (
        <div className="space-y-2">
          {feedback.map(fb => (
            <button
              key={fb.id}
              onClick={() => setSelected(fb)}
              className={`
                w-full text-left bg-surface border rounded-xl px-4 py-3 transition-all cursor-pointer hover:border-accent/30
                ${fb.status === 'reviewed' ? 'border-border/50 opacity-60' : 'border-border'}
              `}
            >
              <div className="flex items-start gap-3">
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${TYPE_STYLES[fb.feedback_type] || TYPE_STYLES.general}`}>
                  {fb.feedback_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{fb.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-text-muted">{formatDate(fb.created_at)}</span>
                    {fb.user_email && (
                      <span className="text-[10px] text-text-muted/60 truncate">{fb.user_email}</span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${fb.status === 'reviewed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {fb.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-fade-in">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2.5 py-0.5 rounded text-xs font-medium border capitalize ${TYPE_STYLES[selected.feedback_type] || TYPE_STYLES.general}`}>
                {selected.feedback_type}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${selected.status === 'reviewed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {selected.status}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider">Message</label>
                <p className="text-sm text-white mt-0.5 whitespace-pre-wrap">{selected.message}</p>
              </div>

              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider">Date</label>
                <p className="text-xs text-text-muted mt-0.5">{formatDate(selected.created_at)}</p>
              </div>

              {selected.user_email && (
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider">Email</label>
                  <p className="text-xs text-text-muted mt-0.5">{selected.user_email}</p>
                </div>
              )}

              {selected.user_id && (
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider">User ID</label>
                  <p className="text-xs text-text-muted mt-0.5 font-mono">{selected.user_id}</p>
                </div>
              )}

              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider">Page URL</label>
                <p className="text-xs text-text-muted mt-0.5 break-all">{selected.page_url}</p>
              </div>

              {selected.browser_info && (
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider">Browser</label>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selected.browser_info.browser} — {selected.browser_info.platform} — {selected.browser_info.viewportWidth}x{selected.browser_info.viewportHeight}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              {selected.status !== 'reviewed' && (
                <button
                  onClick={() => markReviewed(selected.id)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-all cursor-pointer"
                >
                  Mark Reviewed
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-surface border border-border text-text-muted hover:text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
