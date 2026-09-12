<template>
  <div class="page">
    <AdminPageHeader title="Agentes" description="Crea el equipo y asigna los canales que podrá atender."><button class="primary" @click="startCreate"><HeroIcon name="plus" /> Nuevo agente</button></AdminPageHeader>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div class="grid">
      <aside class="list">
        <button v-for="agent in agents" :key="agent.id" :class="{selected:selected?.id===agent.id}" @click="select(agent)">
          <span class="avatar">{{ initials(agent.name) }}</span><span><strong>{{ agent.name }}</strong><small>{{ agent.email }} · {{ label(agent.role) }}</small></span><i :class="{active:agent.isActive}"></i>
        </button>
      </aside>
      <section class="card" v-if="creating || selected">
        <div class="card-heading">
          <h3>{{ creating ? 'Crear agente' : 'Editar agente' }}</h3>
          <UiTooltip v-if="!creating" :text="form.isActive ? 'Desactivar cuenta: el agente no podrá iniciar sesión. Guarda para aplicar.' : 'Activar cuenta: el agente podrá iniciar sesión. Guarda para aplicar.'" placement="bottom">
            <div class="account-status">
              <span>{{ form.isActive ? 'Cuenta activa' : 'Cuenta inactiva' }}</span>
              <button class="account-switch" type="button" role="switch" :aria-checked="form.isActive" :aria-label="form.isActive ? 'Desactivar cuenta del agente' : 'Activar cuenta del agente'" :disabled="saving" @click="form.isActive = !form.isActive"><span /></button>
            </div>
          </UiTooltip>
        </div>
        <div class="fields">
          <label>Nombre<input v-model="form.name" /></label>
          <label>Correo<input v-model="form.email" type="email" :disabled="!creating" /></label>
          <label>Rol<select v-model="form.role"><option value="agent">Agente</option><option value="supervisor">Supervisor</option><option value="admin">Administrador</option></select></label>
          <label>{{ creating ? 'Contraseña temporal' : 'Nueva contraseña (opcional)' }}<input v-model="form.password" type="password" placeholder="Mínimo 8 caracteres" /></label>
        </div>
        <div class="channels"><h4>Canales asignados</h4><label v-for="channel in channels" :key="channel.id"><input v-model="form.channelIds" type="checkbox" :value="channel.id" /> {{ channel.name }}</label></div>
        <footer><button v-if="creating" class="secondary" @click="cancel">Cancelar</button><button class="primary" :disabled="saving || !valid" @click="save">{{ saving ? 'Guardando…' : 'Guardar agente' }}</button></footer>
      </section>
      <section v-else class="card empty">Selecciona un agente o crea uno nuevo.</section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAppNotification } from '@/composables/useAppNotification'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import UiTooltip from '@/components/ui/UiTooltip.vue'
import { adminChannelsApi, type AdminAgent, type AdminChannel } from '@/services/adminChannels'
const agents=ref<AdminAgent[]>([]), channels=ref<AdminChannel[]>([]), selected=ref<AdminAgent|null>(null)
const creating=ref(false), saving=ref(false), error=ref(''), success=ref('')
const notification=useAppNotification()
watch(success,value=>{if(value){notification.success(value);success.value=''}})
const form=reactive({name:'',email:'',password:'',role:'agent' as AdminAgent['role'],isActive:true,channelIds:[] as number[]})
const valid=computed(()=>form.name.trim()&&form.email.trim()&&(!creating.value||form.password.length>=8))
function fill(a:AdminAgent){Object.assign(form,{name:a.name,email:a.email||'',password:'',role:a.role,isActive:a.isActive,channelIds:[...a.channelIds]})}
function select(a:AdminAgent){creating.value=false;selected.value=a;fill(a)}
function startCreate(){creating.value=true;selected.value=null;Object.assign(form,{name:'',email:'',password:'',role:'agent',isActive:true,channelIds:[]})}
function cancel(){creating.value=false;if(agents.value[0])select(agents.value[0])}
function msg(e:any){return e.response?.data?.error||e.message||'No fue posible guardar'}
async function load(){try{[agents.value,channels.value]=await Promise.all([adminChannelsApi.agents(),adminChannelsApi.list()]);if(selected.value){const a=agents.value.find(x=>x.id===selected.value?.id);if(a)select(a)}else if(!creating.value&&agents.value[0])select(agents.value[0])}catch(e){error.value=msg(e)}}
async function save(){saving.value=true;error.value='';success.value='';try{const payload:any={name:form.name,role:form.role,channelIds:form.channelIds};if(creating.value){payload.email=form.email;payload.password=form.password;await adminChannelsApi.createAgent(payload)}else if(selected.value){payload.isActive=form.isActive;if(form.password)payload.password=form.password;await adminChannelsApi.updateAgent(selected.value.id,payload)}creating.value=false;await load();notification.success('Agente guardado correctamente.')}catch(e){error.value=msg(e)}finally{saving.value=false}}
function initials(n:string){return n.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function label(r:string){return({agent:'Agente',supervisor:'Supervisor',admin:'Administrador'} as Record<string,string>)[r]||r}
onMounted(load)
</script>

<style scoped>
.page{height:100%;overflow:auto;padding:28px;background:#f4f6fb}header{max-width:1100px;margin:0 auto 22px;display:flex;justify-content:space-between;align-items:end}h2{margin:3px 0;font-size:1.75rem}header p{color:var(--color-text-muted)}.eyebrow{color:var(--color-primary-2);font-size:.78rem;font-weight:700;text-transform:uppercase}.grid{max-width:1100px;margin:auto;display:grid;grid-template-columns:330px 1fr;gap:20px}.list,.card{background:#fff;border:1px solid var(--color-border);border-radius:16px;box-shadow:var(--shadow-sm)}.list{padding:10px}.list button{width:100%;border:0;background:none;padding:12px;border-radius:11px;display:flex;gap:10px;align-items:center;text-align:left;cursor:pointer}.list button.selected{background:var(--color-primary-soft)}.list button>span:nth-child(2){display:flex;flex:1;min-width:0;flex-direction:column}.list small{color:var(--color-text-muted);overflow:hidden;text-overflow:ellipsis}.avatar{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;background:var(--color-primary-tint);color:var(--color-primary);font-weight:700}.list i{width:9px;height:9px;border-radius:50%;background:#aaa}.list i.active{background:#22a06b}.card{padding:24px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}label{display:flex;flex-direction:column;gap:7px;font-size:.84rem;font-weight:650}input,select{padding:10px;border:1px solid var(--color-border-strong);border-radius:9px;font:inherit}.channels{margin-top:22px;padding-top:18px;border-top:1px solid var(--color-border)}.channels label,.enabled{flex-direction:row;align-items:center;margin:10px 0}.channels input,.enabled input{width:auto}.enabled{margin-top:22px}.card footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.primary,.secondary{border:0;border-radius:9px;padding:10px 15px;font-weight:650;cursor:pointer}.primary{background:var(--color-primary);color:#fff}.secondary{background:var(--color-surface-muted)}.primary:disabled{opacity:.5}.alert{max-width:1100px;margin:0 auto 14px;padding:11px;border-radius:9px}.error{background:var(--color-danger-soft);color:var(--color-danger-dark)}.success{background:#e8f5e9;color:#176b47}.empty{display:grid;place-items:center;color:var(--color-text-muted);min-height:300px}@media(max-width:800px){.grid,.fields{grid-template-columns:1fr}.page{padding:14px}}
.admin-page-header,.grid,.alert{max-width:1260px}
@media(min-width:801px){.grid{grid-template-columns:320px minmax(0,1fr)}}
.list{display:flex;flex-direction:column;gap:6px;align-self:start}
.list button{transition:background .15s ease,transform .15s ease}
.list button:hover{background:var(--color-surface-muted)}
.list button.selected,.list button.selected:hover{background:var(--color-primary-soft)}
.list button:active{transform:scale(.985)}
.list button:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.card-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}
.card-heading h3{margin:0}
.account-status{display:flex;align-items:center;gap:10px;color:var(--color-text-muted);font-size:.78rem;font-weight:600}
.account-switch{position:relative;display:block;box-sizing:border-box;width:42px;min-width:42px;height:24px;min-height:24px;flex:0 0 42px;padding:0;border:0;border-radius:999px;background:#cbd2df;cursor:pointer;appearance:none;transition:background .18s ease}
.account-switch>span{position:absolute;top:3px;left:3px;display:block;box-sizing:border-box;width:18px;height:18px;margin:0;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0002;transform:translateX(0);transition:transform .18s ease;pointer-events:none}
.account-switch[aria-checked="true"]{background:var(--color-primary)}
.account-switch[aria-checked="true"]>span{transform:translateX(18px)}
.account-switch:hover{filter:brightness(.95)}
.account-switch:focus-visible{outline:2px solid var(--color-primary);outline-offset:3px}
.account-switch:disabled{opacity:.5;cursor:wait}
@media(max-width:480px){.card-heading{align-items:flex-start}.account-status{flex-direction:column;align-items:flex-end;gap:6px}}
</style>
