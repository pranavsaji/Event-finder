import { useState, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || ''

export function useEvents() {
  const [allEvents, setAllEvents] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [activeFilters, setActiveFilters] = useState({ category: '', source: '' })

  const fetchEvents = useCallback(async ({ q = '', category = '', source = '' } = {}) => {
    setActiveFilters({ category, source })

    // If we have cached results and only filters changed (no new search query), filter in-memory
    if (allEvents.length > 0 && !q) {
      setEvents(_applyFilters(allEvents, category, source))
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)

      const token = localStorage.getItem('sf_token') || ''
      const res = await fetch(`${API}/api/events?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAllEvents(data)
      setEvents(_applyFilters(data, category, source))
      setLastFetched(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [allEvents])

  return { events, loading, error, fetchEvents, lastFetched }
}

function _applyFilters(events, category, source) {
  let result = events
  if (category) {
    result = result.filter(e =>
      (e.category || '').toLowerCase() === category.toLowerCase()
    )
  }
  if (source) {
    result = result.filter(e =>
      (e.source || '').toLowerCase() === source.toLowerCase()
    )
  }
  return result
}
