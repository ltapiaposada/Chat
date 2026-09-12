<template>
  <div class="settings-page">
    <AdminPageHeader title="Canales" description="Administra dónde aparece el chat y qué agentes atienden cada instalación.">
      <button class="primary-btn" type="button" @click="startCreate">
        <HeroIcon name="plus" /> Nuevo canal
      </button>
    </AdminPageHeader>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>

    <div class="settings-grid">
      <aside class="channel-list" aria-label="Lista de canales">
        <div v-if="loading" class="list-state">Cargando canales…</div>
        <button
          v-for="channel in channels"
          :key="channel.id"
          type="button"
          class="channel-card"
          :class="{ selected: selected?.id === channel.id }"
          @click="selectChannel(channel)"
        >
          <span class="channel-icon"><HeroIcon :name="channel.type === 'whatsapp' ? 'chat-bubble-left-right' : 'globe-alt'" /></span>
          <span class="channel-summary">
            <strong>{{ channel.name }}</strong>
            <small>{{ channel.slug }}</small>
            <span class="channel-meta">
              <span class="status-dot" :class="channel.status"></span>
              {{ channel.status === 'active' ? 'Activo' : 'Desactivado' }}
              · {{ channel.assignedAgents }} agentes
            </span>
          </span>
          <HeroIcon name="chevron-right" />
        </button>
        <div v-if="!loading && channels.length === 0" class="list-state">No hay canales configurados.</div>
      </aside>

      <section class="editor-card">
        <template v-if="selected || creating">
          <div class="editor-title">
            <div>
              <h3>{{ creating ? 'Crear canal' : selected?.name }}</h3>
              <p v-if="selected">Última actividad: {{ formatDate(selected.lastActivityAt) }}</p>
            </div>
            <span v-if="selected" class="connection-pill">
              <span class="status-dot" :class="selected.onlineAgents ? 'active' : 'disabled'"></span>
              {{ selected.onlineAgents }} en línea
            </span>
          </div>

          <div class="form-grid">
            <label>Nombre<input v-model="form.name" placeholder="Sitio principal" /></label>
            <label>Slug<input v-model="form.slug" :disabled="!creating" placeholder="sitio-principal" /></label>
            <label>Tipo
              <select v-model="form.type" :disabled="!creating">
                <option value="web">Web</option><option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label v-if="form.type === 'web'">Modo de autenticación
              <select v-model="form.authenticationMode">
                <option value="anonymous">Solo visitantes</option>
                <option value="authenticated">Solo usuarios identificados</option>
                <option value="mixed">Usuarios y visitantes</option>
              </select>
            </label>
          </div>

          <div v-if="form.type === 'web'" class="auth-mode-info" :class="`mode-${form.authenticationMode}`">
            <span class="auth-info-icon"><HeroIcon :name="form.authenticationMode === 'anonymous' ? 'user' : 'check-badge'" /></span>
            <div>
              <strong>{{ authModeTitle }}</strong>
              <p>{{ authModeDescription }}</p>
              <small v-if="form.authenticationMode !== 'anonymous'">
                {{ authModeHint }}
              </small>
            </div>
          </div>

          <label v-if="form.type === 'web'" class="full-field">Dominios permitidos
            <textarea v-model="form.origins" rows="4" placeholder="https://app.ejemplo.com&#10;http://localhost:5173"></textarea>
            <small>Un origen exacto por línea, incluyendo protocolo y puerto.</small>
          </label>

          <div v-if="form.type === 'whatsapp'" class="section-block whatsapp-config">
              <div class="section-heading">
                <div><h4>Conexión con Meta WhatsApp</h4><p>Las credenciales se cifran en el servidor y nunca vuelven a mostrarse.</p></div>
                <span class="connection-pill"><span class="status-dot" :class="selected?.whatsappConnection?.status === 'active' ? 'active' : 'disabled'"></span>{{ selected?.whatsappConnection?.status === 'active' ? 'Conectado' : (creating ? 'Nueva conexión' : 'Sin conectar') }}</span>
              </div>
              <div class="form-grid">
                <label>ID del número<input v-model="whatsappForm.phoneNumberId" placeholder="123456789012345" /></label>
                <label>ID de cuenta comercial<input v-model="whatsappForm.businessAccountId" placeholder="WABA ID" /></label>
                <label>Número visible<input v-model="whatsappForm.displayPhoneNumber" placeholder="+57 300 000 0000" /></label>
                <label>Versión Graph API<input v-model="whatsappForm.graphVersion" placeholder="v19.0" /></label>
                <label>Token de acceso<input v-model="whatsappForm.accessToken" type="password" :placeholder="selected?.whatsappConnection ? 'Déjalo vacío para conservarlo' : 'Pega el token generado por Meta'" /><small>Permite enviar mensajes desde este número de WhatsApp.</small></label>
                <label>Token de verificación<input v-model="whatsappForm.verifyToken" type="password" :placeholder="selected?.whatsappConnection ? 'Déjalo vacío para conservarlo' : 'Crea una clave difícil de adivinar'" /><small>Escribe este mismo valor cuando configures el webhook en Meta.</small></label>
                <label class="full-span">Clave secreta de la aplicación<input v-model="whatsappForm.appSecret" type="password" :placeholder="selected?.whatsappConnection?.hasAppSecret ? 'Déjala vacía para conservarla' : 'Copia la clave desde tu aplicación de Meta'" /><small>La encuentras en la configuración básica de tu aplicación en Meta for Developers.</small></label>
              </div>
              <label v-if="selected?.whatsappConnection && whatsappWebhookUrl" class="full-field">URL HTTPS del webhook
                <div class="code-box"><code>{{ whatsappWebhookUrl }}</code><button :class="{ copied: copiedValue === whatsappWebhookUrl }" type="button" @click="copy(whatsappWebhookUrl)"><HeroIcon :name="copiedValue === whatsappWebhookUrl ? 'check-circle' : 'clipboard-document-list'" />{{ copiedValue === whatsappWebhookUrl ? 'Copiado' : 'Copiar' }}</button></div>
                <small>Esta URL ya está lista para pegarla en Meta. Suscribe el campo messages.</small>
              </label>
              <div v-else-if="selected?.whatsappConnection" class="webhook-pending">
                <HeroIcon name="arrow-path" />
                <span><strong>Preparando la URL HTTPS…</strong><small>En desarrollo local se crea automáticamente al iniciar el backend.</small></span>
              </div>
              <p v-if="creating" class="creation-note">La URL del webhook aparecerá después de crear y conectar el canal.</p>
              <div v-if="selected?.whatsappConnection?.lastError" class="alert error whatsapp-error">{{ selected.whatsappConnection.lastError }}</div>
              <div v-if="!creating" class="inline-actions">
                <button v-if="selected?.whatsappConnection?.status === 'active'" class="secondary-btn" type="button" @click="disconnectWhatsApp">Desconectar</button>
                <button class="primary-btn" type="button" :disabled="savingWhatsApp" @click="saveWhatsApp">{{ savingWhatsApp ? 'Conectando…' : 'Guardar conexión' }}</button>
              </div>
          </div>

          <template v-if="selected && !creating">
            <div v-if="form.type === 'web'" class="section-block">
              <div class="section-heading"><div><h4>Instalación</h4><p>Copia este código antes de cerrar la etiqueta body.</p></div></div>
              <div class="code-box"><code>{{ installationScript }}</code><button :class="{ copied: copiedValue === installationScript }" type="button" @click="copy(installationScript)"><HeroIcon :name="copiedValue === installationScript ? 'check-circle' : 'clipboard-document-list'" />{{ copiedValue === installationScript ? 'Copiado' : 'Copiar' }}</button></div>
              <div class="installation-note">
                <strong>¿Cómo funcionará en tu sitio?</strong>
                <p v-if="form.authenticationMode === 'anonymous'">El botón del chat estará disponible para todos y las conversaciones aparecerán como Visitante.</p>
                <p v-else-if="form.authenticationMode === 'authenticated'">
                  El botón del chat aparecerá después de que la persona inicie sesión y se identificará con los datos de su cuenta.
                </p>
                <p v-else>
                  El botón estará disponible para todos. Quienes hayan iniciado sesión aparecerán con su nombre; los demás, como Visitante.
                </p>
                <small>Si después eliges otro modo, no tendrás que reemplazar este código.</small>
              </div>
            </div>

            <div class="section-block">
              <div class="section-heading"><div><h4>Agentes asignados</h4><p>Solo ellos recibirán conversaciones de este canal.</p></div></div>
              <div class="agent-grid">
                <label v-for="agent in agents" :key="agent.id" class="agent-option">
                  <input v-model="form.agentIds" type="checkbox" :value="agent.id" />
                  <span class="avatar">{{ initials(agent.name) }}</span>
                  <span><strong>{{ agent.name }}</strong><small>{{ roleLabel(agent.role) }}</small></span>
                  <span class="status-dot" :class="agent.isOnline ? 'active' : 'disabled'"></span>
                </label>
              </div>
            </div>

            <div v-if="form.type === 'web'" class="danger-zone">
              <div><strong>Regenerar clave del widget</strong><p>El código instalado actualmente dejará de funcionar y tendrás que reemplazarlo.</p></div>
              <button class="danger-btn" type="button" @click="rotateCredentials">Regenerar clave</button>
            </div>
          </template>

          <div v-if="selected && !creating" class="danger-zone delete-zone">
            <div><strong>Eliminar canal</strong><p>Se ocultará de la configuración y dejará de recibir mensajes. El historial se conservará.</p></div>
            <button class="danger-btn" type="button" @click="deleteChannel">Eliminar canal</button>
          </div>

          <footer class="editor-actions">
            <button v-if="creating" class="secondary-btn" type="button" @click="cancelCreate">Cancelar</button>
            <button v-else class="secondary-btn" type="button" @click="toggleStatus">
              {{ selected?.status === 'active' ? 'Desactivar' : 'Activar' }}
            </button>
            <button class="primary-btn" type="button" :disabled="saving" @click="save">
              {{ saving ? 'Guardando…' : (creating ? (form.type === 'whatsapp' ? 'Crear canal y conectar' : 'Crear canal') : 'Guardar cambios') }}
            </button>
          </footer>
        </template>
        <div v-else class="empty-editor"><HeroIcon name="adjustments-horizontal" /><h3>Selecciona un canal</h3><p>Podrás editar su integración, seguridad y equipo asignado.</p></div>
      </section>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { adminChannelsApi, type AdminAgent, type AdminChannel } from '@/services/adminChannels'
import { useAppDialog } from '@/composables/useAppDialog'
import { useAppNotification } from '@/composables/useAppNotification'

const channels = ref<AdminChannel[]>([])
const appDialog = useAppDialog()
const agents = ref<AdminAgent[]>([])
const selected = ref<AdminChannel | null>(null)
const creating = ref(false)
const loading = ref(true)
const saving = ref(false)
const savingWhatsApp = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const notification = useAppNotification()
watch(successMessage, value => { if (value) { notification.success(value); successMessage.value = '' } })
const copiedValue = ref('')
let webhookRefreshTimer: ReturnType<typeof setTimeout> | null = null
let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null
const form = reactive({ name: '', slug: '', type: 'web', authenticationMode: 'mixed', origins: '', agentIds: [] as number[] })
const whatsappForm = reactive({ phoneNumberId: '', businessAccountId: '', displayPhoneNumber: '', graphVersion: 'v19.0', accessToken: '', verifyToken: '', appSecret: '' })
const widgetOrigin = window.location.origin
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const installationScript = computed(() => {
  if (!selected.value) return ''
  return `<script src="${widgetOrigin}/chat-widget.js" data-api-url="${apiUrl}" data-channel-key="${selected.value.publicKey}" data-auth-storage-key="token" data-user-storage-key="user"><\/script>`
})
const authModeTitle = computed(() => ({
  anonymous: 'Atención sin identificación',
  authenticated: 'Chat privado para tus usuarios',
  mixed: 'Atiende a cualquier persona'
}[form.authenticationMode] || 'Modo de autenticación'))
const authModeDescription = computed(() => ({
  anonymous: 'El chat estará disponible para todos y cada conversación aparecerá como Visitante.',
  authenticated: 'El chat solo se mostrará después de iniciar sesión. Tu equipo verá el nombre y el correo de la persona.',
  mixed: 'El chat estará disponible para todos. Las personas con cuenta aparecerán con su nombre y las demás como Visitante.'
}[form.authenticationMode] || ''))
const authModeHint = computed(() => ({
  authenticated: 'Cuando la persona cierre sesión, el chat dejará de mostrarse.',
  mixed: 'Ideal para atender tanto a clientes actuales como a nuevos interesados.'
}[form.authenticationMode] || ''))
const whatsappWebhookUrl = computed(() => {
  const connection = selected.value?.whatsappConnection
  if (!connection) return ''
  if (connection.webhookUrl?.startsWith('https://')) return connection.webhookUrl
  return apiUrl.startsWith('https://') ? `${apiUrl}${connection.webhookPath}` : ''
})

function fill(channel: AdminChannel) {
  form.name = channel.name; form.slug = channel.slug; form.type = channel.type
  form.authenticationMode = channel.authenticationMode
  form.origins = channel.allowedOrigins.join('\n')
  form.agentIds = agents.value.filter(a => a.channelIds.includes(channel.id)).map(a => a.id)
  Object.assign(whatsappForm, {
    phoneNumberId: channel.whatsappConnection?.phoneNumberId || '',
    businessAccountId: channel.whatsappConnection?.businessAccountId || '',
    displayPhoneNumber: channel.whatsappConnection?.displayPhoneNumber || '',
    graphVersion: channel.whatsappConnection?.graphVersion || 'v19.0',
    accessToken: '', verifyToken: '', appSecret: ''
  })
}
function selectChannel(channel: AdminChannel) { creating.value = false; selected.value = channel; fill(channel) }
function startCreate() {
  creating.value = true; selected.value = null
  Object.assign(form, { name: '', slug: '', type: 'web', authenticationMode: 'mixed', origins: '', agentIds: [] })
  Object.assign(whatsappForm, { phoneNumberId: '', businessAccountId: '', displayPhoneNumber: '', graphVersion: 'v19.0', accessToken: '', verifyToken: '', appSecret: '' })
}
function cancelCreate() { creating.value = false; if (channels.value[0]) selectChannel(channels.value[0]) }
function origins() { return form.origins.split('\n').map(v => v.trim()).filter(Boolean) }
function message(error: any) { return error.response?.data?.error || error.message || 'Ocurrió un error' }

async function load() {
  loading.value = true
  try {
    const [channelData, agentData] = await Promise.all([adminChannelsApi.list(), adminChannelsApi.agents()])
    channels.value = channelData; agents.value = agentData
    if (selected.value) {
      const nextSelection = channelData.find(c => c.id === selected.value?.id) || channelData[0]
      if (nextSelection) selectChannel(nextSelection)
    }
    else if (!creating.value && channelData[0]) selectChannel(channelData[0])
  } catch (error) { errorMessage.value = message(error) }
  finally {
    loading.value = false
    scheduleWebhookRefresh()
  }
}

function scheduleWebhookRefresh() {
  if (webhookRefreshTimer) {
    clearTimeout(webhookRefreshTimer)
    webhookRefreshTimer = null
  }
  const connection = selected.value?.whatsappConnection
  if (!creating.value && connection && !connection.webhookUrl) {
    webhookRefreshTimer = setTimeout(() => {
      webhookRefreshTimer = null
      load()
    }, 2500)
  }
}

async function save() {
  saving.value = true; errorMessage.value = ''; successMessage.value = ''
  try {
    const payload = {
      name: form.name,
      slug: form.slug,
      type: form.type,
      authenticationMode: form.type === 'web' ? form.authenticationMode : 'anonymous',
      allowedOrigins: form.type === 'web' ? origins() : []
    }
    if (creating.value) {
      if (form.type === 'whatsapp' && (!whatsappForm.phoneNumberId || !whatsappForm.accessToken || !whatsappForm.verifyToken || !whatsappForm.appSecret)) {
        throw new Error('Completa ID del número, Token de acceso, Token de verificación y Clave secreta de la aplicación.')
      }
      const result = await adminChannelsApi.create(payload)
      if (form.type === 'whatsapp') {
        await adminChannelsApi.configureWhatsApp(result.channel.id, { ...whatsappForm })
      }
      creating.value = false; await load(); selectChannel(channels.value.find(c => c.id === result.channel.id)!)
    } else if (selected.value) {
      await adminChannelsApi.update(selected.value.id, payload)
      await adminChannelsApi.assignAgents(selected.value.id, form.agentIds)
      await load()
    }
    notification.success('Configuración guardada.')
  } catch (error) { errorMessage.value = message(error) }
  finally { saving.value = false }
}

async function toggleStatus() {
  if (!selected.value) return
  try { await adminChannelsApi.update(selected.value.id, { status: selected.value.status === 'active' ? 'disabled' : 'active' }); await load() }
  catch (error) { errorMessage.value = message(error) }
}
async function rotateCredentials() {
  if (!selected.value || !await appDialog.confirm('Tendrás que reemplazar el código instalado en el sitio.', { title: '¿Regenerar la clave del widget?', confirmLabel: 'Regenerar clave' })) return
  try { await adminChannelsApi.rotate(selected.value.id); await load(); notification.success('Clave regenerada. Copia nuevamente el código de instalación.') }
  catch (error) { errorMessage.value = message(error) }
}
async function saveWhatsApp() {
  if (!selected.value) return
  savingWhatsApp.value = true; errorMessage.value = ''; successMessage.value = ''
  try {
    await adminChannelsApi.configureWhatsApp(selected.value.id, { ...whatsappForm })
    await load(); notification.success('Conexión de WhatsApp guardada.')
  } catch (error) { errorMessage.value = message(error) }
  finally { savingWhatsApp.value = false }
}
async function disconnectWhatsApp() {
  if (!selected.value) return
  try { await adminChannelsApi.disconnectWhatsApp(selected.value.id); await load(); notification.success('WhatsApp desconectado.') }
  catch (error) { errorMessage.value = message(error) }
}
async function deleteChannel() {
  if (!selected.value) return
  const channel = selected.value
  const confirmed = await appDialog.confirm(
    `El canal “${channel.name}” dejará de recibir mensajes y desaparecerá de la configuración. El historial se conservará.`,
    { title: '¿Eliminar canal?', confirmLabel: 'Eliminar canal' }
  )
  if (!confirmed) return
  try {
    await adminChannelsApi.remove(channel.id)
    selected.value = null
    await load()
    notification.success('Canal eliminado.')
  } catch (error) {
    errorMessage.value = message(error)
  }
}
async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    copiedValue.value = value
    notification.success('Copiado al portapapeles.')
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => { copiedValue.value = '' }, 2200)
  } catch {
    await appDialog.alert('No fue posible copiar el contenido. Inténtalo nuevamente.', { title: 'No se pudo copiar' })
  }
}
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() }
function roleLabel(role: string) { return ({ admin: 'Administrador', supervisor: 'Supervisor', agent: 'Agente' } as Record<string, string>)[role] || role }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin actividad' }
onMounted(load)
onBeforeUnmount(() => {
  if (webhookRefreshTimer) clearTimeout(webhookRefreshTimer)
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
})
</script>

<style scoped>
.settings-page{height:100%;overflow:auto;padding:28px;background:#f4f6fb}.settings-header{max-width:1260px;margin:0 auto 22px;display:flex;justify-content:space-between;align-items:end}.eyebrow{color:var(--color-primary-2);font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}.settings-header h2{font-size:1.75rem;margin:3px 0;color:var(--color-text-strong)}.settings-header p,.editor-title p,.section-heading p,.danger-zone p{color:var(--color-text-muted);font-size:.88rem}.settings-grid{max-width:1260px;margin:auto;display:grid;grid-template-columns:320px minmax(0,1fr);gap:20px;align-items:start}.channel-list,.editor-card{background:white;border:1px solid var(--color-border);border-radius:16px;box-shadow:var(--shadow-sm)}.channel-list{padding:10px}.channel-card{width:100%;border:0;background:transparent;border-radius:12px;padding:13px;display:flex;align-items:center;gap:12px;text-align:left;color:var(--color-text);cursor:pointer}.channel-card:hover,.channel-card.selected{background:var(--color-primary-soft)}.channel-card.selected{box-shadow:inset 3px 0 var(--color-primary-2)}.channel-icon{width:38px;height:38px;border-radius:10px;background:white;color:var(--color-primary);box-shadow:var(--shadow-sm);display:grid;place-items:center;font-size:1.2rem}.channel-summary{display:flex;flex:1;min-width:0;flex-direction:column;gap:2px}.channel-summary small{color:var(--color-text-muted)}.channel-meta{font-size:.75rem;color:var(--color-text-soft);display:flex;align-items:center;gap:5px}.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#9ca3af}.status-dot.active{background:var(--color-success);box-shadow:0 0 0 3px #e8f5e9}.status-dot.disabled{background:#aab0ba}.editor-card{padding:24px}.editor-title,.section-heading,.editor-actions,.danger-zone{display:flex;align-items:center;justify-content:space-between;gap:16px}.editor-title{padding-bottom:20px;border-bottom:1px solid var(--color-border-soft-2)}.connection-pill{background:var(--color-surface-muted-2);border:1px solid var(--color-border);border-radius:999px;padding:8px 12px;font-size:.8rem;display:flex;align-items:center;gap:7px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px}label{font-size:.82rem;font-weight:650;color:var(--color-text-soft);display:flex;flex-direction:column;gap:7px}input,select,textarea{width:100%;border:1px solid var(--color-border-strong);border-radius:9px;padding:10px 12px;background:white;color:var(--color-text);font:inherit}input:focus,select:focus,textarea:focus{outline:3px solid rgba(63,81,181,.12);border-color:var(--color-primary-2)}.full-field{margin-top:16px}.full-field small{font-weight:400;color:var(--color-text-muted)}.section-block{border-top:1px solid var(--color-border-soft-2);margin-top:24px;padding-top:22px}.section-heading{margin-bottom:13px}.code-box{display:flex;align-items:center;gap:10px;padding:12px;background:#111827;color:#e5e7eb;border-radius:10px}.code-box code{flex:1;overflow-wrap:anywhere;font-size:.78rem}.code-box button{border:0;border-radius:7px;padding:7px 10px;cursor:pointer;color:var(--color-primary);font-weight:700}.agent-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.agent-option{flex-direction:row;align-items:center;border:1px solid var(--color-border);padding:10px;border-radius:10px;cursor:pointer}.agent-option input{width:auto}.agent-option>span:nth-of-type(2){display:flex;flex:1;flex-direction:column}.agent-option small{font-weight:400;color:var(--color-text-muted)}.avatar{width:32px;height:32px;border-radius:9px;background:var(--color-primary-tint);color:var(--color-primary);display:grid;place-items:center}.danger-zone{margin-top:24px;border:1px solid var(--color-danger-border);background:var(--color-danger-soft);border-radius:12px;padding:15px}.editor-actions{margin-top:22px;padding-top:18px;border-top:1px solid var(--color-border-soft-2);justify-content:flex-end}.primary-btn,.secondary-btn,.danger-btn{border:0;border-radius:9px;padding:10px 15px;font-weight:650;cursor:pointer;display:inline-flex;align-items:center;gap:7px}.primary-btn{background:var(--color-primary);color:white}.secondary-btn{background:var(--color-surface-muted);color:var(--color-text)}.danger-btn{background:white;color:var(--color-danger-dark);border:1px solid var(--color-danger-border)}.alert{max-width:1260px;margin:0 auto 14px;padding:11px 14px;border-radius:9px}.alert.error{background:var(--color-danger-soft);color:var(--color-danger-dark)}.alert.success{background:#e8f5e9;color:var(--color-success-dark)}.list-state,.empty-editor{padding:35px;text-align:center;color:var(--color-text-muted)}.empty-editor{min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center}.empty-editor>svg{font-size:2.4rem}.modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.58);display:grid;place-items:center;z-index:100}.secret-modal{background:white;width:min(560px,calc(100vw - 32px));border-radius:16px;padding:26px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.25)}.secret-modal .code-box{margin:18px 0;text-align:left}.warning-icon{display:grid;place-items:center;margin:0 auto 12px;width:44px;height:44px;border-radius:50%;background:var(--color-warning-soft);color:var(--color-warning-dark);font-size:1.4rem;font-weight:800}.full-span{grid-column:1/-1}.inline-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.creation-note{margin-top:14px;color:var(--color-text-muted);font-size:.82rem}.whatsapp-error{margin:14px 0 0}.whatsapp-config{background:#f8fafc;border:1px solid var(--color-border);border-radius:12px;padding:18px}.whatsapp-config.section-block{margin-top:24px}@media(max-width:900px){.settings-grid{grid-template-columns:1fr}.channel-list{max-height:260px;overflow:auto}.form-grid,.agent-grid{grid-template-columns:1fr}.full-span{grid-column:auto}}@media(max-width:600px){.settings-page{padding:14px}.settings-header{align-items:flex-start;gap:15px}.editor-card{padding:16px}.danger-zone{align-items:flex-start;flex-direction:column}}
.webhook-pending{display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px 14px;border-radius:10px;background:var(--color-warning-soft);color:var(--color-warning-dark)}.webhook-pending>svg{font-size:20px}.webhook-pending span{display:flex;flex-direction:column;gap:2px}.webhook-pending small{font-weight:400}.auth-mode-info{display:flex;gap:12px;margin-top:16px;padding:14px 16px;border:1px solid #dbe3f0;border-radius:12px;background:#f8fafc;color:var(--color-text)}
.auth-info-icon{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border-radius:10px;background:#e8edff;color:var(--color-primary)}
.auth-mode-info strong,.installation-note strong{color:var(--color-text-strong);font-size:.88rem}
.auth-mode-info p,.installation-note p{margin:4px 0;color:var(--color-text-muted);font-size:.82rem;line-height:1.5}
.auth-mode-info small,.installation-note small{display:block;color:var(--color-text-soft);font-size:.76rem;line-height:1.5}
.auth-mode-info code,.installation-note code{padding:2px 5px;border-radius:5px;background:#e9edf5;color:var(--color-text-strong);font-size:.75rem}
.auth-mode-info.mode-authenticated{border-color:#cfd8ff;background:#f6f7ff}
.installation-note{margin-top:12px;padding:14px 16px;border-radius:10px;background:var(--color-surface-muted-2)}
.code-box button{display:inline-flex;align-items:center;gap:6px;transition:background .16s ease,color .16s ease,transform .16s ease}
.code-box button:hover{background:#eef0ff}
.code-box button:active{transform:scale(.96)}
.code-box button.copied{background:#dcfce7;color:#15803d}
.code-box button>svg{font-size:16px}
.copy-toast{position:fixed;right:24px;bottom:24px;z-index:200;display:flex;align-items:center;gap:9px;padding:12px 16px;border:1px solid #bbf7d0;border-radius:11px;background:#f0fdf4;color:#166534;font-size:.86rem;font-weight:700;box-shadow:0 12px 32px rgba(15,23,42,.16)}
.copy-toast>svg{font-size:20px}
.copy-toast-enter-active,.copy-toast-leave-active{transition:opacity .18s ease,transform .18s ease}
.copy-toast-enter-from,.copy-toast-leave-to{opacity:0;transform:translateY(8px)}
@media(max-width:600px){.copy-toast{left:14px;right:14px;bottom:14px;justify-content:center}}
</style>
