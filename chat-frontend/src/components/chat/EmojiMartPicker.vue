<template>
  <div ref="container" class="emoji-mart-root"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import data from '@emoji-mart/data'
import i18n from '@emoji-mart/data/i18n/es.json'
import { Picker } from 'emoji-mart'

const emit = defineEmits<{
  select: [string]
}>()

const container = ref<HTMLDivElement | null>(null)
let picker: HTMLElement | null = null

type EmojiEntry = {
  name: string
  keywords?: string[]
}

type EmojiMartData = {
  emojis: Record<string, EmojiEntry>
} & Record<string, unknown>

const PHRASE_TRANSLATIONS: Array<[string, string]> = [
  ['flag', 'bandera'],
  ['grinning face', 'cara sonriente'],
  ['smiling face', 'cara sonriente'],
  ['thumbs up', 'pulgar arriba'],
  ['thumbs down', 'pulgar abajo'],
  ['red heart', 'corazón rojo'],
  ['blue heart', 'corazón azul'],
  ['green heart', 'corazón verde'],
  ['yellow heart', 'corazón amarillo'],
  ['purple heart', 'corazón morado'],
  ['black heart', 'corazón negro'],
  ['white heart', 'corazón blanco'],
  ['broken heart', 'corazón roto'],
  ['sparkling heart', 'corazón brillante'],
  ['microphone', 'micrófono']
]

const WORD_TRANSLATIONS: Record<string, string> = {
  and: 'y',
  face: 'cara',
  faces: 'caras',
  smiling: 'sonriente',
  smile: 'sonrisa',
  grinning: 'sonriente',
  eyes: 'ojos',
  eye: 'ojo',
  heart: 'corazón',
  hearts: 'corazones',
  hand: 'mano',
  hands: 'manos',
  mouth: 'boca',
  tears: 'lágrimas',
  tear: 'lágrima',
  with: 'con',
  without: 'sin',
  cat: 'gato',
  dog: 'perro',
  woman: 'mujer',
  man: 'hombre',
  person: 'persona',
  people: 'personas',
  boy: 'niño',
  girl: 'niña',
  baby: 'bebé',
  kiss: 'beso',
  kissing: 'besando',
  party: 'fiesta',
  partying: 'de fiesta',
  fire: 'fuego',
  star: 'estrella',
  stars: 'estrellas',
  rocket: 'cohete',
  sun: 'sol',
  moon: 'luna',
  cloud: 'nube',
  rain: 'lluvia',
  snow: 'nieve',
  tree: 'árbol',
  flower: 'flor',
  rose: 'rosa',
  food: 'comida',
  drink: 'bebida',
  car: 'carro',
  bus: 'bus',
  train: 'tren',
  airplane: 'avión',
  flag: 'bandera',
  red: 'rojo',
  orange: 'naranja',
  yellow: 'amarillo',
  green: 'verde',
  blue: 'azul',
  purple: 'morado',
  black: 'negro',
  white: 'blanco',
  brown: 'café',
  pink: 'rosado',
  gray: 'gris',
  grey: 'gris'
}

function capitalizeWords(value: string) {
  return value.replace(/\b\p{L}/gu, (char) => char.toUpperCase())
}

function translateEmojiName(name: string) {
  if (!name) return name

  if (name.endsWith(' Flag')) {
    return `Bandera de ${name.slice(0, -5)}`
  }

  let translated = name.toLowerCase()

  for (const [source, target] of PHRASE_TRANSLATIONS) {
    translated = translated.replace(new RegExp(source, 'g'), target)
  }

  translated = translated.replace(/\b[a-z][a-z'.-]*\b/g, (word) => WORD_TRANSLATIONS[word] || word)
  translated = translated.replace(/\s+/g, ' ').trim()
  return capitalizeWords(translated)
}

function getLocalizedData(): EmojiMartData {
  const localized = JSON.parse(JSON.stringify(data)) as EmojiMartData

  Object.values(localized.emojis).forEach((emoji) => {
    const entry = emoji as EmojiEntry
    const translatedName = translateEmojiName(entry.name)
    if (!translatedName) return

    entry.name = translatedName
    const extraKeywords = translatedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9ñ]+/i)
      .filter((part) => part.length > 2)

    entry.keywords = Array.from(new Set([...(entry.keywords || []), ...extraKeywords]))
  })

  return localized
}

const localizedData = getLocalizedData()

onMounted(() => {
  if (!container.value) return

  picker = new Picker({
    data: localizedData,
    i18n,
    locale: 'es',
    theme: 'light',
    set: 'native',
    onEmojiSelect: (emoji: any) => {
      const native = emoji?.native ?? emoji?.skins?.[0]?.native
      if (native) emit('select', native)
    }
  }) as unknown as HTMLElement

  container.value.appendChild(picker)
})

onBeforeUnmount(() => {
  if (picker?.parentNode) {
    picker.parentNode.removeChild(picker)
  }
  picker = null
})
</script>

<style scoped>
.emoji-mart-root {
  display: block;
}
</style>
