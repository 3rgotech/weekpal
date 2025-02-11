import { useCallback, useEffect, useState } from 'react'

import type { Dispatch, SetStateAction } from 'react'
import { useEventCallback } from './useEventCallback'
import { useEventListener } from './useEventListener'


declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface WindowEventMap {
    'local-storage': CustomEvent
  }
}

type UseLocalStorageOptions<T> = {
  serializer?: (value: T) => string
  deserializer?: (value: string) => T
  initializeWithValue?: boolean
}

const IS_SERVER = typeof window === 'undefined'

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const { initializeWithValue = true } = options

  const serializer = (value: T) => {
    try {
      return JSON.stringify(value)
    } catch (error) {
      console.error('Error serializing JSON:', error)
      return ''
    }
  }

  const deserializer = (value: string) => {
    try {
      return JSON.parse(value)
    } catch (error) {
      console.error('Error parsing JSON:', error)
      return initialValue instanceof Function ? initialValue() : initialValue
    }
  }

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue instanceof Function ? initialValue() : initialValue

    try {
      const raw = window.localStorage.getItem(key)
      const parsedValue = raw ? deserializer(raw) : initialValue
      console.log(`🔄 Reading localStorage key "${key}":`, parsedValue)
      return parsedValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue instanceof Function ? initialValue() : initialValue
    }
  }, [key, initialValue])

  const [storedValue, setStoredValue] = useState(readValue)

  const setValue: Dispatch<SetStateAction<T>> = value => {
    try {
      const newValue = value instanceof Function ? value(readValue()) : value
      window.localStorage.setItem(key, serializer(newValue))
      setStoredValue(newValue)
      console.log(`✅ Saved localStorage key "${key}":`, newValue)

      window.dispatchEvent(new CustomEvent('local-storage', { detail: { key } }))
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | CustomEvent) => {
      if ('key' in event && event.key !== key) return
      setStoredValue(readValue())
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('local-storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage', handleStorageChange)
    }
  }, [key, readValue])

  return [storedValue, setValue, () => {
    window.localStorage.removeItem(key)
    setStoredValue(initialValue instanceof Function ? initialValue() : initialValue)
    console.log(`🗑 Removed localStorage key "${key}"`)
  }]
}

