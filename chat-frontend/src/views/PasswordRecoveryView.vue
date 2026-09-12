<template>
  <div class="recovery-page">
    <header><RouterLink class="brand" to="/"><HeroIcon name="chat-bubble-left-right" />Conversa</RouterLink><RouterLink class="login-link" to="/login">Iniciar sesión</RouterLink></header>
    <main>
      <section class="recovery-card">
        <span class="lock-mark"><HeroIcon name="lock-closed" /></span>
        <h1>{{ isReset ? 'Crea una nueva contraseña' : 'Recupera tu contraseña' }}</h1>
        <p class="intro">{{ isReset ? 'Elige una contraseña segura para volver a tu cuenta.' : 'Ingresa el correo de tu cuenta. Te enviaremos un enlace para crear una nueva contraseña.' }}</p>
        <div v-if="completed" class="confirmation" role="status">
          <HeroIcon name="check-circle" />
          <h2>{{ isReset ? 'Contraseña actualizada' : 'Revisa tu correo' }}</h2>
          <p>{{ confirmation }}</p>
          <RouterLink v-if="isReset" class="primary" to="/login">Iniciar sesión</RouterLink>
          <button v-else class="secondary" type="button" @click="completed = false">Usar otro correo</button>
        </div>
        <div v-else-if="isReset && !validToken" class="invalid-link" role="alert"><p>El enlace de recuperación no es válido. Solicita uno nuevo para continuar.</p><RouterLink class="primary" to="/forgot-password">Solicitar nuevo enlace</RouterLink></div>
        <form v-else @submit.prevent="submit">
          <label v-if="!isReset" for="recovery-email">Correo electrónico<input id="recovery-email" v-model="email" type="email" required autocomplete="email" placeholder="nombre@empresa.com" :disabled="loading" /></label>
          <template v-else>
            <label for="new-password">Nueva contraseña<div class="password-field"><input id="new-password" v-model="password" :type="showPassword ? 'text' : 'password'" required minlength="8" maxlength="72" autocomplete="new-password" placeholder="Mínimo 8 caracteres" :disabled="loading" /><button type="button" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button></div></label>
            <label for="confirm-password">Confirma tu contraseña<input id="confirm-password" v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" required minlength="8" maxlength="72" autocomplete="new-password" placeholder="Repite tu nueva contraseña" :disabled="loading" /></label>
            <small>Usa al menos 8 caracteres. No reutilices una contraseña de otro sitio.</small>
          </template>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <RouterLink v-if="isReset && error" class="help-link" to="/forgot-password">Solicitar otro enlace</RouterLink>
          <button class="primary" type="submit" :disabled="loading || !canSubmit">{{ loading ? 'Procesando…' : isReset ? 'Guardar nueva contraseña' : 'Enviar enlace de recuperación' }}<HeroIcon name="arrow-right" /></button>
        </form>
        <RouterLink class="back-link" to="/login">← Volver al inicio de sesión</RouterLink>
      </section>
      <p class="security-note">{{ isReset ? 'Tu enlace es personal y solo puede usarse una vez.' : 'El enlace vence en 30 minutos. Si no lo encuentras, revisa la carpeta de spam.' }}</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import { useAppNotification } from '@/composables/useAppNotification'
const route = useRoute(), router = useRouter(), notification = useAppNotification()
const api = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const isReset = computed(() => route.name === 'reset-password')
const token = computed(() => new URLSearchParams(route.hash.slice(1)).get('token') || '')
const validToken = computed(() => /^[a-f0-9]{64}$/.test(token.value))
const email = ref(''), password = ref(''), confirmPassword = ref(''), error = ref(''), confirmation = ref('')
const loading = ref(false), completed = ref(false), showPassword = ref(false)
const canSubmit = computed(() => isReset.value ? validToken.value && password.value.length >= 8 && Boolean(confirmPassword.value) : Boolean(email.value.trim()))
watch(() => route.name, () => { completed.value = false; error.value = ''; password.value = ''; confirmPassword.value = '' })
async function submit() {
  if (loading.value || !canSubmit.value) return
  error.value = ''
  if (isReset.value && password.value !== confirmPassword.value) { error.value = 'Las contraseñas no coinciden.'; return }
  loading.value = true
  const resetting = isReset.value
  try {
    const { data } = await axios.post(`${api}/api/password/${resetting ? 'reset' : 'forgot'}`, resetting ? { token: token.value, password: password.value } : { email: email.value.trim().toLowerCase() })
    confirmation.value = data.message; completed.value = true
    if (resetting) { password.value = ''; confirmPassword.value = ''; await router.replace({ path: route.path, hash: '' }); notification.success('Contraseña actualizada correctamente.') }
  } catch (e: any) { error.value = e.response?.data?.error || 'No fue posible completar la solicitud. Inténtalo nuevamente.' }
  finally { loading.value = false }
}
</script>

<style scoped>
.recovery-page{min-height:100%;height:100%;overflow-y:auto;background:#f4f5fa;color:#15172e}
header{display:flex;justify-content:space-between;align-items:center;padding:24px 40px;max-width:1260px;margin:auto}
.brand{display:flex;align-items:center;gap:10px;font-size:1.2rem;font-weight:750;color:#15172e;text-decoration:none}.brand svg{width:34px;height:34px;padding:7px;border-radius:10px;background:#5849e0;color:#fff}
.login-link,.help-link{color:#5849e0;font-size:.86rem;font-weight:600;text-decoration:none}.login-link:hover,.help-link:hover{text-decoration:underline}
main{max-width:480px;margin:48px auto;padding:0 20px}.recovery-card{padding:36px;background:#fff;border:1px solid #e6e7f0;border-radius:20px;box-shadow:0 14px 40px #15172e0a}
.lock-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:14px;background:#eeebfd;color:#5849e0;margin-bottom:24px}.lock-mark svg{width:25px;height:25px}
h1{font-size:1.65rem;line-height:1.25;letter-spacing:-.03em;margin:0 0 12px}.intro{font-size:.9rem;line-height:1.65;color:#6c6f8d;margin:0 0 28px}
form{display:flex;flex-direction:column;gap:18px}label{display:flex;flex-direction:column;gap:8px;font-size:.84rem;font-weight:600}input{width:100%;height:46px;padding:12px 14px;border:1px solid #d7d9e7;border-radius:10px;font:inherit;background:#fff;color:#15172e}
input:focus-visible{outline:3px solid #eeebfd;border-color:#5849e0}.password-field{position:relative}.password-field input{padding-right:78px}.password-field button{position:absolute;right:8px;top:8px;height:30px;padding:0 7px;background:transparent;border:0;border-radius:6px;color:#5849e0;font-size:.76rem;font-weight:600;cursor:pointer}.password-field button:hover{background:#eeebfd}
form small{font-size:.76rem;color:#6c6f8d;line-height:1.5}.primary{display:flex;justify-content:center;align-items:center;gap:10px;width:100%;min-height:46px;padding:12px 14px;background:#5849e0;color:#fff;border:0;border-radius:10px;font-size:.85rem;font-weight:650;text-decoration:none;cursor:pointer}.primary svg{width:16px;height:16px}.primary:hover{background:#4238be}.primary:disabled{opacity:.5;cursor:default}
.back-link{display:block;margin-top:24px;text-align:center;font-size:.8rem;color:#6c6f8d;text-decoration:none}.back-link:hover{color:#5849e0}.security-note{margin:20px 16px;text-align:center;color:#6c6f8d;font-size:.76rem;line-height:1.6}.form-error,.invalid-link p{padding:12px;border-radius:9px;background:#ffebee;color:#c62828;font-size:.82rem;line-height:1.5}.invalid-link p{margin-bottom:16px}
.confirmation{text-align:center}.confirmation>svg{width:40px;height:40px;color:#117a56;margin-bottom:14px}.confirmation h2{font-size:1.15rem;margin-bottom:10px}.confirmation p{font-size:.86rem;line-height:1.6;color:#6c6f8d;margin-bottom:20px}.secondary{padding:10px 14px;border:0;border-radius:9px;background:#eeebfd;color:#5849e0;font-weight:600;cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid #5849e0;outline-offset:3px}
@media(max-width:600px){header{padding:20px}main{margin:24px auto}.recovery-card{padding:28px 24px}}
</style>
