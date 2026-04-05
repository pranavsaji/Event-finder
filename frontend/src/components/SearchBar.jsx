import { Search, Filter, X, RefreshCw, Calendar, Tag } from 'lucide-react'
import { useState } from 'react'

const CATEGORIES = [
  'All', 'Music', 'Food & Drink', 'Arts', 'Sports', 'Tech',
  'Community', 'Nightlife', 'Film', 'Family', 'Business',
]

const DATE_RANGES = [
  { label: 'Any Date', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'This Weekend', value: 'weekend' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
]

const SOURCES = [
  'All Sources', 'Eventbrite', 'Ticketmaster', 'Yelp', 'Meetup',
  'SFGate', 'FunCheap SF', 'SF Chronicle', 'AllEvents.in',
]

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [source, setSource] = useState('All Sources')
  const [dateRange, setDateRange] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)

  const submit = (overrides = {}) => {
    onSearch({
      q: overrides.query ?? query,
      category: (overrides.category ?? category) === 'All' ? '' : (overrides.category ?? category),
      source: (overrides.source ?? source) === 'All Sources' ? '' : (overrides.source ?? source),
      date_range: overrides.dateRange ?? dateRange,
      free_only: overrides.freeOnly ?? freeOnly,
    })
  }

  const handleKey = (e) => { if (e.key === 'Enter') submit() }

  const clear = () => { setQuery(''); submit({ query: '' }) }

  const setAndSubmit = (updates) => {
    const next = {
      query: updates.query ?? query,
      category: updates.category ?? category,
      source: updates.source ?? source,
      dateRange: updates.dateRange ?? dateRange,
      freeOnly: updates.freeOnly ?? freeOnly,
    }
    if (updates.category !== undefined) setCategory(updates.category)
    if (updates.source !== undefined) setSource(updates.source)
    if (updates.dateRange !== undefined) setDateRange(updates.dateRange)
    if (updates.freeOnly !== undefined) setFreeOnly(updates.freeOnly)
    onSearch({
      q: next.query,
      category: next.category === 'All' ? '' : next.category,
      source: next.source === 'All Sources' ? '' : next.source,
      date_range: next.dateRange,
      free_only: next.freeOnly,
    })
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

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <Tag size={12} className="text-slate-500 shrink-0" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setAndSubmit({ category: cat })}
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

      {/* Date + Source + Free row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Calendar size={12} className="text-slate-500 shrink-0" />

        {/* Date range pills */}
        {DATE_RANGES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setAndSubmit({ dateRange: value })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              dateRange === value
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Free only toggle */}
        <button
          onClick={() => setAndSubmit({ freeOnly: !freeOnly })}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            freeOnly
              ? 'bg-green-500/80 text-white shadow-md shadow-green-500/30'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
          }`}
        >
          Free only
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Source select */}
        <select
          value={source}
          onChange={(e) => setAndSubmit({ source: e.target.value })}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500/40 cursor-pointer"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s} className="bg-slate-900">{s}</option>
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
