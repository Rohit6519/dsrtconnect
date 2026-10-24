'use client'

import { useCallback, useEffect, useState } from 'react'

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) return fallback
    return (json?.data ?? fallback) as T
  } catch {
    return fallback
  }
}

export function useForm(formId: string | null) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!formId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/operations/forms/${formId}`, null)
    setData(d)
    setLoading(false)
  }, [formId])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useBoard(boardId: string | null) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!boardId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/operations/bucket-boards/${boardId}`, null)
    setData(d)
    setLoading(false)
  }, [boardId])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useWorkflowRun(runId: string | null) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!runId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/operations/workflow-runs/${runId}`, null)
    setData(d)
    setLoading(false)
  }, [runId])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}