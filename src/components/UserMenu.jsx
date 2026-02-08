import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  if (!user) return null

  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const avatar = user.user_metadata?.avatar_url
  const email = user.email

  const handleSignOut = async () => {
    setOpen(false)
    try {
      await signOut()
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 cursor-pointer group"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-7 h-7 rounded-full border border-border group-hover:border-accent/50 transition-colors"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-border group-hover:border-accent/50 transition-colors flex items-center justify-center text-xs font-semibold text-accent">
            {name[0]?.toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-10 right-0 bg-surface border border-border rounded-xl p-1.5 z-30 min-w-[200px] animate-fade-in">
          {/* User info */}
          <div className="px-3 py-2.5 border-b border-border mb-1">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            {email && (
              <p className="text-[11px] text-text-muted truncate">{email}</p>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-muted hover:text-white hover:bg-border/30 transition-colors cursor-pointer flex items-center gap-2.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
