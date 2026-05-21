// ============================================================
// hooks/useFetch.js — Generic Data Fetching Hook
//
// Encapsulates loading / error / data lifecycle for any API call.
// Accepts a fetcher function (must return a Promise) and an
// optional deps array to control when re-fetching occurs.
//
// Usage:
//   const { data, loading, error, refetch } = useFetch(
//     () => ticketService.getAll({ search, status }),
//     [search, status]
//   )
// ============================================================
import { useState, useEffect, useCallback } from 'react'

export function useFetch(fetcher, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
