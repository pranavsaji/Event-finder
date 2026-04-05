import { MapPin, Sparkles } from 'lucide-react'

export default function Header({ eventCount, loading }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
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

        <div className="flex items-center gap-3">
          {!loading && eventCount > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1.5 text-xs text-slate-300">
              <Sparkles size={11} className="text-orange-400" />
              <span>{eventCount.toLocaleString()} events found</span>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Fetching events…
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
