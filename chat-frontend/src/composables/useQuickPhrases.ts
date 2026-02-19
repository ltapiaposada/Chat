import { computed, ref } from 'vue'
import axios from 'axios'

export type QuickPhrase = {
  label: string
  text: string
}

const STORAGE_KEY = 'chat:quickPhrases'
const phrases = ref<QuickPhrase[]>(loadPhrases())
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
let loadInFlight: Promise<void> | null = null

function loadPhrases(): QuickPhrase[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p) => p && typeof p.label === 'string' && typeof p.text === 'string')
      .map((p) => ({ label: p.label, text: p.text }))
  } catch {
    return []
  }
}

function savePhrases(list: QuickPhrase[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function normalizeLabel(label: string) {
  const trimmed = label.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function addPhrase(label: string, text: string) {
  const normalized = normalizeLabel(label)
  const value = String(text || '').trim()
  if (!normalized || !value) return
  const existing = phrases.value.find((p) => p.label === normalized)
  if (existing) {
    existing.text = value
  } else {
    phrases.value.push({ label: normalized, text: value })
  }
  phrases.value = [...phrases.value].sort((a, b) => a.label.localeCompare(b.label))
  savePhrases(phrases.value)
  void savePhraseToServer(normalized, value)
}

function getFiltered(query: string) {
  const q = String(query || '').trim().toLowerCase()
  const sorted = [...phrases.value].sort((a, b) => a.label.localeCompare(b.label))
  if (!q) return sorted
  return sorted.filter((p) => p.label.toLowerCase().includes(q))
}

async function loadFromServer() {
  if (loadInFlight) return loadInFlight
  loadInFlight = (async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/quick-phrases`)
      if (Array.isArray(data)) {
        phrases.value = data
          .filter((p) => p && typeof p.label === 'string' && typeof p.text === 'string')
          .map((p) => ({ label: p.label, text: p.text }))
          .sort((a, b) => a.label.localeCompare(b.label))
        savePhrases(phrases.value)
      }
    } catch {
      // fallback to localStorage-only
    } finally {
      loadInFlight = null
    }
  })()
  return loadInFlight
}

async function savePhraseToServer(label: string, text: string) {
  try {
    await axios.post(`${API_URL}/api/quick-phrases`, {
      label,
      text
    })
  } catch {
    // ignore server errors; localStorage already updated
  }
}

export function useQuickPhrases() {
  void loadFromServer()
  const list = computed(() => phrases.value)
  return {
    phrases: list,
    addPhrase,
    getFiltered
  }
}
