import { Search, AlertCircle } from 'lucide-react'

export default function EmptyState({ error, loading, hasSearched }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">🌉</span>
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Finding events around the Bay…</p>
          <p className="text-slate-500 text-sm mt-1">Scraping Eventbrite, Ticketmaster, Meetup & more</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Failed to fetch events</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
          <p className="text-slate-600 text-xs mt-2">Make sure the backend is running on port 8000</p>
        </div>
      </div>
    )
  }

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="text-6xl">🌉</div>
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-white">Discover SF Bay Events</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            We pull events from <span className="text-orange-400">Eventbrite, Ticketmaster, Yelp, Meetup, SFGate, FunCheap</span> and more — all in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-500">
          {['🎵 Music', '🍕 Food', '🎨 Arts', '⚽ Sports', '💻 Tech', '🎉 Parties'].map(tag => (
            <span key={tag} className="bg-white/5 border border-white/10 rounded-full px-3 py-1">{tag}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Search size={22} className="text-slate-500" />
      </div>
      <div className="text-center">
        <p className="text-white font-medium">No events found</p>
        <p className="text-slate-500 text-sm mt-1">Try a different search or remove filters</p>
      </div>
    </div>
  )
}
