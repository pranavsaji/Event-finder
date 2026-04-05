import { Search, Filter, X, RefreshCw } from 'lucide-react'
import { useState } from 'react'

const CATEGORIES = [
  'All', 'Music', 'Food & Drink', 'Arts', 'Sports', 'Tech',
  'Community', 'Nightlife', 'Film', 'Family', 'Business',
]

const SOURCES = [
  'All Sources', 'Eventbrite', 'Ticketmaster', 'Yelp', 'Meetup',
  'SFGate', 'FunCheap SF', 'SF Chronicle', 'AllEvents.in',
]

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [source, setSource] = useState('All Sources')

  const submit = (overrides = {}) => {
    const q = overrides.query ?? query
    const cat = overrides.category ?? category
    const src = overrides.source ?? source
    onSearch({
      q,
      category: cat === 'All' ? '' : cat,
      source: src === 'All Sources' ? '' : src,
    })
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') submit()
  }

  const clear = () => {
    setQuery('')
    submit({ query: '' })
  }

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Search events, venues, artists…"
          className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.08] transition-all"
        />
        {query && (
          <button onClick={clear} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={13} className="text-slate-500" />

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat)
                submit({ category: cat })
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                category === cat
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Source select */}
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            submit({ source: e.target.value })
          }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500/40 cursor-pointer"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s} className="bg-slate-900">
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={() => submit()}
          disabled={loading}
          className="ml-auto flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-md shadow-orange-500/20 active:scale-95"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
