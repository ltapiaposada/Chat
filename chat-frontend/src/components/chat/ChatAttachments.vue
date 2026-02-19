<template>
  <div class="attachments">
    <input
      ref="fileInput"
      type="file"
      multiple
      :disabled="disabled"
      @change="onFileChange"
      class="file-input"
    />

    <div v-if="attachments.length > 0 || pendingUploads.length > 0 || queuedFiles.length > 0" class="attachments-list">
      <div v-for="queued in queuedFiles" :key="queued.id" class="attachment-item queued">
        <button class="remove-btn" @click.stop="removeQueued(queued.id)">X</button>
        <div class="queued-badge">Pendiente</div>
        <img
          v-if="queued.resource_type === 'image'"
          class="thumb"
          :src="queued.url"
          :alt="queued.file.name"
        />
        <audio
          v-else-if="isAudioMime(queued.file.type)"
          class="audio-preview"
          :src="queued.url"
          controls
        />
        <div v-else class="file-link">
          {{ queued.file.name }}
        </div>
      </div>
      <div v-for="item in attachments" :key="item.id" class="attachment-item">
        <button class="remove-btn" @click.stop="removeAttachment(item.id)">X</button>
        <img
          v-if="isImage(item)"
          class="thumb"
          :src="item.url"
          :alt="item.filename || 'imagen'"
          @click="openPreview(item.url)"
        />
        <audio
          v-else-if="isAudioMime(item.mime_type)"
          class="audio-preview"
          :src="item.url"
          controls
        />
        <a
          v-else
          class="file-link"
          :href="item.url"
          target="_blank"
          rel="noopener"
        >
          {{ item.filename || 'Archivo' }}
        </a>
      </div>

      <div v-for="pending in pendingUploads" :key="pending.id" class="attachment-item uploading">
        <div class="uploading-overlay">
          <div class="uploading-text">Subiendo {{ pending.progress }}%</div>
          <div class="uploading-bar">
            <div class="uploading-bar-fill" :style="{ width: `${pending.progress}%` }"></div>
          </div>
        </div>
        <img
          v-if="pending.resource_type === 'image'"
          class="thumb"
          :src="pending.url"
          :alt="pending.filename"
        />
        <audio
          v-else-if="isAudioMime(pending.mime_type)"
          class="audio-preview"
          :src="pending.url"
          controls
        />
        <div v-else class="file-link">
          {{ pending.filename }}
        </div>
      </div>
    </div>

    <div v-if="previewUrl" class="preview-overlay" @click.self="closePreview">
      <div class="preview-content">
        <div class="preview-actions">
          <button class="ghost-btn icon-only" @click="openFullSize" aria-label="Tamaño real">?</button>
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
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import axios from 'axios'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type Attachment = {
  id: number
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
  entityId: number | null
  entityType?: string
  disabled?: boolean
  deferUploads?: boolean
  showExisting?: boolean
  audioProfile?: 'default' | 'whatsapp'
}>()

const attachments = ref<Attachment[]>([])
const previewUrl = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const queuedFiles = ref<
  {
    id: string
    file: File
    url: string
    resource_type: string
  }[]
>([])
const isRecording = ref(false)
const recordError = ref<string | null>(null)
const recordSeconds = ref(0)
let recordTimer: number | null = null
let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let recordedChunks: BlobPart[] = []
const MAX_RECORD_SECONDS = 60
let lastEntityId: number | null = null
const waitingForNextEntity = ref(false)
const pendingUploads = ref<
  {
    id: string
    file: File
    filename: string
    mime_type: string
    resource_type: string
    url: string
    progress: number
  }[]
>([])

const emit = defineEmits<{
  queueChanged: [number]
}>()

const shouldDefer = () => props.deferUploads !== false
const getEntityType = () => props.entityType || 'chat'
const shouldShowExisting = () => props.showExisting === true
function isImage(item: Attachment) {
  return item.resource_type === 'image' || item.mime_type?.startsWith('image/')
}

function isAudioMime(mimeType?: string) {
  return !!mimeType && mimeType.startsWith('audio/')
}

const formattedRecordTime = computed(() => {
  const remaining = Math.max(0, MAX_RECORD_SECONDS - recordSeconds.value)
  const mins = Math.floor(remaining / 60).toString().padStart(2, '0')
  const secs = Math.floor(remaining % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
})

const recordLabel = computed(() => (isRecording.value ? 'Grabando...' : ''))

function pickAudioMimeType() {
  const candidates =
    props.audioProfile === 'whatsapp'
      ? ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4']
      : ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

async function startRecording() {
  recordError.value = null
  if (isRecording.value) return
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickAudioMimeType()
    if (props.audioProfile === 'whatsapp' && !mimeType) {
      recordError.value = 'Este navegador no soporta audio compatible con WhatsApp'
      stopRecording(true)
      return
    }
    mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined)
    recordedChunks = []
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }
    mediaRecorder.onstop = async () => {
      const type = mediaRecorder?.mimeType || 'audio/webm'
      const blob = new Blob(recordedChunks, { type })
      const extension = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm'
      const filename = `audio-${Date.now()}.${extension}`
      const file = new File([blob], filename, { type })
      await uploadFiles([file])
      recordedChunks = []
    }
    mediaRecorder.start()
    isRecording.value = true
    recordSeconds.value = 0
    recordTimer = window.setInterval(() => {
      recordSeconds.value += 1
      if (recordSeconds.value >= MAX_RECORD_SECONDS) {
        stopRecording()
      }
    }, 1000)
  } catch (err) {
    recordError.value = 'No se pudo acceder al micrófono'
    stopRecording(true)
  }
}

function stopRecording(skipUpload = false) {
  if (!isRecording.value && !mediaRecorder) return
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
  isRecording.value = false
  recordSeconds.value = 0
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    if (skipUpload) {
      mediaRecorder.onstop = null
    }
    mediaRecorder.stop()
  }
  mediaRecorder = null
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

async function loadAttachments() {
  if (!props.entityId) {
    attachments.value = []
    return
  }
  const { data } = await axios.get(`${API_URL}/api/storage-chat/${props.entityId}`, {
    params: { entity_type: getEntityType() }
  })
  attachments.value = data
}

async function uploadFiles(files: File[], options: { force?: boolean } = {}) {
  if (files.length === 0) return
  if (shouldDefer() && !options.force) {
    files.forEach((file) => {
      const tempId = `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`
      queuedFiles.value.push({
        id: tempId,
        file,
        url: URL.createObjectURL(file),
        resource_type: file.type.startsWith('image/') ? 'image' : 'raw'
      })
    })
    waitingForNextEntity.value = true
    emit('queueChanged', queuedFiles.value.length + pendingUploads.value.length)
    return
  }
  if (!props.entityId) {
    files.forEach((file) => {
      const tempId = `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`
      queuedFiles.value.push({
        id: tempId,
        file,
        url: URL.createObjectURL(file),
        resource_type: file.type.startsWith('image/') ? 'image' : 'raw'
      })
    })
    waitingForNextEntity.value = true
    emit('queueChanged', queuedFiles.value.length + pendingUploads.value.length)
    return
  }

  for (const file of files) {
    const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const tempUrl = URL.createObjectURL(file)
    pendingUploads.value.push({
      id: tempId,
      file,
      filename: file.name,
      mime_type: file.type,
      resource_type: file.type.startsWith('image/') ? 'image' : 'raw',
      url: tempUrl,
      progress: 0
    })

    const formData = new FormData()
    formData.append('entity_id', String(props.entityId))
    formData.append('entity_type', getEntityType())
    formData.append('file', file)
    let success = false
    try {
      const { data } = await axios.post(`${API_URL}/api/storage-chat/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return
          const percent = Math.round((evt.loaded / evt.total) * 100)
          const item = pendingUploads.value.find(p => p.id === tempId)
          if (item) item.progress = percent
        }
      })
      attachments.value.push(data)
      emitUpdated()
      success = true
    } catch (error) {
      const failed = pendingUploads.value.find(p => p.id === tempId)
      if (failed) {
        queuedFiles.value.push({
          id: `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          file: failed.file,
          url: failed.url,
          resource_type: failed.resource_type
        })
        emit('queueChanged', queuedFiles.value.length + pendingUploads.value.length)
      }
    } finally {
      if (success) {
        const index = pendingUploads.value.findIndex(p => p.id === tempId)
        if (index >= 0) {
          URL.revokeObjectURL(pendingUploads.value[index].url)
          pendingUploads.value.splice(index, 1)
          emit('queueChanged', queuedFiles.value.length + pendingUploads.value.length)
        }
      }
    }
  }
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  await uploadFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}

async function removeAttachment(id: number) {
  await axios.delete(`${API_URL}/api/storage-chat/${id}`)
  attachments.value = attachments.value.filter(item => item.id !== id)
  emitUpdated()
}

function removeQueued(id: string) {
  const index = queuedFiles.value.findIndex(q => q.id === id)
  if (index >= 0) {
    URL.revokeObjectURL(queuedFiles.value[index].url)
    queuedFiles.value.splice(index, 1)
    emit('queueChanged', queuedFiles.value.length + pendingUploads.value.length)
  }
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

function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return

  const files: File[] = []
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }

  if (files.length > 0) {
    event.preventDefault()
    uploadFiles(files)
  }
}

function handleDrop(event: DragEvent) {
  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  if (files.length === 0) return
  event.preventDefault()
  uploadFiles(files)
}

function emitUpdated() {
  if (!props.entityId) return
  window.dispatchEvent(
    new CustomEvent('attachments:updated', { detail: { entityId: props.entityId, entityType: getEntityType() } })
  )
}

function openFilePicker() {
  fileInput.value?.click()
}

function hasQueuedUploads() {
  return queuedFiles.value.length > 0 || pendingUploads.value.length > 0
}

function getQueuedPreviews() {
  const queued = queuedFiles.value.map((q) => ({
    id: q.id,
    url: q.url,
    filename: q.file.name,
    resource_type: q.resource_type,
    mime_type: q.file.type
  }))
  const pending = pendingUploads.value.map((p) => ({
    id: p.id,
    url: p.url,
    filename: p.filename,
    resource_type: p.resource_type,
    mime_type: p.mime_type
  }))
  return [...queued, ...pending]
}

defineExpose({
  handlePaste,
  handleDrop,
  uploadFiles,
  openFilePicker,
  hasQueuedUploads,
  getQueuedPreviews,
  toggleRecording,
  isRecording,
  recordSeconds,
  formattedRecordTime,
  recordLabel,
  recordError
})

watch(
  () => props.entityId,
  async (newEntityId) => {
    if (newEntityId !== lastEntityId) {
      if (waitingForNextEntity.value && newEntityId && queuedFiles.value.length > 0) {
        const pending = queuedFiles.value.map(q => q.file)
        queuedFiles.value.forEach(q => URL.revokeObjectURL(q.url))
        queuedFiles.value = []
        waitingForNextEntity.value = false
        await uploadFiles(pending, { force: true })
      }
      lastEntityId = newEntityId ?? null
      if (shouldShowExisting()) {
        loadAttachments()
      } else {
        attachments.value = []
      }
      return
    }

    if (newEntityId && queuedFiles.value.length > 0 && !waitingForNextEntity.value) {
      const pending = queuedFiles.value.map(q => q.file)
      queuedFiles.value.forEach(q => URL.revokeObjectURL(q.url))
      queuedFiles.value = []
      await uploadFiles(pending, { force: true })
    }
  },
  { immediate: true }
)

watch(
  () => queuedFiles.value.length + pendingUploads.value.length,
  (count) => {
    emit('queueChanged', count)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopRecording(true)
})
</script>

<style scoped>
.attachments {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.file-input {
  display: none;
}


.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.attachment-item {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.25rem;
  background: #fff;
}

.attachment-item.uploading {
  opacity: 0.9;
}

.attachment-item.queued {
  border-style: dashed;
}

.queued-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 999px;
}

.uploading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 8px;
  z-index: 2;
}

.uploading-text {
  font-size: 0.7rem;
  color: var(--color-text);
}

.uploading-bar {
  width: 80%;
  height: 6px;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
}

.uploading-bar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.15s ease;
}

.thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
}

.audio-preview {
  width: 200px;
  height: 32px;
}

.file-link {
  display: inline-block;
  font-size: 0.8rem;
  color: var(--color-primary);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--color-danger);
  color: #fff;
  font-size: 0.7rem;
  cursor: pointer;
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




