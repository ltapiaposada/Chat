<template>
  <div v-if="displayItems.length > 0" class="message-attachments">
    <template v-for="item in displayItems" :key="item.id">
      <img
        v-if="isImage(item)"
        class="message-thumb"
        :src="item.url"
        :alt="item.filename || 'imagen'"
        @click="openPreview(item.url)"
      />
      <audio
        v-else-if="isAudio(item)"
        class="message-audio"
        :src="getPlayableUrl(item)"
        controls
      />
      <a
        v-else
        class="message-file"
        :href="getDownloadUrl(item)"
        target="_blank"
        rel="noopener"
      >
        {{ item.filename || 'Archivo' }}
      </a>
    </template>

    <div v-if="previewUrl" class="preview-overlay" @click.self="closePreview">
      <div class="preview-content">
        <div class="preview-actions">
          <button class="ghost-btn icon-only" @click="openFullSize" aria-label="Tamaño real"><HeroIcon name="arrows-pointing-out" /></button>
          <button class="close-x" @click="closePreview" aria-label="Cerrar">
            <HeroIcon name="x-circle" />
          </button>
        </div>
        <img :src="previewUrl" alt="preview" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import axios from 'axios'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type Attachment = {
  id: number | string
  entity_id: number
  url: string
  public_id: string
  resource_type: string
  mime_type: string
  bytes: number
  filename: string
  is_attachment: boolean
  created_at: string
}

const props = defineProps<{
  entityId: number
  entityType?: string
  optimisticItems?: Array<{
    id: string
    url: string
    filename: string
    resource_type: string
    mime_type?: string
  }>
}>()

const items = ref<Attachment[]>([])
const displayItems = ref<Attachment[]>([])
const previewUrl = ref<string | null>(null)

function isImage(item?: Attachment) {
  if (!item) return false
  return item.resource_type === 'image' || item.mime_type?.startsWith('image/')
}

function isAudio(item?: Attachment) {
  if (!item) return false
  return item.mime_type?.startsWith('audio/')
}

function getDownloadUrl(item: Attachment) {
  return `${API_URL}/api/storage-chat/download/${item.id}`
}

function getPlayableUrl(item: Attachment) {
  if (String(item.id).startsWith('queued-') || String(item.id).startsWith('temp-')) {
    return item.url
  }
  return getDownloadUrl(item)
}

async function load() {
  if (!props.entityId) return
  const { data } = await axios.get(`${API_URL}/api/storage-chat/${props.entityId}`, {
    params: { entity_type: props.entityType || 'chat' }
  })
  items.value = data
}

function openPreview(url: string) {
  previewUrl.value = url
}

function closePreview() {
  previewUrl.value = null
}

function openFullSize() {
  if (!previewUrl.value) return
  window.open(previewUrl.value, '_blank', 'noopener')
}

function onUpdated(event: Event) {
  const detail = (event as CustomEvent).detail as { entityId?: number; entityType?: string }
  if (detail?.entityId === props.entityId) {
    if (detail.entityType && detail.entityType !== (props.entityType || 'chat')) return
    load()
  }
}

onMounted(() => {
  load()
  window.addEventListener('attachments:updated', onUpdated as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('attachments:updated', onUpdated as EventListener)
})

watch(
  () => props.entityId,
  () => {
    load()
  }
)

watch(
  [() => items.value, () => props.optimisticItems],
  () => {
    const optimistic = (props.optimisticItems || []).map((item) => ({
      id: item.id,
      entity_id: props.entityId,
      url: item.url,
      public_id: '',
      resource_type: item.resource_type,
      mime_type: item.mime_type || '',
      bytes: 0,
      filename: item.filename,
      is_attachment: true,
      created_at: ''
    }))
    displayItems.value = [...optimistic, ...items.value]
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.message-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.4rem;
}

.message-thumb {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  object-fit: cover;
  cursor: pointer;
}

.message-audio {
  width: 220px;
  height: 32px;
}

.message-file {
  font-size: 0.75rem;
  color: inherit;
  text-decoration: underline;
}

.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.preview-content {
  background: #fff;
  padding: 1rem;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.ghost-btn {
  border: 1px solid var(--color-border-strong);
  background: white;
  color: var(--color-primary);
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
}

.ghost-btn.icon-only {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.close-x {
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.close-x:hover {
  background: rgba(0, 0, 0, 0.06);
}

.preview-content img {
  max-width: 80vw;
  max-height: 70vh;
}
</style>






