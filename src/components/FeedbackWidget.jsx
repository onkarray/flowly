import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/errorLogger'

const TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
]

function getBrowserInfo() {
  const ua = navigator.userAgent
  let browser = 'Unknown'
  if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Safari/')) browser = 'Safari'

  return {
    browser,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }
}

export default function FeedbackWidget({ hidden = false }) {
  const { user } = useAuth()
  const showToast = useToast()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('general')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [submitting, setSubmitting] = useState(false)

  if (hidden) return null

  const canSubmit = message.trim().length >= 10

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)

    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id || null,
        feedback_type: type,
        message: message.trim(),
        user_email: email.trim() || null,
        page_url: window.location.href,
        browser_info: getBrowserInfo(),
      })

      if (error) throw error

      showToast("Thanks! We'll review this soon.", 'success')
      setMessage('')
      setType('general')
      setTimeout(() => setOpen(false), 1500)
    } catch (err) {
      logError(err, { componentName: 'FeedbackWidget' })
      showToast("Couldn't send feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-accent hover:bg-accent-hover text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Send feedback"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setOpen(false)} />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md animate-fade-in">

            {/* Close */}
            <button
              onClick={() => !submitting && setOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className="text-lg font-bold text-white mb-1">We'd love your feedback!</h2>
            <p className="text-xs text-text-muted mb-5">Help us make Flowly better</p>

            {/* Type selector */}
            <div className="mb-4">
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 block">Type</label>
              <div className="flex gap-2">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`
                      flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer
                      ${type === t.value
                        ? t.value === 'bug'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : t.value === 'feature'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-surface border border-border text-text-muted hover:text-white'
                      }
                    `}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more..."
                rows={4}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted/40 resize-none focus:outline-none focus:border-accent/50 transition-colors"
              />
              <span className={`text-[10px] ${message.trim().length >= 10 ? 'text-text-muted/40' : 'text-text-muted/60'}`}>
                {message.trim().length}/10 min characters
              </span>
            </div>

            {/* Email */}
            <div className="mb-5">
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 block">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted/40 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => !submitting && setOpen(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-surface border border-border text-text-muted hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className={`
                  flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${canSubmit && !submitting
                    ? 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] cursor-pointer'
                    : 'bg-surface text-text-muted border border-border cursor-not-allowed'
                  }
                `}
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {submitting ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
