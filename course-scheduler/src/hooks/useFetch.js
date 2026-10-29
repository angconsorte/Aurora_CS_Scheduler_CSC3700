import { useState, useEffect } from 'react'

export default function useFetch(path) {
    const [data, setData] = useState(null)
    const [isPending, setIsPending] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        setIsPending(true)

        fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, { signal: controller.signal })
            .then(res => {
                if (!res.ok) throw new Error('Could not fetch the data')
                return res.json()
            })
            .then(json => {
                setData(json)
                setIsPending(false)
                setError(null)
            })
            .catch(err => {
                if (err.name === 'AbortError') return
                setError(err.message)
                setIsPending(false)
            })

        return () => controller.abort()
    }, [path])

    return { data, isPending, error }
}