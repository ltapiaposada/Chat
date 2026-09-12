<template>
  <div class="page">
    <AdminPageHeader title="Departamentos" description="Organiza la atención por equipos como Ventas, Soporte o Facturación."><button class="primary" @click="newDepartment"><HeroIcon name="plus" /> Nuevo departamento</button></AdminPageHeader>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div class="layout">
      <aside>
        <button v-for="item in departments" :key="item.id" class="item" :class="{ selected: selected?.id === item.id }" @click="select(item)">
          <span class="icon"><HeroIcon name="briefcase" /></span><span><strong>{{ item.name }}</strong><small>{{ item.agentIds.length }} agentes · {{ item.channelIds.length }} canales</small></span><i :class="item.status"></i>
        </button>
        <p v-if="!departments.length" class="empty">No hay departamentos.</p>
      </aside>
      <main v-if="selected || creating">
        <h3>{{ creating ? 'Nuevo departamento' : form.name }}</h3>
        <div class="department-guide">
          <span class="guide-icon"><HeroIcon name="information-circle" /></span>
          <div>
            <strong>¿Cómo funciona?</strong>
            <p>Primero elige en qué canales estará disponible este departamento. Después selecciona el equipo que atenderá sus conversaciones.</p>
            <small>Un agente recibirá mensajes de este departamento únicamente si también tiene acceso al canal por el que escribió el cliente.</small>
          </div>
        </div>
        <div class="grid">
          <label>Nombre<input v-model="form.name" placeholder="Ventas" /></label>
          <label>Slug<input v-model="form.slug" :disabled="!creating" placeholder="ventas" /></label>
          <label>¿Cómo se asignarán las conversaciones?<select v-model="form.routingStrategy"><option value="broadcast">Avisar a todo el equipo</option><option value="least_busy">Asignar al agente con menos conversaciones</option><option value="direct">Asignar siempre a un agente</option></select></label>
          <label>Si nadie está disponible<select v-model="form.fallbackStrategy"><option value="channel_queue">Permitir que otro agente del canal la atienda</option><option value="department_queue">Esperar a un agente de este departamento</option></select></label>
          <label v-if="form.routingStrategy === 'direct'">Agente responsable<select v-model.number="form.defaultAgentId"><option :value="null">Seleccionar agente</option><option v-for="agent in assignedAgents" :key="agent.id" :value="agent.id">{{ agent.name }}</option></select></label>
        </div>
        <section><h4>¿Dónde estará disponible?</h4><p>Vincula los canales que atenderá este departamento. Si un canal ofrece varias áreas, el cliente podrá indicar con cuál necesita hablar.</p><div class="options"><label v-for="channel in channels" :key="channel.id"><input v-model="form.channelIds" type="checkbox" :value="channel.id" />{{ channel.name }} <small>{{ channel.type }}</small></label></div></section>
        <section><h4>¿Quién atenderá las conversaciones?</h4><p>Selecciona los agentes que forman parte de este equipo.</p><div class="options"><label v-for="agent in agents" :key="agent.id"><input v-model="form.agentIds" type="checkbox" :value="agent.id" />{{ agent.name }} <small>{{ agent.role }}</small></label></div><p class="assignment-note"><HeroIcon name="information-circle" /> Recuerda: el agente también debe estar asignado al canal correspondiente.</p></section>
        <footer><button v-if="!creating" class="delete" @click="deleteDepartment">Eliminar departamento</button><button v-if="creating" class="secondary" @click="cancel">Cancelar</button><button v-else class="secondary" @click="toggle">{{ selected?.status === 'active' ? 'Desactivar' : 'Activar' }}</button><button class="primary" :disabled="saving" @click="save">{{ saving ? 'Guardando…' : 'Guardar' }}</button></footer>
      </main>
      <main v-else class="empty">Selecciona o crea un departamento.</main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAppNotification } from '@/composables/useAppNotification'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { useAppDialog } from '@/composables/useAppDialog'
import { adminChannelsApi, type AdminAgent, type AdminChannel } from '@/services/adminChannels'
import { adminDepartmentsApi, type AdminDepartment } from '@/services/adminDepartments'

const departments=ref<AdminDepartment[]>([]), channels=ref<AdminChannel[]>([]), agents=ref<AdminAgent[]>([])
const appDialog=useAppDialog()
const selected=ref<AdminDepartment|null>(null), creating=ref(false), saving=ref(false), error=ref(''), success=ref('')
const notification=useAppNotification()
watch(success,value=>{if(value){notification.success(value);success.value=''}})
const form=reactive({name:'',slug:'',routingStrategy:'broadcast',fallbackStrategy:'channel_queue',defaultAgentId:null as number|null,channelIds:[] as number[],agentIds:[] as number[]})
const assignedAgents=computed(()=>agents.value.filter(a=>form.agentIds.includes(a.id)))
const errorText=(e:any)=>e.response?.data?.error||e.message||'Ocurrió un error'
function fill(d:AdminDepartment){Object.assign(form,{name:d.name,slug:d.slug,routingStrategy:d.routingStrategy,fallbackStrategy:d.fallbackStrategy,defaultAgentId:d.defaultAgentId,channelIds:[...d.channelIds],agentIds:[...d.agentIds]})}
function select(d:AdminDepartment){selected.value=d;creating.value=false;fill(d)}
function newDepartment(){selected.value=null;creating.value=true;Object.assign(form,{name:'',slug:'',routingStrategy:'broadcast',fallbackStrategy:'channel_queue',defaultAgentId:null,channelIds:[],agentIds:[]})}
function cancel(){creating.value=false;if(departments.value[0])select(departments.value[0])}
async function load(){try{const [d,c,a]=await Promise.all([adminDepartmentsApi.list(),adminChannelsApi.list(),adminChannelsApi.agents()]);departments.value=d;channels.value=c;agents.value=a;if(selected.value){const current=d.find(x=>x.id===selected.value?.id);if(current)select(current)}else if(!creating.value&&d[0])select(d[0])}catch(e){error.value=errorText(e)}}
async function save(){saving.value=true;error.value='';success.value='';try{let id=selected.value?.id;if(creating.value){id=(await adminDepartmentsApi.create({...form})).id}if(id){await adminDepartmentsApi.assignments(id,form.agentIds,form.channelIds);await adminDepartmentsApi.update(id,{name:form.name,routingStrategy:form.routingStrategy,fallbackStrategy:form.fallbackStrategy,defaultAgentId:form.defaultAgentId})}creating.value=false;await load();const current=departments.value.find(d=>d.id===id);if(current)select(current);notification.success('Departamento guardado.')}catch(e){error.value=errorText(e)}finally{saving.value=false}}
async function toggle(){if(!selected.value)return;try{await adminDepartmentsApi.update(selected.value.id,{status:selected.value.status==='active'?'disabled':'active'});await load()}catch(e){error.value=errorText(e)}}
async function deleteDepartment(){if(!selected.value)return;const department=selected.value;if(!await appDialog.confirm(`El departamento “${department.name}” desaparecerá de la configuración. Sus conversaciones conservarán el historial.`,{title:'¿Eliminar departamento?',confirmLabel:'Eliminar departamento'}))return;try{await adminDepartmentsApi.remove(department.id);selected.value=null;await load();notification.success('Departamento eliminado.')}catch(e){error.value=errorText(e)}}
onMounted(load)
</script>

<style scoped>
.page{height:100%;overflow:auto;padding:28px;background:#f4f6fb}.page>header{max-width:1260px;margin:0 auto 22px;display:flex;justify-content:space-between;align-items:end}.eyebrow{color:var(--color-primary-2);font-weight:700;font-size:.78rem;text-transform:uppercase}.page h2{margin:3px 0}.page header p,section p{color:var(--color-text-muted);font-size:.88rem}.layout{max-width:1260px;margin:auto;display:grid;grid-template-columns:320px 1fr;gap:20px}.layout>aside,.layout>main{background:white;border:1px solid var(--color-border);border-radius:16px;padding:14px;box-shadow:var(--shadow-sm)}.layout>main{padding:24px}.item{width:100%;border:0;background:transparent;padding:12px;border-radius:11px;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer}.item.selected,.item:hover{background:var(--color-primary-soft)}.item>span:nth-child(2){display:flex;flex:1;flex-direction:column}.item small,.options small{color:var(--color-text-muted)}.icon{width:36px;height:36px;display:grid;place-items:center;border-radius:9px;background:white;color:var(--color-primary)}i{width:9px;height:9px;border-radius:50%;background:#aaa}i.active{background:var(--color-success)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:20px}label{display:flex;flex-direction:column;gap:7px;font-size:.82rem;font-weight:650}input,select{padding:10px;border:1px solid var(--color-border-strong);border-radius:9px;background:white}section{border-top:1px solid var(--color-border);margin-top:22px;padding-top:18px}.options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.options label{flex-direction:row;align-items:center;border:1px solid var(--color-border);padding:10px;border-radius:9px}.options input{width:auto}footer{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--color-border);margin-top:22px;padding-top:18px}.primary,.secondary{border:0;border-radius:9px;padding:10px 15px;font-weight:650;cursor:pointer;display:inline-flex;gap:7px}.primary{background:var(--color-primary);color:white}.secondary{background:var(--color-surface-muted)}.alert{max-width:1260px;margin:0 auto 14px;padding:11px;border-radius:9px}.error{background:var(--color-danger-soft);color:var(--color-danger-dark)}.success{background:#e8f5e9;color:var(--color-success-dark)}.empty{text-align:center;color:var(--color-text-muted);padding:40px}@media(max-width:850px){.layout{grid-template-columns:1fr}.grid,.options{grid-template-columns:1fr}}
.department-guide{display:flex;gap:12px;margin-top:16px;padding:14px 16px;border:1px solid #dbe3f0;border-radius:12px;background:#f8fafc}.guide-icon{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border-radius:10px;background:#e8edff;color:var(--color-primary)}.department-guide strong{color:var(--color-text-strong);font-size:.88rem}.department-guide p{margin:4px 0;color:var(--color-text-muted);font-size:.82rem;line-height:1.5}.department-guide small{display:block;color:var(--color-text-soft);font-size:.76rem;line-height:1.5}.assignment-note{display:flex;align-items:center;gap:6px;margin-top:10px!important;padding:9px 11px;border-radius:8px;background:var(--color-surface-muted-2);font-size:.78rem!important}.assignment-note>svg{flex:0 0 17px;font-size:17px;color:var(--color-primary)}
.layout>aside{display:flex;flex-direction:column;gap:6px}
.item{transition:background .15s ease,transform .15s ease}
.item:hover{background:var(--color-surface-muted)}
.item.selected,.item.selected:hover{background:var(--color-primary-soft)}
.item:active{transform:scale(.985)}
.delete{margin-right:auto;border:1px solid var(--color-danger-border);border-radius:9px;padding:10px 15px;background:#fff;color:var(--color-danger-dark);font-weight:650;cursor:pointer}
.delete:hover{background:var(--color-danger-soft)}
</style>
