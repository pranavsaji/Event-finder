import { useState, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || ''

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const abortRef = useRef(null)

  const fetchEvents = useCallback(async ({
    q = '', category = '', source = '', date_range = '', free_only = false
  } = {}) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      if (source) params.set('source', source)
      if (date_range) params.set('date_range', date_range)
      if (free_only) params.set('free_only', 'true')

      const token = localStorage.getItem('sf_token') || ''
      const res = await fetch(`${API}/api/events?${params}`, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEvents(data)
      setLastFetched(new Date())
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { events, loading, error, fetchEvents, lastFetched }
}
