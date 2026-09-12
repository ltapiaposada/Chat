<template>
  <div class="landing">
    <nav class="nav shell">
      <RouterLink class="brand" to="/" aria-label="Inicio">
        <span class="brand-mark"><HeroIcon name="chat-bubble-left-right" /></span>
        <span>Conversa</span>
      </RouterLink>
      <div class="nav-links">
        <a href="#funciones">Funciones</a>
        <a href="#como-funciona">Cómo funciona</a>
      </div>
      <div class="nav-actions">
        <template v-if="!authStore.isAuthenticated">
          <RouterLink class="login-link" to="/login">Iniciar sesión</RouterLink>
          <RouterLink class="button small" to="/register">Regístrate</RouterLink>
        </template>
        <RouterLink v-else class="button small" :to="panelUrl">Ir al panel</RouterLink>
      </div>
    </nav>

    <main>
      <section class="hero shell">
        <div class="hero-copy">
          <span class="tag"><i></i> Atención en tiempo real</span>
          <h1>Todas tus conversaciones, <em>en un solo lugar.</em></h1>
          <p>Habla con tus clientes desde tu sitio web y WhatsApp. Organiza a tu equipo y responde con rapidez desde una bandeja sencilla.</p>
          <div class="hero-actions">
            <RouterLink class="button" :to="authStore.isAuthenticated ? panelUrl : '/register'">{{ authStore.isAuthenticated ? 'Ir al panel' : 'Empezar ahora' }} <span>→</span></RouterLink>
            <a class="text-link" href="#como-funciona">Ver cómo funciona</a>
          </div>
          <div class="trust-row">
            <span><HeroIcon name="check-circle" /> Instalación rápida</span>
            <span><HeroIcon name="check-circle" /> Sin cambiar tu aplicación</span>
          </div>
        </div>

        <div class="product-stage" aria-label="Vista previa de la bandeja de atención">
          <div class="glow one"></div><div class="glow two"></div>
          <div class="inbox-window">
            <div class="window-bar"><div class="mini-brand"><span><HeroIcon name="chat-bubble-left-right" /></span> Conversa</div><div class="agent"><i></i> Agente en línea</div></div>
            <div class="window-body">
              <aside class="mini-sidebar"><span class="active"><HeroIcon name="inbox" /></span><span><HeroIcon name="users" /></span><span><HeroIcon name="chart-bar" /></span><span><HeroIcon name="adjustments-horizontal" /></span></aside>
              <div class="conversation-list">
                <div class="list-title"><strong>Conversaciones</strong><small>3 activas</small></div>
                <article class="selected"><b>MP</b><span><strong>María Pérez</strong><small>Necesito información...</small></span><time>Ahora</time></article>
                <article><b>JC</b><span><strong>Juan Carlos</strong><small>Gracias por la ayuda</small></span><time>5m</time></article>
                <article><b>AL</b><span><strong>Andrea López</strong><small>Consulta desde WhatsApp</small></span><time>12m</time></article>
              </div>
              <div class="chat-preview">
                <header><div><strong>María Pérez</strong><small><i></i> Sitio web · Ventas</small></div><button>···</button></header>
                <div class="messages"><p class="customer">Hola, quisiera conocer más sobre sus servicios.</p><p class="operator">¡Hola, María! Claro, con gusto te ayudamos.</p><span>El agente está escribiendo...</span></div>
                <div class="composer">Escribe una respuesta... <button><HeroIcon name="paper-airplane" /></button></div>
              </div>
            </div>
          </div>
          <div class="channel-float whatsapp"><strong>WA</strong><span><b>WhatsApp</b><small>Nuevo mensaje recibido</small></span></div>
          <div class="channel-float web"><HeroIcon name="globe-alt" /><span><b>Chat web</b><small>Visitante conectado</small></span></div>
        </div>
      </section>

      <section class="channels-strip">
        <div class="shell channel-row"><p>Atiende a tus clientes desde</p><div><span class="wa">WA</span> WhatsApp</div><div><HeroIcon name="globe-alt" /> Chat en tu sitio web</div><div><HeroIcon name="user-group" /> Un solo equipo</div></div>
      </section>

      <section id="funciones" class="section shell">
        <div class="section-heading"><span class="overline">Todo lo esencial</span><h2>Una atención más simple para tu equipo y tus clientes</h2><p>Las herramientas necesarias para comenzar a conversar, organizar solicitudes y mantener el control de cada atención.</p></div>
        <div class="feature-grid">
          <article><span class="feature-icon blue"><HeroIcon name="inbox" /></span><h3>Bandeja unificada</h3><p>Recibe los chats del sitio web y WhatsApp en el mismo panel, sin cambiar entre aplicaciones.</p></article>
          <article><span class="feature-icon green"><HeroIcon name="users" /></span><h3>Equipo organizado</h3><p>Crea agentes, asigna canales y distribuye las conversaciones entre ventas y soporte.</p></article>
          <article><span class="feature-icon violet"><HeroIcon name="clock" /></span><h3>Historial completo</h3><p>Consulta conversaciones anteriores y conserva el contexto para responder mejor.</p></article>
          <article><span class="feature-icon amber"><HeroIcon name="chart-bar" /></span><h3>Métricas claras</h3><p>Revisa el volumen de chats y la actividad de cada canal desde la administración.</p></article>
        </div>
      </section>

      <section id="como-funciona" class="steps-section">
        <div class="shell">
          <div class="section-heading"><span class="overline">Empieza sin complicaciones</span><h2>De cero a tu primer chat en tres pasos</h2></div>
          <div class="steps">
            <article><b>01</b><div class="step-icon"><HeroIcon name="briefcase" /></div><h3>Crea tu empresa</h3><p>Registra tus datos y obtén automáticamente tu primer canal.</p></article>
            <span class="connector">→</span>
            <article><b>02</b><div class="step-icon"><HeroIcon name="document-text" /></div><h3>Copia el código</h3><p>Pega un único script en tu sitio web. No necesitas construir un chat.</p></article>
            <span class="connector">→</span>
            <article><b>03</b><div class="step-icon"><HeroIcon name="chat-bubble-left-right" /></div><h3>Empieza a responder</h3><p>Invita a tu equipo y atiende conversaciones desde la bandeja.</p></article>
          </div>
        </div>
      </section>

      <section class="cta shell">
        <div><span class="overline light">Empieza hoy</span><h2>Convierte cada conversación en una oportunidad.</h2><p>Crea tu empresa, instala el widget y mantén a tu equipo cerca de tus clientes.</p></div>
        <RouterLink class="button white" :to="authStore.isAuthenticated ? panelUrl : '/register'">{{ authStore.isAuthenticated ? 'Ir al panel' : 'Regístrate' }} <span>→</span></RouterLink>
      </section>
    </main>

    <footer class="footer shell"><div class="brand"><span class="brand-mark"><HeroIcon name="chat-bubble-left-right" /></span><span>Conversa</span></div><p>Comunicación directa para equipos que quieren atender mejor.</p><span>© {{ year }} Conversa</span></footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
const year = new Date().getFullYear()
const panelUrl = computed(() => authStore.role === 'client' ? '/client' : authStore.role === 'admin' ? '/agent/settings/channels' : '/agent/pending')
</script>

<style scoped>
.landing{height:100%;overflow:auto;background:#fff;color:#15213b;scroll-behavior:smooth}.landing a{background-color:transparent;padding:0}.shell{width:min(1180px,calc(100% - 40px));margin-inline:auto}.nav{height:78px;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#18214c;font-size:1.24rem;font-weight:800}.brand-mark{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#3d4ed7,#1b2c8c);color:#fff;font-size:1.35rem}.nav-links{display:flex;gap:32px}.nav-links a,.login-link{position:relative;color:#536079;text-decoration:none;font-weight:650;font-size:.92rem;padding:10px 2px;transition:color .2s ease}.nav-links a::after,.login-link::after,.text-link::after{content:"";position:absolute;left:50%;right:50%;bottom:3px;height:2px;border-radius:999px;background:#3446c6;transition:left .22s ease,right .22s ease}.nav-links a:hover,.login-link:hover,.text-link:hover{color:#2738ba;background:transparent}.nav-links a:hover::after,.login-link:hover::after,.text-link:hover::after{left:2px;right:2px}.nav-links a:focus-visible,.login-link:focus-visible,.text-link:focus-visible{outline:3px solid rgba(52,70,198,.18);outline-offset:4px;border-radius:5px}.nav-actions{display:flex;align-items:center;gap:22px}.button{display:inline-flex;align-items:center;justify-content:center;gap:14px;border-radius:12px;padding:14px 22px!important;background:#2738ba!important;color:#fff;text-decoration:none;font-weight:750;box-shadow:0 10px 24px rgba(39,56,186,.2);transition:.2s transform,.2s box-shadow,.2s background}.button:hover{background:#1e2fa8!important;transform:translateY(-2px);box-shadow:0 14px 30px rgba(39,56,186,.28)}.button:focus-visible{outline:3px solid rgba(52,70,198,.25);outline-offset:4px}.button.small{padding:10px 16px!important;border-radius:10px;font-size:.9rem}.hero{min-height:680px;display:grid;grid-template-columns:.88fr 1.12fr;align-items:center;gap:55px;padding-block:55px 80px}.tag,.overline{color:#3446c6;font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.tag{display:inline-flex;align-items:center;gap:8px;background:#eef0ff;padding:8px 12px;border-radius:999px}.tag i{width:7px;height:7px;border-radius:50%;background:#34aa73;box-shadow:0 0 0 4px #d8f6e8}.hero h1{font-size:clamp(3rem,5vw,4.65rem);line-height:1.03;letter-spacing:-.055em;margin:24px 0;color:#111a3c}.hero h1 em{font-style:normal;color:#3446c6}.hero-copy>p{font-size:1.13rem;line-height:1.75;color:#647089;max-width:570px}.hero-actions{display:flex;align-items:center;gap:24px;margin-top:30px}.text-link{position:relative;color:#2738ba;font-weight:700;text-decoration:none;padding:9px 2px!important;transition:color .2s ease}.trust-row{display:flex;gap:22px;margin-top:25px;color:#65718a;font-size:.83rem}.trust-row span{display:flex;align-items:center;gap:6px}.trust-row svg{color:#31a16b;font-size:1rem}.product-stage{position:relative;min-width:0}.glow{position:absolute;border-radius:50%;filter:blur(2px)}.glow.one{width:300px;height:300px;background:#e7eaff;right:-30px;top:-50px}.glow.two{width:180px;height:180px;background:#dbf6ed;left:-40px;bottom:-50px}.inbox-window{position:relative;background:white;border:1px solid #e6e9f3;border-radius:19px;overflow:hidden;box-shadow:0 35px 90px rgba(28,39,93,.18);z-index:1}.window-bar{height:58px;background:#17245f;color:white;display:flex;align-items:center;justify-content:space-between;padding:0 18px}.mini-brand,.agent{display:flex;align-items:center;gap:8px;font-size:.77rem;font-weight:650}.mini-brand span{width:27px;height:27px;display:grid;place-items:center;border-radius:8px;background:#4354d5}.agent{color:#dce2ff}.agent i,.chat-preview header i{width:7px;height:7px;border-radius:50%;background:#38c986}.window-body{height:380px;display:grid;grid-template-columns:54px 190px 1fr}.mini-sidebar{background:#1e2e73;padding:16px 10px;display:flex;flex-direction:column;align-items:center;gap:10px;color:#aeb9ed}.mini-sidebar span{width:34px;height:34px;border-radius:8px;display:grid;place-items:center}.mini-sidebar span.active{background:#3e50cf;color:#fff}.conversation-list{border-right:1px solid #e9ebf2;background:#fbfcff;padding:15px 10px}.list-title{display:flex;align-items:center;justify-content:space-between;padding:2px 7px 10px;font-size:.75rem}.list-title small{color:#8992a6}.conversation-list article{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;padding:10px 7px;border-radius:9px;font-size:.67rem}.conversation-list article.selected{background:#edf0ff}.conversation-list article>b{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#dce2ff;color:#3042bb}.conversation-list article>span{display:flex;flex-direction:column;min-width:0;gap:3px}.conversation-list small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#8a93a6}.conversation-list time{font-size:.57rem;color:#9aa2b2}.chat-preview{display:flex;min-width:0;flex-direction:column}.chat-preview header{height:61px;border-bottom:1px solid #eceef4;padding:10px 14px;display:flex;justify-content:space-between}.chat-preview header>div{display:flex;flex-direction:column;font-size:.72rem;gap:4px}.chat-preview header small{display:flex;align-items:center;gap:5px;color:#8a93a6}.chat-preview header button{border:0;background:none}.messages{flex:1;padding:24px 16px;background:#fafbfe;font-size:.68rem}.messages p{max-width:80%;padding:10px 12px;border-radius:12px;margin-bottom:12px;line-height:1.45}.customer{background:white;border:1px solid #e5e8ef}.operator{background:#3446c6;color:white;margin-left:auto}.messages span{color:#9aa2b2;font-size:.58rem}.composer{margin:10px;border:1px solid #e0e4ee;border-radius:9px;padding:9px 10px;color:#a1a8b6;font-size:.63rem;display:flex;justify-content:space-between;align-items:center}.composer button{width:27px;height:27px;border:0;border-radius:7px;background:#3446c6;color:#fff;display:grid;place-items:center}.channel-float{position:absolute;z-index:2;background:white;box-shadow:0 16px 40px rgba(28,39,93,.18);border:1px solid #e7eaf3;border-radius:13px;padding:11px 14px;display:flex;align-items:center;gap:10px;font-size:.72rem}.channel-float>strong,.channel-float>svg{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;padding:8px}.channel-float span{display:flex;flex-direction:column;gap:2px}.channel-float small{color:#8b94a6}.channel-float.whatsapp{bottom:-25px;right:-25px}.channel-float.whatsapp>strong{background:#dcf8e9;color:#168b52}.channel-float.web{top:75px;left:-35px}.channel-float.web>svg{background:#e8ebff;color:#3446c6}.channels-strip{border-block:1px solid #edf0f5;background:#fafbfe}.channel-row{min-height:105px;display:flex;align-items:center;justify-content:space-around;gap:25px}.channel-row p{color:#8a93a4;font-size:.83rem}.channel-row div{display:flex;align-items:center;gap:9px;font-weight:700;color:#47536b}.channel-row svg,.channel-row .wa{width:27px;height:27px;padding:5px;border-radius:7px;background:#edf0ff;color:#3446c6}.channel-row .wa{display:grid;place-items:center;background:#dff8eb;color:#198957;font-size:.62rem}.section{padding-block:105px}.section-heading{text-align:center;max-width:720px;margin:0 auto 50px}.section-heading h2{font-size:clamp(2rem,3.6vw,3rem);letter-spacing:-.035em;line-height:1.15;margin:13px 0;color:#15203e}.section-heading p{color:#6c778e;line-height:1.7}.feature-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.feature-grid article{border:1px solid #e9ecf3;border-radius:16px;padding:26px 23px;background:#fff;transition:.2s}.feature-grid article:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(28,39,93,.09)}.feature-icon{width:48px;height:48px;border-radius:13px;display:grid;place-items:center;font-size:1.5rem}.feature-icon.blue{background:#e8ebff;color:#3446c6}.feature-icon.green{background:#e2f7ed;color:#168b52}.feature-icon.violet{background:#f1e9ff;color:#7c42c7}.feature-icon.amber{background:#fff1d9;color:#b87200}.feature-grid h3,.steps h3{font-size:1.05rem;margin:20px 0 9px}.feature-grid p,.steps p{font-size:.88rem;color:#707b90;line-height:1.65}.steps-section{padding-block:100px;background:#f7f8fc}.steps{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:28px;align-items:center}.steps article{text-align:center;position:relative}.steps article>b{position:absolute;top:-12px;left:calc(50% + 25px);font-size:.66rem;color:#3446c6;background:#e7eaff;padding:4px 6px;border-radius:6px}.step-icon{width:72px;height:72px;margin:auto;border-radius:20px;background:white;box-shadow:0 12px 30px rgba(28,39,93,.1);display:grid;place-items:center;font-size:1.9rem;color:#3446c6}.connector{color:#b3bad0;font-size:1.5rem}.cta{margin-top:95px;margin-bottom:95px;padding:55px 65px;border-radius:24px;background:linear-gradient(125deg,#18256d,#3448cf);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:40px;box-shadow:0 25px 60px rgba(30,45,140,.22)}.cta h2{font-size:2.3rem;max-width:650px;margin:10px 0}.cta p{color:#cbd2fa}.overline.light{color:#aebaff}.button.white{background:#fff!important;color:#2637af;white-space:nowrap}.button.white:hover{background:#f3f5ff!important}.footer{border-top:1px solid #e9ecf2;min-height:120px;display:flex;align-items:center;gap:30px;color:#8790a3;font-size:.8rem}.footer p{flex:1}.footer .brand{font-size:1rem}.footer .brand-mark{width:30px;height:30px;font-size:1rem}@media(max-width:980px){.hero{grid-template-columns:1fr;padding-top:60px}.hero-copy{text-align:center}.hero-copy>p{margin:auto}.hero-actions,.trust-row{justify-content:center}.product-stage{width:min(680px,100%);margin:30px auto}.feature-grid{grid-template-columns:1fr 1fr}.nav-links{display:none}}@media(max-width:650px){.shell{width:min(100% - 28px,1180px)}.nav{height:68px}.nav-actions .login-link{display:none}.brand{font-size:1.08rem}.hero{padding-block:45px 65px;min-height:auto}.hero h1{font-size:2.8rem}.hero-copy>p{font-size:1rem}.trust-row{flex-direction:column;align-items:center;gap:8px}.window-body{grid-template-columns:45px 1fr}.conversation-list{display:none}.channel-float.web{left:-7px}.channel-float.whatsapp{right:-7px}.channel-row{padding-block:24px;flex-wrap:wrap}.channel-row p{width:100%;text-align:center}.feature-grid{grid-template-columns:1fr}.section{padding-block:75px}.steps{grid-template-columns:1fr}.connector{transform:rotate(90deg);text-align:center}.cta{margin-block:65px;padding:38px 25px;flex-direction:column;text-align:center}.cta h2{font-size:1.8rem}.footer{padding-block:30px;flex-direction:column;text-align:center;gap:15px}}
/* Identidad visual con colores planos: sin degradados. */
.brand-mark{background:#3446c6}
.cta{background:#2437a7}
</style>
