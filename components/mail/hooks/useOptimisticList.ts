'use client'

import { useCallback, useRef, useState } from 'react'

export function useOptimisticList<T extends { id: string }>(initial: T[] = []) {
  const [items, setItems] = useState<T[]>(initial)
  const snapshotRef = useRef<T[] | null>(null)

  const replace = useCallback((next: T[]) => {
    setItems(next)
  }, [])

  const begin = useCallback(() => {
    snapshotRef.current = items
  }, [items])

  const commit = useCallback(() => {
    snapshotRef.current = null
  }, [])

  const rollback = useCallback(() => {
    if (snapshotRef.current) {
      setItems(snapshotRef.current)
      snapshotRef.current = null
    }
  }, [])

  const removeIds = useCallback((ids: string[]) => {
    const set = new Set(ids)
    setItems((prev) => prev.filter((t) => !set.has(t.id)))
  }, [])

  const patchById = useCallback((id: string, patch: (row: T) => T) => {
    setItems((prev) => prev.map((row) => (row.id === id ? patch(row) : row)))
  }, [])

  const run = useCallback(
    async (
      optimistic: () => void,
      work: () => Promise<void>
    ) => {
      begin()
      try {
        optimistic()
        await work()
        commit()
      } catch (e) {
        rollback()
        throw e
      }
    },
    [begin, commit, rollback]
  )

  return {
    items,
    setItems,
    replace,
    begin,
    commit,
    rollback,
    removeIds,
    patchById,
    run,
  }
}