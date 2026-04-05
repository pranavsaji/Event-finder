import { useEffect, useState } from 'react'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import EventCard from './components/EventCard'
import SourceStats from './components/SourceStats'
import EmptyState from './components/EmptyState'
import AuthModal from './components/AuthModal'
import AdminPage from './pages/AdminPage'
import { useEvents } from './hooks/useEvents'
import { useAuth } from './context/AuthContext'
import { LayoutGrid, List, Clock, MapPin, Sparkles } from 'lucide-react'
import { format } from 'date-fns'

export default function App() {
  const { user } = useAuth()
  const { events, loading, error, fetchEvents, lastFetched } = useEvents()
  const [hasSearched, setHasSearched] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [showAdmin, setShowAdmin] = useState(false)

  const handleSearch = (params) => {
    setHasSearched(true)
    fetchEvents(params)
  }

  // Auto-load only when logged in
  useEffect(() => {
    if (user) {
      setHasSearched(true)
      fetchEvents()
    }
  }, [user])

  // Show login wall if not authenticated
  if (!user) {
    return <LoginWall />
  }

  if (showAdmin && user?.is_admin) {
    return <AdminPage onBack={() => setShowAdmin(false)} />
  }

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-purple-500/4 rounded-full blur-3xl" />
      </div>

      <Header eventCount={events.length} loading={loading} onAdminClick={() => setShowAdmin(true)} />

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

function LoginWall() {
  const [showModal, setShowModal] = useState(false)
  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-purple-500/4 rounded-full blur-3xl" />
      </div>

      {/* Minimal header */}
      <header className="relative z-10 flex items-center gap-3 px-6 py-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
          <span className="text-lg">🌉</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">SF Bay Events</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin size={9} />San Francisco Bay Area
          </p>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-xs text-orange-400">
            <Sparkles size={11} />
            10 sources · real-time · free
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Discover what's happening<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
              in the Bay Area
            </span>
          </h1>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Events from Eventbrite, Ticketmaster, Luma, Yelp, Meetup and more — all in one place.
            Sign in to start exploring.
          </p>
        </div>

        {/* Source pills */}
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {['🎟 Eventbrite','🎵 Ticketmaster','⭐ Yelp','🟣 Luma','👥 Meetup','📰 SFGate','💸 FunCheap'].map(s => (
            <span key={s} className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-slate-400">{s}</span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-8 py-3 text-sm font-semibold transition-all shadow-lg shadow-orange-500/25 active:scale-95"
          >
            Sign In
          </button>
          <p className="text-xs text-slate-500">
            Invite-only · contact the admin to request access
          </p>
        </div>
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
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
