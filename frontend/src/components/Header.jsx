import { useState, useRef, useEffect } from 'react'
import { MapPin, Sparkles, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

export default function Header({ eventCount, loading }) {
  const { user, logout } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.display_name
    ? user.display_name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <span className="text-lg">🌉</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">SF Bay Events</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin size={10} />
                San Francisco Bay Area
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {!loading && eventCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1.5 text-xs text-slate-300">
                <Sparkles size={11} className="text-orange-400" />
                <span>{eventCount.toLocaleString()} events</span>
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Fetching…</span>
              </div>
            )}

            {/* Auth */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown((v) => !v)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {initials}
                  </div>
                  <span className="text-xs text-slate-300 hidden sm:inline max-w-[120px] truncate">
                    {user.display_name || user.email}
                  </span>
                  <ChevronDown size={12} className={`text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#16161d] border border-white/10 rounded-xl shadow-xl shadow-black/40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-xs font-semibold text-white truncate">{user.display_name || 'User'}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setShowDropdown(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <LogOut size={13} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shadow-md shadow-orange-500/20 active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}
