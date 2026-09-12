<template>
  <div class="page">
    <AdminPageHeader title="Métricas" description="Consulta la atención de tu empresa y el desempeño de cada agente."><button :disabled="loading" @click="load"><HeroIcon name="arrow-path" /> Actualizar</button></AdminPageHeader>
    <div class="filters"><label>Desde<UiDatePicker v-model="dateFrom" label="Fecha inicial" :max="dateTo || undefined" /></label><label>Hasta<UiDatePicker v-model="dateTo" label="Fecha final" :min="dateFrom || undefined" /></label><button type="button" class="month-btn" @click="currentMonth">Mes actual</button></div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="loading" role="status">Cargando métricas…</p>
    <div v-if="metrics" class="cards">
      <article><strong>{{ metrics.summary.total_chats || 0 }}</strong><span>Total chats</span></article>
      <article><strong>{{ metrics.summary.pending_chats || 0 }}</strong><span>Pendientes</span></article>
      <article><strong>{{ metrics.summary.active_chats || 0 }}</strong><span>Activos</span></article>
      <article><strong>{{ metrics.summary.closed_chats || 0 }}</strong><span>Cerrados</span></article>
      <article><strong>{{ metrics.summary.avg_first_response_seconds || 0 }} s</strong><span>Primera respuesta</span></article>
      <article><strong>{{ metrics.summary.avg_rating || '—' }}</strong><span>Calificación</span></article>
    </div>
    <div v-if="metrics" class="agent-report">
      <div class="report-scroll">
        <div class="agent-panel">
          <h3 class="report-title">Por agente</h3>
          <div class="agent-list">
          <div class="col-head"><div class="c-agent">Agente</div><div class="c-stat">Asignados</div><div class="c-stat">En atención</div><div class="c-stat">Cerrados</div><div class="c-chev" /></div>
          <details v-for="agent in metrics.agents" :key="agent.id" class="agent-details">
            <summary>
              <span class="report-avatar">{{ initials(agent.name) }}</span>
              <span class="agent-name">{{ agent.name }}</span>
              <span class="stat-num">{{ agent.assigned_chats }}</span>
              <span class="stat-num secondary-stat">{{ agent.active_chats }}</span>
              <span class="stat-num secondary-stat">{{ agent.closed_chats }}</span>
              <span class="chev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></span>
            </summary>
            <div class="agent-detail">
              <div class="report-tabs" role="tablist" :aria-label="`Desglose de ${agent.name}`">
                <button v-for="tab in reportTabs" :id="`agent-${agent.id}-${tab.value}-tab`" :key="tab.value" type="button" role="tab" class="report-tab" :class="{ 'is-active': selectedTab(agent.id) === tab.value }" :aria-selected="selectedTab(agent.id) === tab.value" :aria-controls="`agent-${agent.id}-panel`" :tabindex="selectedTab(agent.id) === tab.value ? 0 : -1" @click="agentTabs[agent.id] = tab.value" @keydown.left.prevent="switchReportTab(agent.id, $event)" @keydown.right.prevent="switchReportTab(agent.id, $event)">{{ tab.label }}</button>
              </div>
              <div :id="`agent-${agent.id}-panel`" role="tabpanel" :aria-labelledby="`agent-${agent.id}-${selectedTab(agent.id)}-tab`" tabindex="0">
                <table class="mini"><thead><tr><th>{{ selectedTab(agent.id) === 'channels' ? 'Canal' : 'Departamento' }}</th><th class="num">Asignados</th><th class="num">Cerrados</th></tr></thead><tbody>
                  <tr v-for="row in agent[selectedTab(agent.id)]" :key="row.id ?? row.name"><td>{{ row.name }}</td><td class="num"><b>{{ row.total_chats }}</b></td><td class="num">{{ row.closed_chats }}</td></tr>
                  <tr v-if="!agent[selectedTab(agent.id)].length"><td colspan="3" class="report-empty">Sin chats en el periodo seleccionado.</td></tr>
                </tbody></table>
              </div>
            </div>
          </details>
          <p v-if="!metrics.agents.length" class="report-empty">No hay agentes registrados.</p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="metrics" class="tables">
      <section><h3>Por canal</h3><table><thead><tr><th>Canal</th><th>Tipo</th><th>Chats</th><th>Pendientes</th></tr></thead><tbody><tr v-for="row in metrics.channels" :key="row.id"><td>{{ row.name }}</td><td>{{ row.type }}</td><td>{{ row.total_chats }}</td><td>{{ row.pending_chats }}</td></tr></tbody></table></section>
      <section><h3>Por departamento</h3><table><thead><tr><th>Departamento</th><th>Agentes</th><th>Chats</th><th>Pendientes</th></tr></thead><tbody><tr v-for="row in metrics.departments" :key="row.id"><td>{{ row.name }}</td><td>{{ row.assigned_agents }}</td><td>{{ row.total_chats }}</td><td>{{ row.pending_chats }}</td></tr></tbody></table></section>
    </div>
  </div>
</template>
<script setup lang="ts">
import axios from 'axios'
import { ref, watch, onMounted } from 'vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import UiDatePicker from '@/components/ui/UiDatePicker.vue'
import { getAuthHeaders } from '@/services/authHeaders'
interface Breakdown { id: number | null; name: string; total_chats: number; closed_chats: number }
interface AgentReport { id: number; name: string; assigned_chats: number; active_chats: number; closed_chats: number; channels: Breakdown[]; departments: Breakdown[] }
interface Metrics { summary: Record<string, number | string | null>; channels: { id: number; name: string; type: string; total_chats: number; pending_chats: number }[]; departments: { id: number; name: string; assigned_agents: number; total_chats: number; pending_chats: number }[]; agents: AgentReport[] }
const metrics = ref<Metrics | null>(null), error = ref(''), loading = ref(false)
type ReportTab = 'channels' | 'departments'
const agentTabs = ref<Record<number, ReportTab>>({})
const reportTabs: { value: ReportTab; label: string }[] = [{ value: 'channels', label: 'Por canal' }, { value: 'departments', label: 'Por departamento' }]
function selectedTab(id: number): ReportTab { return agentTabs.value[id] || 'channels' }
function initials(name: string) { return name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase() }
function switchReportTab(id: number, event: KeyboardEvent) {
  agentTabs.value[id] = selectedTab(id) === 'channels' ? 'departments' : 'channels'
  const button = event.currentTarget as HTMLElement
  button.parentElement?.querySelector<HTMLButtonElement>(`#agent-${id}-${agentTabs.value[id]}-tab`)?.focus()
}
const api = import.meta.env.VITE_API_URL || 'http://localhost:3000'
function inputDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
const today = new Date()
const dateFrom = ref(inputDate(new Date(today.getFullYear(), today.getMonth(), 1)))
const dateTo = ref(inputDate(new Date(today.getFullYear(), today.getMonth()+1, 0)))
function currentMonth() { const now = new Date(); dateFrom.value = inputDate(new Date(now.getFullYear(), now.getMonth(), 1)); dateTo.value = inputDate(new Date(now.getFullYear(), now.getMonth()+1, 0)) }
let requestId = 0
async function load() {
  const id = ++requestId
  error.value = ''; metrics.value = null; loading.value = false
  if (!dateFrom.value || !dateTo.value || dateFrom.value > dateTo.value) { error.value = 'Selecciona un rango de fechas válido.'; return }
  const from = new Date(`${dateFrom.value}T00:00:00`)
  const until = new Date(`${dateTo.value}T00:00:00`); until.setDate(until.getDate()+1)
  loading.value = true
  try { const response = await axios.get<Metrics>(`${api}/api/admin/metrics`, { headers: getAuthHeaders(), params: { from: from.toISOString(), until: until.toISOString() } }); if (id === requestId) metrics.value = response.data }
  catch (e: any) { if (id === requestId) error.value = e.response?.data?.error || e.message }
  finally { if (id === requestId) loading.value = false }
}
watch([dateFrom,dateTo], load)
onMounted(load)
</script>
<style scoped>
.page{height:100%;overflow:auto;padding:28px;background:#f4f6fb}.page>header{max-width:1260px;margin:0 auto 22px;display:flex;justify-content:space-between;align-items:end}.eyebrow{color:var(--color-primary-2);font-weight:700;font-size:.78rem;text-transform:uppercase}.page h2{margin:3px 0}.page header p{color:var(--color-text-muted)}button{border:0;border-radius:9px;padding:10px 15px;background:var(--color-primary);color:white;display:flex;gap:7px}.cards,.tables{max-width:1260px;margin:0 auto;display:grid;gap:14px}.cards{grid-template-columns:repeat(5,1fr)}article,section{background:white;border:1px solid var(--color-border);border-radius:14px;box-shadow:var(--shadow-sm)}article{padding:18px;display:flex;flex-direction:column}article strong{font-size:1.6rem;color:var(--color-primary)}article span{font-size:.8rem;color:var(--color-text-muted)}.tables{grid-template-columns:1fr 1fr;margin-top:18px}section{padding:18px}table{width:100%;border-collapse:collapse;text-align:left;font-size:.83rem}th,td{padding:10px;border-bottom:1px solid var(--color-border)}th{color:var(--color-text-muted)}.error{max-width:1260px;margin:auto;background:var(--color-danger-soft);padding:12px;border-radius:9px}@media(max-width:900px){.cards{grid-template-columns:repeat(2,1fr)}.tables{grid-template-columns:1fr}}
.filters{max-width:1260px;margin:0 auto 20px;display:flex;align-items:flex-end;flex-wrap:wrap;gap:14px;padding:18px;background:#fff;border:1px solid var(--color-border);border-radius:14px}
.filters label{display:flex;flex-direction:column;gap:7px;font-size:.82rem;font-weight:600}
.filters input{height:40px;border:1px solid var(--color-border-strong);border-radius:9px;padding:8px 12px;font:inherit;color:var(--color-text);background:#fff}
.filters small{align-self:center;font-size:.78rem;color:var(--color-text-muted);flex:1;min-width:220px}
.month-btn{height:40px;background:var(--color-primary-soft);color:var(--color-primary);cursor:pointer}
.cards{grid-template-columns:repeat(6,minmax(0,1fr))}
.agent-report{max-width:1260px;margin:18px auto 0}
.agent-report{font-family:Inter,system-ui,sans-serif;color:#14141f}
.report-title{margin:0;padding:18px 24px;font-size:1.05rem;font-weight:700;color:#14141f}
.report-scroll{overflow-x:auto;border-radius:16px}.agent-panel{min-width:620px;background:#fff;border:1px solid #e7e8f0;border-radius:16px;overflow:hidden}
.col-head{display:flex;align-items:center;padding:14px 24px;border-bottom:1px solid #e7e8f0;font-size:12px;font-weight:600;color:#9497aa}
.c-agent{flex:1;padding-left:48px}.c-stat{width:88px;text-align:right}.c-chev{width:20px}
.agent-details{border-bottom:1px solid #e7e8f0}.agent-details:last-child{border-bottom:0}
.agent-details summary{list-style:none;cursor:pointer;display:flex;align-items:center;padding:16px 24px;transition:background .15s ease}.agent-details summary::-webkit-details-marker{display:none}.agent-details summary:hover{background:#f0effb}.agent-details summary:focus-visible{outline:2px solid #4338ca;outline-offset:-3px;border-radius:10px}
.report-avatar{width:34px;height:34px;border-radius:9px;background:#eef0ff;color:#4338ca;font-weight:700;font-size:12.5px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:14px}
.agent-name{font-weight:600;font-size:14.5px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stat-num{width:88px;text-align:right;font-size:14.5px;font-weight:600}.stat-num.secondary-stat{color:#5b5f73;font-weight:500}
.chev{width:20px;display:flex;justify-content:flex-end;color:#9497aa;transition:transform .15s ease}.agent-details[open] .chev{transform:rotate(90deg)}
.agent-detail{padding:18px 24px 20px 72px;background:#fafafd;border-top:1px solid #e7e8f0}
.report-tabs{display:flex;gap:4px;margin-bottom:12px}.report-tab{font:inherit;font-size:12.5px;font-weight:600;padding:6px 12px;border:0;border-radius:7px;color:#5b5f73;cursor:pointer;background:transparent}.report-tab:hover{background:#f0effb}.report-tab.is-active{background:#eef0ff;color:#4338ca}
table.mini{width:100%;border-collapse:collapse}.mini th{text-align:left;font-size:11.5px;font-weight:600;color:#9497aa;padding:6px 0;border-bottom:1px solid #e7e8f0}.mini th.num,.mini td.num{text-align:right}.mini td{font-size:13.5px;padding:8px 0;color:#14141f;border-bottom:1px solid #f1f1f6}.mini tr:last-child td{border-bottom:0}.mini td.num{color:#5b5f73}.mini td.num b{color:#14141f;font-weight:600}.report-empty{padding:18px 24px;color:#9497aa;font-size:13px}
@media(prefers-reduced-motion:reduce){.chev,.agent-details summary{transition:none}}
.agent-list{margin:0 18px 18px;border:0;border-radius:11px;overflow:hidden}
.agent-panel :is(.report-title,.col-head,.report-avatar,.agent-name,.stat-num,.stat-num.secondary-stat,.report-tab,.mini th,.mini td b){font-weight:400}
.loading{max-width:1260px;margin:20px auto;color:var(--color-text-muted)}button:disabled{opacity:.5}button:focus-visible,input:focus-visible{outline:2px solid var(--color-primary);outline-offset:3px}
@media(max-width:1000px){.cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:600px){.page{padding:16px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.filters label{flex:1}.filters input{width:100%}}
</style>
