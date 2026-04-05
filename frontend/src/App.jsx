import { useEffect, useState } from 'react'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import EventCard from './components/EventCard'
import SourceStats from './components/SourceStats'
import EmptyState from './components/EmptyState'
import { useEvents } from './hooks/useEvents'
import { LayoutGrid, List, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function App() {
  const { events, loading, error, fetchEvents, lastFetched } = useEvents()
  const [hasSearched, setHasSearched] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  const handleSearch = (params) => {
    setHasSearched(true)
    fetchEvents(params)
  }

  // Auto-load on mount
  useEffect(() => {
    setHasSearched(true)
    fetchEvents()
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-purple-500/4 rounded-full blur-3xl" />
      </div>

      <Header eventCount={events.length} loading={loading} />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center pt-2 pb-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            What's happening in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
              the Bay Area
            </span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            Live events aggregated from 9+ sources — updated in real time
          </p>
        </div>

        {/* Search */}
        <SearchBar onSearch={handleSearch} loading={loading} />

        {/* Stats bar */}
        {events.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <SourceStats events={events} />

            <div className="flex items-center gap-2 ml-auto">
              {lastFetched && (
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Clock size={10} />
                  {format(lastFetched, 'h:mm a')}
                </span>
              )}
              <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {(loading || error || events.length === 0) ? (
          <EmptyState error={error} loading={loading} hasSearched={hasSearched} />
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-3'
          }>
            {events.map((event) =>
              viewMode === 'grid' ? (
                <EventCard key={event.id} event={event} />
              ) : (
                <ListEventRow key={event.id} event={event} />
              )
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function ListEventRow({ event }) {
  const img = event.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200&q=60'
  return (
    <a
      href={event.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 hover:border-white/20 hover:bg-white/[0.06] transition-all"
    >
      <img
        src={img}
        alt={event.title}
        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200&q=60' }}
        className="w-14 h-14 rounded-lg object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-orange-300 transition-colors">
          {event.title}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {event.start_date && `${event.start_date.split('T')[0]} · `}
          {event.venue_name || event.city || ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-slate-400">
          {event.source}
        </span>
        {event.price && (
          <span className={`text-[10px] rounded-full px-2 py-0.5 ${event.is_free ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400'}`}>
            {event.price}
          </span>
        )}
      </div>
    </a>
  )
}
