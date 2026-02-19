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

onMounted(() => {
  if (!container.value) return

  picker = new Picker({
    data,
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


