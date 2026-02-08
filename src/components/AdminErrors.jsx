import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID || ''

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AdminErrors({ onBack }) {
  const { user, isAuthenticated } = useAuth()
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unresolved') // 'all' | 'unresolved' | 'resolved'
  const [selectedError, setSelectedError] = useState(null)

  const isAdmin = isAuthenticated && user && user.id === ADMIN_USER_ID

  useEffect(() => {
    if (!isAdmin) return
    fetchErrors()
  }, [isAdmin, filter])

  async function fetchErrors() {
    setLoading(true)
    try {
      let query = supabase
        .from('errors')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(100)

      if (filter === 'unresolved') query = query.eq('resolved', false)
      if (filter === 'resolved') query = query.eq('resolved', true)

      const { data, error } = await query
      if (error) throw error
      setErrors(data || [])
    } catch (err) {
      console.warn('Failed to fetch errors:', err)
      setErrors([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleResolved(errorId, currentResolved) {
    try {
      await supabase
        .from('errors')
        .update({ resolved: !currentResolved })
        .eq('id', errorId)

      setErrors(prev => prev.map(e =>
        e.id === errorId ? { ...e, resolved: !currentResolved } : e
      ))
      if (selectedError?.id === errorId) {
        setSelectedError(prev => ({ ...prev, resolved: !currentResolved }))
      }
    } catch (err) {
      console.warn('Failed to update error:', err)
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
          <h1 className="text-xl font-bold text-white">Error Tracker</h1>
          <span className="text-xs text-text-muted bg-surface border border-border rounded-full px-2.5 py-0.5">
            {errors.length}
          </span>
        </div>
        <button
          onClick={fetchErrors}
          className="text-xs text-text-muted hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {['unresolved', 'resolved', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize
              ${filter === f
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-text-muted hover:text-white'
              }
            `}
          >
            {f}
          </button>
        ))}
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
      {!loading && errors.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sm text-text-muted">No errors yet!</p>
        </div>
      )}

      {/* Error list */}
      {!loading && errors.length > 0 && (
        <div className="space-y-2">
          {errors.map(err => (
            <button
              key={err.id}
              onClick={() => setSelectedError(err)}
              className={`
                w-full text-left bg-surface border rounded-xl px-4 py-3 transition-all cursor-pointer hover:border-accent/30
                ${err.resolved ? 'border-border/50 opacity-60' : 'border-border'}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${err.resolved ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{err.error_message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-text-muted">{formatDate(err.occurred_at)}</span>
                    {err.component_name && (
                      <span className="text-[10px] text-text-muted/60">{err.component_name}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleResolved(err.id, err.resolved) }}
                  className={`
                    shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer
                    ${err.resolved
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                      : 'bg-surface border border-border text-text-muted hover:text-white hover:border-accent/30'
                    }
                  `}
                >
                  {err.resolved ? 'Resolved' : 'Resolve'}
                </button>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedError(null)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-fade-in">
            <button
              onClick={() => setSelectedError(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 className="text-sm font-semibold text-white mb-4 pr-8">Error Details</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider">Message</label>
                <p className="text-sm text-white mt-0.5">{selectedError.error_message}</p>
              </div>

              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider">Time</label>
                <p className="text-xs text-text-muted mt-0.5">{formatDate(selectedError.occurred_at)}</p>
              </div>

              {selectedError.component_name && (
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider">Component</label>
                  <p className="text-xs text-text-muted mt-0.5">{selectedError.component_name}</p>
                </div>
              )}

              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider">Page URL</label>
                <p className="text-xs text-text-muted mt-0.5 break-all">{selectedError.page_url}</p>
              </div>

              {selectedError.user_id && (
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider">User ID</label>
                  <p className="text-xs text-text-muted mt-0.5 font-mono">{selectedError.user_id}</p>
                </div>
              )}

              {selectedError.browser_info && (
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider">Browser</label>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedError.browser_info.browser} — {selectedError.browser_info.platform} — {selectedError.browser_info.viewportWidth}x{selectedError.browser_info.viewportHeight}
                  </p>
                </div>
              )}

              {selectedError.error_stack && (
                <div>
                  <label className="text-[10px] text-text-muted uppercase tracking-wider">Stack Trace</label>
                  <pre className="mt-1 p-3 rounded-lg bg-bg border border-border text-[10px] text-text-muted overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                    {selectedError.error_stack}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => toggleResolved(selectedError.id, selectedError.resolved)}
                className={`
                  flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer
                  ${selectedError.resolved
                    ? 'bg-surface border border-border text-text-muted hover:text-white'
                    : 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
                  }
                `}
              >
                {selectedError.resolved ? 'Mark Unresolved' : 'Mark Resolved'}
              </button>
              <button
                onClick={() => setSelectedError(null)}
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
