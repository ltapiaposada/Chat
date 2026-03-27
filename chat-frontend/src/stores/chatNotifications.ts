import { ref, type Ref } from 'vue'

export type SoundType = 'support' | 'global' | 'group' | 'dm' | 'pending'

type SoundPreferences = Record<SoundType, boolean>

const defaultSoundPreferences: SoundPreferences = {
  support: true,
  global: true,
  group: true,
  dm: true,
  pending: true
}

export function createChatNotifications(params: {
  directUnreadCounts: Ref<Map<string, number>>
  groupUnreadCounts: Ref<Map<number, number>>
  globalUnreadCount: Ref<number>
}) {
  const { directUnreadCounts, groupUnreadCounts, globalUnreadCount } = params

  const soundEnabled = ref(true)
  const soundByType = ref<SoundPreferences>({ ...defaultSoundPreferences })
  const unseenTotal = ref(0)
  const audioUnlocked = ref(false)

  let baseTitle: string | null = null
  let titleListenerAttached = false
  let audioUnlockListenersAttached = false
  let audioContext: AudioContext | null = null
  let queuedSoundType: SoundType | null = null
  const htmlAudioByType = new Map<SoundType, HTMLAudioElement>()

  function getAudioContextClass() {
    if (typeof window === 'undefined') return null
    return window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null
  }

  function createOrGetAudioContext() {
    const AudioContextClass = getAudioContextClass()
    if (!AudioContextClass) return null
    if (!audioContext) {
      audioContext = new AudioContextClass()
    }
    return audioContext
  }

  function getTonePattern(type: SoundType) {
    if (type === 'pending') {
      return [
        { frequency: 698.46, durationMs: 120, volume: 0.36, gapMs: 26 },
        { frequency: 880, durationMs: 105, volume: 0.28, gapMs: 34 },
        { frequency: 783.99, durationMs: 140, volume: 0.3, gapMs: 0 }
      ]
    }

    return [
      { frequency: 698.46, durationMs: 105, volume: 0.24, gapMs: 18 },
      { frequency: 880, durationMs: 120, volume: 0.18, gapMs: 0 }
    ]
  }

  function createWaveDataUrl(type: SoundType) {
    const sampleRate = 22050
    const pattern = getTonePattern(type)
    const totalMs = pattern.reduce((sum, tone) => sum + tone.durationMs + tone.gapMs, 0) + 40
    const totalSamples = Math.max(1, Math.floor((sampleRate * totalMs) / 1000))
    const samples = new Int16Array(totalSamples)

    let cursor = 0
    for (const tone of pattern) {
      const toneSamples = Math.floor((sampleRate * tone.durationMs) / 1000)
      const gapSamples = Math.floor((sampleRate * tone.gapMs) / 1000)
      for (let i = 0; i < toneSamples && cursor + i < samples.length; i += 1) {
        const progress = i / Math.max(1, toneSamples - 1)
        const attack = Math.min(1, progress / 0.16)
        const release = Math.min(1, (1 - progress) / 0.3)
        const envelope = Math.min(attack, release, 1)
        const t = i / sampleRate
        const sine = Math.sin(2 * Math.PI * tone.frequency * t)
        const overtone = Math.sin(2 * Math.PI * tone.frequency * 2 * t) * 0.05
        const body = Math.sin(2 * Math.PI * tone.frequency * 0.5 * t) * 0.02
        const value = (sine + overtone + body) * envelope * tone.volume
        samples[cursor + i] = Math.max(-1, Math.min(1, value)) * 32767
      }
      cursor += toneSamples + gapSamples
      if (cursor >= samples.length) break
    }

    const dataSize = samples.length * 2
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)
    const writeString = (offset: number, text: string) => {
      for (let index = 0; index < text.length; index += 1) {
        view.setUint8(offset + index, text.charCodeAt(index))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    for (let index = 0; index < samples.length; index += 1) {
      view.setInt16(44 + index * 2, samples[index] || 0, true)
    }

    const bytes = new Uint8Array(buffer)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })

    return `data:audio/wav;base64,${btoa(binary)}`
  }

  function getHtmlAudio(type: SoundType) {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null
    let audio = htmlAudioByType.get(type)
    if (!audio) {
      audio = new Audio(createWaveDataUrl(type))
      audio.preload = 'auto'
      audio.volume = type === 'pending' ? 0.78 : 0.66
      htmlAudioByType.set(type, audio)
    }
    return audio
  }

  function playHtmlAudio(type: SoundType) {
    try {
      const audio = getHtmlAudio(type)
      if (!audio) return false
      audio.pause()
      audio.currentTime = 0
      const playResult = audio.play()
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {})
      }
      return true
    } catch {
      return false
    }
  }

  function playTone(type: SoundType) {
    const ctx = createOrGetAudioContext()
    if (!ctx) return false

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const playBeep = (startAt: number, freq: number, duration: number, volume: number) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, startAt)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1450, startAt)
      filter.Q.setValueAtTime(0.28, startAt)

      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

      oscillator.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      oscillator.start(startAt)
      oscillator.stop(startAt + duration + 0.03)
    }

    const now = ctx.currentTime + 0.01
    if (type === 'pending') {
      playBeep(now, 698.46, 0.13, 0.065)
      playBeep(now + 0.11, 880, 0.11, 0.05)
      playBeep(now + 0.24, 783.99, 0.15, 0.05)
    } else {
      playBeep(now, 698.46, 0.11, 0.05)
      playBeep(now + 0.09, 880, 0.13, 0.04)
    }

    return true
  }

  function flushQueuedSound() {
    if (!queuedSoundType || !audioUnlocked.value) return
    const pendingType = queuedSoundType
    queuedSoundType = null
    if (!playTone(pendingType)) {
      playHtmlAudio(pendingType)
    }
  }

  function tryPlayNotification(type: SoundType) {
    if (playTone(type)) {
      return true
    }
    if (playHtmlAudio(type)) {
      return true
    }
    return false
  }

  function warmupHtmlAudio() {
    for (const type of ['support', 'global', 'group', 'dm', 'pending'] as SoundType[]) {
      getHtmlAudio(type)
    }
  }

  function resetAudioElements() {
    htmlAudioByType.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
  }

  function ensureAudioUnlockListeners() {
    if (audioUnlockListenersAttached || typeof window === 'undefined') return
    const unlock = () => {
      unlockAudio()
    }
    const options: AddEventListenerOptions = { passive: true }
    window.addEventListener('pointerdown', unlock, options)
    window.addEventListener('touchstart', unlock, options)
    window.addEventListener('keydown', unlock)
    window.addEventListener('click', unlock, options)
    audioUnlockListenersAttached = true
  }

  function loadSoundPreference() {
    if (typeof window === 'undefined') return
    ensureAudioUnlockListeners()
    warmupHtmlAudio()
    const rawEnabled = window.localStorage.getItem('chat:soundEnabled')
    if (rawEnabled !== null) {
      soundEnabled.value = rawEnabled === 'true'
    }
    const rawTypes = window.localStorage.getItem('chat:soundByType')
    if (rawTypes) {
      try {
        const parsed = JSON.parse(rawTypes)
        soundByType.value = {
          ...soundByType.value,
          ...parsed
        }
      } catch {
        // ignore bad JSON
      }
    }
  }

  function setSoundEnabled(next: boolean) {
    soundEnabled.value = next
    if (!next) {
      resetAudioElements()
    }
    if (next) {
      ensureAudioUnlockListeners()
      unlockAudio()
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('chat:soundEnabled', String(next))
    }
  }

  function toggleSoundEnabled() {
    setSoundEnabled(!soundEnabled.value)
  }

  function setSoundTypeEnabled(type: SoundType, next: boolean) {
    soundByType.value = { ...soundByType.value, [type]: next }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('chat:soundByType', JSON.stringify(soundByType.value))
    }
  }

  function toggleSoundType(type: SoundType) {
    setSoundTypeEnabled(type, !soundByType.value[type])
  }

  function updateTitle() {
    if (typeof document === 'undefined') return
    const title = baseTitle || document.title || 'Chat'
    document.title = unseenTotal.value > 0 ? `(${unseenTotal.value}) ${title}` : title
  }

  function clearUnseen() {
    unseenTotal.value = 0
    updateTitle()
  }

  function ensureTitleListener() {
    if (titleListenerAttached || typeof document === 'undefined') return
    baseTitle = document.title
    ensureAudioUnlockListeners()
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        clearUnseen()
      }
    })
    titleListenerAttached = true
  }

  function incrementUnseen() {
    unseenTotal.value += 1
    updateTitle()
  }

  function incrementDmUnread(threadId: string) {
    const current = directUnreadCounts.value.get(threadId) || 0
    const next = new Map(directUnreadCounts.value)
    next.set(threadId, current + 1)
    directUnreadCounts.value = next
  }

  function clearDmUnread(threadId: string) {
    if (!directUnreadCounts.value.has(threadId)) return
    const next = new Map(directUnreadCounts.value)
    next.delete(threadId)
    directUnreadCounts.value = next
  }

  function incrementGroupUnread(groupId: number) {
    const current = groupUnreadCounts.value.get(groupId) || 0
    const next = new Map(groupUnreadCounts.value)
    next.set(groupId, current + 1)
    groupUnreadCounts.value = next
  }

  function clearGroupUnread(groupId: number) {
    if (!groupUnreadCounts.value.has(groupId)) return
    const next = new Map(groupUnreadCounts.value)
    next.delete(groupId)
    groupUnreadCounts.value = next
  }

  function playNotificationSound(type: SoundType) {
    if (typeof window === 'undefined') return
    if (!soundEnabled.value || !soundByType.value[type]) return
    try {
      ensureAudioUnlockListeners()
      if (!audioUnlocked.value) {
        queuedSoundType = type
        unlockAudio()
        if (!audioUnlocked.value) return
      }
      const ctx = createOrGetAudioContext()
      if (ctx?.state === 'suspended') {
        ctx.resume()
          .then(() => {
            tryPlayNotification(type)
          })
          .catch(() => {})
        return
      }
      tryPlayNotification(type)
    } catch {
      // ignore audio errors
    }
  }

  function unlockAudio() {
    if (typeof window === 'undefined') return false
    try {
      const ctx = createOrGetAudioContext()
      if (!ctx) return playHtmlAudio('support')
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      // Silent warm-up node to satisfy stricter autoplay policies.
      const warmupOscillator = ctx.createOscillator()
      const warmupGain = ctx.createGain()
      warmupGain.gain.setValueAtTime(0.00001, ctx.currentTime)
      warmupOscillator.connect(warmupGain)
      warmupGain.connect(ctx.destination)
      warmupOscillator.start(ctx.currentTime)
      warmupOscillator.stop(ctx.currentTime + 0.01)

      warmupHtmlAudio()
      audioUnlocked.value = true
      flushQueuedSound()
      return true
    } catch {
      return playHtmlAudio('support')
    }
  }

  function resetNotificationState() {
    directUnreadCounts.value = new Map()
    groupUnreadCounts.value = new Map()
    globalUnreadCount.value = 0
    clearUnseen()
  }

  return {
    soundEnabled,
    soundByType,
    unseenTotal,
    audioUnlocked,
    loadSoundPreference,
    setSoundEnabled,
    toggleSoundEnabled,
    setSoundTypeEnabled,
    toggleSoundType,
    ensureTitleListener,
    incrementUnseen,
    clearUnseen,
    updateTitle,
    incrementDmUnread,
    clearDmUnread,
    incrementGroupUnread,
    clearGroupUnread,
    playNotificationSound,
    unlockAudio,
    resetNotificationState
  }
}
