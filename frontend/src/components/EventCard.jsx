import { Calendar, MapPin, ExternalLink, Tag, DollarSign } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'

const SOURCE_COLORS = {
  Eventbrite: 'from-orange-500 to-amber-500',
  Ticketmaster: 'from-blue-500 to-indigo-500',
  Yelp: 'from-red-500 to-rose-500',
  Meetup: 'from-pink-500 to-red-400',
  SFGate: 'from-slate-400 to-slate-500',
  'FunCheap SF': 'from-green-500 to-emerald-500',
  'SF Chronicle': 'from-yellow-500 to-orange-400',
  'AllEvents.in': 'from-purple-500 to-violet-500',
  '10Times': 'from-cyan-500 to-blue-400',
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80',
]

function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    const d = parseISO(dateStr)
    if (isValid(d)) return format(d, 'EEE, MMM d · h:mm a')
  } catch {}
  // Try raw string cleanup
  return dateStr.replace('T', ' ').replace(/:\d\d$/, '')
}

function fallbackImg(id) {
  const idx = id.charCodeAt(id.length - 1) % FALLBACK_IMAGES.length
  return FALLBACK_IMAGES[idx]
}

export default function EventCard({ event }) {
  const gradientClass = SOURCE_COLORS[event.source] || 'from-slate-500 to-slate-600'
  const dateStr = formatDate(event.start_date)
  const imgSrc = event.image_url || fallbackImg(event.id)

  return (
    <article className="group relative bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 flex flex-col">
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-slate-800">
        <img
          src={imgSrc}
          alt={event.title}
          onError={(e) => { e.target.src = fallbackImg(event.id) }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Source badge */}
        <div className={`absolute top-3 left-3 bg-gradient-to-r ${gradientClass} rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow-md`}>
          {event.source}
        </div>

        {/* Price badge */}
        {event.price && (
          <div className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-md ${
            event.is_free ? 'bg-green-500/90 text-white' : 'bg-black/60 text-slate-200'
          }`}>
            {event.price}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-orange-300 transition-colors">
          {event.title}
        </h3>

        <div className="space-y-1.5 flex-1">
          {dateStr && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar size={11} className="shrink-0 text-orange-400" />
              <span className="truncate">{dateStr}</span>
            </div>
          )}
          {(event.venue_name || event.city) && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin size={11} className="shrink-0 text-blue-400" />
              <span className="truncate">
                {event.venue_name || event.city}
                {event.venue_name && event.city && event.venue_name !== event.city && `, ${event.city}`}
              </span>
            </div>
          )}
          {event.category && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Tag size={11} className="shrink-0" />
              <span className="truncate">{event.category}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center justify-center gap-1.5 w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl py-2.5 text-xs font-medium text-slate-300 hover:text-white transition-all active:scale-95"
          >
            View Event
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    </article>
  )
}
