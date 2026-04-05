import { useState, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || ''

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const fetchEvents = useCallback(async ({ q = '', category = '', source = '' } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      if (source) params.set('source', source)

      const token = localStorage.getItem('sf_token') || ''
      const res = await fetch(`${API}/api/events?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEvents(data)
      setLastFetched(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { events, loading, error, fetchEvents, lastFetched }
}
