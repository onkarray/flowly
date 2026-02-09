import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginModal({ onClose, message }) {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, signInWithMagicLink } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 'google' | 'login' | 'signup' | 'magic' | 'check-email'
  const [mode, setMode] = useState('google')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const resetState = () => {
    setError('')
    setSuccess('')
    setLoading(false)
  }

  const switchMode = (newMode) => {
    resetState()
    setMode(newMode)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await signUpWithEmail(email.trim(), password)
      if (data?.user && !data.user.confirmed_at) {
        setSuccess('Check your email and click the confirmation link to activate your account.')
        setMode('check-email')
      } else {
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signInWithEmail(email.trim(), password)
      onClose()
    } catch (err) {
      if (err.message?.includes('Email not confirmed')) {
        setError('Please verify your email first. Check your inbox for a confirmation link.')
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Try again or sign up.')
      } else {
        setError(err.message || 'Sign in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signInWithMagicLink(email.trim())
      setSuccess('Magic link sent! Check your email and click the link to sign in.')
      setMode('check-email')
    } catch (err) {
      setError(err.message || 'Failed to send magic link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl p-8 w-full max-w-sm animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Flowly</span>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">
            {mode === 'signup' ? 'Create an account' :
             mode === 'check-email' ? 'Check your email' :
             mode === 'magic' ? 'Sign in with magic link' :
             message || 'Sign in to continue'}
          </h2>
          {mode !== 'check-email' && (
            <p className="text-text-muted text-sm">
              {mode === 'signup' ? 'Join Flowly to save your progress' :
               mode === 'magic' ? "We'll send a sign-in link to your email" :
               'Save your notes, track progress, and build your reading list'}
            </p>
          )}
        </div>

        {/* ─── Main view: Google + Email options ─── */}
        {mode === 'google' && (
          <>
            {/* Google sign in button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-gray-800 text-sm font-semibold hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-text-muted text-xs">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Email options */}
            <button
              onClick={() => switchMode('login')}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-border/30 text-white text-sm font-medium hover:bg-border/50 active:scale-[0.98] transition-all cursor-pointer mb-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Continue with Email
            </button>

            <button
              onClick={() => switchMode('magic')}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-text-muted text-xs font-medium hover:text-white hover:bg-border/20 transition-all cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 4-1 8 6-2-10 10 1-8-6 2z" />
              </svg>
              Use magic link instead
            </button>
          </>
        )}

        {/* ─── Email Sign In ─── */}
        {mode === 'login' && (
          <form onSubmit={handleEmailSignIn}>
            <div className="space-y-3 mb-4">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-white text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-white text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => switchMode('magic')}
                className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
              >
                Create account
              </button>
            </div>

            <button
              type="button"
              onClick={() => switchMode('google')}
              className="w-full mt-4 text-xs text-text-muted hover:text-white transition-colors cursor-pointer text-center"
            >
              ← Back to all options
            </button>
          </form>
        )}

        {/* ─── Email Sign Up ─── */}
        {mode === 'signup' && (
          <form onSubmit={handleEmailSignUp}>
            <div className="space-y-3 mb-4">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-white text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
              <input
                type="password"
                placeholder="Create password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-white text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <div className="flex items-center justify-center mt-4 gap-1">
              <span className="text-xs text-text-muted">Already have an account?</span>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </div>

            <button
              type="button"
              onClick={() => switchMode('google')}
              className="w-full mt-3 text-xs text-text-muted hover:text-white transition-colors cursor-pointer text-center"
            >
              ← Back to all options
            </button>
          </form>
        )}

        {/* ─── Magic Link ─── */}
        {mode === 'magic' && (
          <form onSubmit={handleMagicLink}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-white text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 transition-colors mb-4"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('google')}
              className="w-full mt-4 text-xs text-text-muted hover:text-white transition-colors cursor-pointer text-center"
            >
              ← Back to all options
            </button>
          </form>
        )}

        {/* ─── Check Email confirmation ─── */}
        {mode === 'check-email' && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>

            {success && (
              <p className="text-green-400 text-sm mb-4">{success}</p>
            )}

            <p className="text-text-muted text-xs mb-1">
              Sent to <span className="text-white font-medium">{email}</span>
            </p>
            <p className="text-text-muted/60 text-xs mb-6">
              Click the link in your email to continue. You can close this modal.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-border/30 text-white text-sm font-medium hover:bg-border/50 transition-all cursor-pointer"
            >
              Got it
            </button>

            <button
              type="button"
              onClick={() => switchMode('google')}
              className="w-full mt-3 text-xs text-text-muted hover:text-white transition-colors cursor-pointer text-center"
            >
              ← Back to all options
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 text-red-400 text-xs text-center">{error}</p>
        )}

        {/* Footer */}
        <p className="text-text-muted/40 text-[10px] text-center mt-6">
          You can always read without signing in
        </p>
      </div>
    </div>
  )
}
