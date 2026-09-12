<template>
  <div class="auth-page">
    <RouterLink class="brand" to="/"><span class="brand-mark"><HeroIcon name="chat-bubble-left-right" /></span><span>Conversa</span></RouterLink>
    <section class="auth-visual">
      <div class="visual-content">
        <span class="eyebrow">Atención que conecta</span>
        <h1>{{ isRegister ? 'Empieza a conversar con tus clientes.' : 'Tu equipo y tus conversaciones, siempre cerca.' }}</h1>
        <p>{{ isRegister ? 'Crea tu espacio de trabajo y obtén el código del chat listo para instalar.' : 'Accede a una bandeja organizada para responder desde tu sitio web y WhatsApp.' }}</p>
        <div class="preview-card">
          <header><span><i></i> Bandeja de entrada</span><small>3 conversaciones</small></header>
          <article class="active"><b>MP</b><span><strong>María Pérez</strong><small>Consulta desde el sitio web</small></span><time>Ahora</time></article>
          <article><b>JC</b><span><strong>Juan Carlos</strong><small>Mensaje recibido por WhatsApp</small></span><time>4m</time></article>
          <article><b>AL</b><span><strong>Andrea López</strong><small>Gracias por la ayuda</small></span><time>12m</time></article>
        </div>
        <div class="visual-points">
          <span><HeroIcon name="check-circle" /> Conversaciones centralizadas</span>
          <span><HeroIcon name="check-circle" /> Equipo organizado por canales</span>
        </div>
      </div>
    </section>

    <main class="auth-main">
      <div class="form-wrap">
        <RouterLink class="back-link" to="/"><span>←</span> Volver al inicio</RouterLink>
        <div class="form-heading">
          <span class="mobile-mark"><HeroIcon name="chat-bubble-left-right" /></span>
          <p class="kicker">{{ isRegister ? 'NUEVA CUENTA' : 'BIENVENIDO' }}</p>
          <h2>{{ isRegister ? 'Crea tu empresa' : 'Inicia sesión' }}</h2>
          <p>{{ isRegister ? 'Completa los datos para configurar tu primer canal.' : 'Ingresa tus datos para continuar a tu panel.' }}</p>
        </div>

        <form v-if="!isRegister" class="auth-form" @submit.prevent="handleLogin">
          <label for="email">Correo electrónico
            <input id="email" v-model="email" type="email" autocomplete="email" placeholder="nombre@empresa.com" autofocus />
          </label>
          <label for="password">Contraseña
            <span class="password-field">
              <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Ingresa tu contraseña" />
              <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
            </span>
          </label>
          <RouterLink class="forgot-password" to="/forgot-password">¿Olvidaste tu contraseña?</RouterLink>
          <div v-if="errorMessage" class="message error" role="alert"><HeroIcon name="x-circle" /> {{ errorMessage }}</div>
          <button class="submit-btn" type="submit" :disabled="!canLogin || isLoading">
            <span v-if="isLoading" class="spinner"></span>{{ isLoading ? 'Ingresando…' : 'Ingresar al panel' }}<span v-if="!isLoading">→</span>
          </button>
        </form>

        <form v-else class="auth-form register-form" @submit.prevent="handleRegister">
          <div class="two-columns">
            <label for="companyName">Nombre de la empresa<input id="companyName" v-model="companyName" type="text" autocomplete="organization" placeholder="Mi empresa" autofocus /></label>
            <label for="regName">Tu nombre<input id="regName" v-model="regName" type="text" autocomplete="name" placeholder="Nombre completo" /></label>
          </div>
          <label for="companyOrigin">Dominio de tu aplicación
            <input id="companyOrigin" v-model="companyOrigin" type="url" autocomplete="url" placeholder="https://miempresa.com" />
            <small>El chat solo podrá utilizarse inicialmente desde este dominio.</small>
          </label>
          <label for="regEmail">Correo electrónico<input id="regEmail" v-model="regEmail" type="email" autocomplete="email" placeholder="nombre@empresa.com" /></label>
          <label for="regPassword">Contraseña
            <span class="password-field">
              <input id="regPassword" v-model="regPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
              <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
            </span>
            <small>Usa al menos 8 caracteres.</small>
          </label>
          <div v-if="errorMessage" class="message error" role="alert"><HeroIcon name="x-circle" /> {{ errorMessage }}</div>
          <button class="submit-btn" type="submit" :disabled="!canRegister || isLoading">
            <span v-if="isLoading" class="spinner"></span>{{ isLoading ? 'Creando tu espacio…' : 'Registrarme' }}<span v-if="!isLoading">→</span>
          </button>
        </form>

        <p class="switch-form">
          {{ isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?' }}
          <RouterLink :to="isRegister ? '/login' : '/register'">{{ isRegister ? 'Inicia sesión' : 'Regístrate' }}</RouterLink>
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const router = useRouter(), route = useRoute(), authStore = useAuthStore(), chatStore = useChatStore()
const isRegister = computed(() => route.name === 'register-company')
const email = ref(''), password = ref(''), regName = ref(''), regEmail = ref(''), regPassword = ref(''), companyName = ref('')
const companyOrigin = ref(window.location.hostname === 'localhost' ? window.location.origin : '')
const isLoading = ref(false), errorMessage = ref(''), showPassword = ref(false)
const canLogin = computed(() => Boolean(email.value.trim() && password.value.trim()))
const canRegister = computed(() => Boolean(companyName.value.trim() && companyOrigin.value.trim() && regName.value.trim() && regEmail.value.trim() && regPassword.value.length >= 8))
watch(() => route.name, () => { errorMessage.value = ''; showPassword.value = false })

async function handleLogin() {
  if (!canLogin.value) return
  isLoading.value = true; errorMessage.value = ''
  try {
    const { data } = await axios.post(`${API_URL}/api/login`, { email: email.value, password: password.value })
    authStore.login(data.user.id, data.user.name, data.user.role, data.token); chatStore.connectSocket()
    if (data.user.role === 'admin') await router.push('/agent/settings/channels')
    else if (data.user.role === 'agent' || data.user.role === 'supervisor') await router.push('/agent/pending')
    else await router.push('/client')
  } catch (error: any) { errorMessage.value = error.response?.data?.error || 'No fue posible iniciar sesión' }
  finally { isLoading.value = false }
}
async function handleRegister() {
  if (!canRegister.value) return
  isLoading.value = true; errorMessage.value = ''
  try {
    const { data } = await axios.post(`${API_URL}/api/companies/register`, {
      companyName: companyName.value, adminName: regName.value, email: regEmail.value,
      password: regPassword.value, origin: companyOrigin.value
    })
    authStore.login(data.user.id, data.user.name, data.user.role, data.token); chatStore.connectSocket()
    await router.push('/agent/settings/channels')
  } catch (error: any) { errorMessage.value = error.response?.data?.error || 'No fue posible completar el registro' }
  finally { isLoading.value = false }
}
</script>

<style scoped>
.forgot-password{align-self:flex-end;color:var(--color-primary);font-size:.84rem;font-weight:600;text-decoration:none}.forgot-password:hover{color:var(--color-primary-2);text-decoration:underline}
.auth-page{height:100%;overflow:auto;display:grid;grid-template-columns:minmax(420px,.92fr) minmax(540px,1.08fr);background:#fff;position:relative}.auth-page a{background:transparent!important;padding:0}.brand{position:fixed;z-index:5;top:28px;left:34px;display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-size:1.22rem;font-weight:800}.brand-mark,.mobile-mark{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:#fff;color:#3143bd;font-size:1.3rem}.auth-visual{min-height:100vh;background:#2437a7;color:#fff;padding:120px 8vw 70px 6vw;display:flex;align-items:center}.visual-content{width:min(520px,100%)}.eyebrow{display:inline-block;color:#bec7ff;font-size:.75rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;margin-bottom:20px}.auth-visual h1{font-size:clamp(2.65rem,4.2vw,4.4rem);line-height:1.05;letter-spacing:-.05em;margin-bottom:22px}.auth-visual>div>p{color:#d7dcff;font-size:1.05rem;line-height:1.7;max-width:500px}.preview-card{margin-top:44px;background:#fff;color:#1d2844;border-radius:16px;padding:12px;box-shadow:0 24px 55px rgba(8,18,76,.25);transform:rotate(-1deg)}.preview-card header{padding:9px 10px 13px;display:flex;justify-content:space-between;color:#69738a;font-size:.72rem}.preview-card header span{display:flex;align-items:center;gap:7px;font-weight:700;color:#27324c}.preview-card header i{width:7px;height:7px;border-radius:50%;background:#31ad72}.preview-card article{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:10px;padding:11px;border-radius:11px;font-size:.75rem}.preview-card article.active{background:#eef0ff}.preview-card article>b{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#dfe4ff;color:#3446c6}.preview-card article>span{display:flex;flex-direction:column;gap:3px}.preview-card article small,.preview-card time{color:#8b94a6;font-size:.67rem}.visual-points{display:flex;gap:24px;margin-top:28px;color:#dce1ff;font-size:.77rem}.visual-points span{display:flex;align-items:center;gap:7px}.visual-points svg{font-size:1.05rem}.auth-main{min-height:100vh;padding:50px clamp(35px,7vw,105px);display:flex;align-items:center;justify-content:center}.form-wrap{width:min(510px,100%)}.back-link{display:inline-flex;align-items:center;gap:8px;color:#6b758c;text-decoration:none;font-size:.83rem;font-weight:650;margin-bottom:50px;transition:color .2s}.back-link:hover{color:#2d3fba}.form-heading{margin-bottom:30px}.mobile-mark{display:none;background:#3446c6;color:#fff;margin-bottom:25px}.kicker{color:#3446c6;font-size:.72rem;font-weight:800;letter-spacing:.12em;margin-bottom:9px}.form-heading h2{color:#151f3d;font-size:2.25rem;letter-spacing:-.035em;margin-bottom:10px}.form-heading>p:last-child{color:#747e92;line-height:1.55}.auth-form{display:flex;flex-direction:column;gap:18px}.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.auth-form label{display:flex;flex-direction:column;gap:8px;color:#344058;font-size:.82rem;font-weight:700}.auth-form label>small{color:#8992a4;font-size:.7rem;font-weight:500;margin-top:-2px}.auth-form input{width:100%;height:49px;border:1px solid #dce0e9;border-radius:10px;padding:0 14px;background:#fbfcfe;color:#19233d;font:inherit;font-size:.9rem;transition:border-color .2s,box-shadow .2s,background .2s}.auth-form input:hover{border-color:#bbc2d2;background:#fff}.auth-form input:focus{outline:none;border-color:#4153ca;background:#fff;box-shadow:0 0 0 4px rgba(65,83,202,.11)}.auth-form input::placeholder{color:#a8afbd}.password-field{position:relative;display:block}.password-field input{padding-right:76px}.password-field button{position:absolute;right:10px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#3446c6;font-size:.72rem;font-weight:750;cursor:pointer;padding:6px}.password-field button:hover{color:#1f2f95}.message{display:flex;align-items:center;gap:8px;border-radius:9px;padding:11px 13px;font-size:.8rem}.message.error{background:#fff1f2;color:#b42335;border:1px solid #ffd5d9}.message svg{font-size:1.1rem;flex:none}.submit-btn{height:51px;width:100%;border:0;border-radius:11px;background:#2d40bd;color:#fff;font:inherit;font-weight:750;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 10px 22px rgba(45,64,189,.2);transition:transform .2s,background .2s,box-shadow .2s}.submit-btn:hover:not(:disabled){background:#2032a3;transform:translateY(-1px);box-shadow:0 13px 26px rgba(45,64,189,.27)}.submit-btn:disabled{opacity:.48;cursor:not-allowed;box-shadow:none}.spinner{width:17px;height:17px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}.switch-form{text-align:center;color:#7d8799;font-size:.82rem;margin-top:25px}.switch-form a{color:#2d40bd;text-decoration:none;font-weight:750;margin-left:5px}.switch-form a:hover{text-decoration:underline;text-underline-offset:4px}.register-form{gap:14px}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:960px){.auth-page{grid-template-columns:1fr}.auth-visual{display:none}.brand{display:none}.auth-main{padding:35px 24px}.form-wrap{width:min(520px,100%)}.mobile-mark{display:grid}.back-link{margin-bottom:35px}}@media(max-width:560px){.auth-main{align-items:flex-start;padding-top:28px}.two-columns{grid-template-columns:1fr}.form-heading h2{font-size:1.85rem}.auth-form{gap:15px}.register-form{gap:13px}}
</style>
