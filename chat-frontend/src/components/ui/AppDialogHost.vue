<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="state.open" class="app-dialog-backdrop" @click.self="closeDialog(false)">
        <section class="app-dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
          <div class="dialog-icon" :class="state.tone">
            <HeroIcon :name="state.tone === 'danger' ? 'exclamation-triangle' : 'information-circle'" />
          </div>
          <h2 :id="titleId">{{ state.title }}</h2>
          <p>{{ state.message }}</p>
          <div class="dialog-actions">
            <button v-if="state.showCancel" class="dialog-cancel" type="button" @click="closeDialog(false)">
              {{ state.cancelLabel }}
            </button>
            <button class="dialog-confirm" :class="state.tone" type="button" autofocus @click="closeDialog(true)">
              {{ state.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import HeroIcon from '@/components/ui/HeroIcon.vue'
import { useAppDialog } from '@/composables/useAppDialog'

const { state, closeDialog } = useAppDialog()
const titleId = 'app-dialog-title'
</script>

<style scoped>
.app-dialog-backdrop { position:fixed; inset:0; z-index:10000; display:grid; place-items:center; padding:20px; background:rgba(21,23,46,.55); backdrop-filter:blur(3px); }
.app-dialog { width:min(420px,100%); padding:26px; border:1px solid #e6e7f0; border-radius:18px; background:#fff; color:#15172e; box-shadow:0 24px 70px rgba(21,23,46,.24); text-align:center; }
.dialog-icon { width:48px; height:48px; margin:0 auto 15px; display:grid; place-items:center; border-radius:14px; background:#eeebfd; color:#5849e0; font-size:1.4rem; }
.dialog-icon.danger { background:#fbeaea; color:#d8464c; }
h2 { margin:0; font:700 1.15rem/1.3 Manrope,Inter,sans-serif; }
p { margin:9px 0 22px; color:#6c6f8d; font-size:.9rem; line-height:1.55; }
.dialog-actions { display:flex; justify-content:flex-end; gap:9px; }
button { min-height:40px; padding:0 16px; border-radius:9px; border:1px solid #e6e7f0; font:600 .84rem Inter,sans-serif; cursor:pointer; }
.dialog-cancel { background:#fff; color:#50536f; }
.dialog-cancel:hover { background:#f4f5f9; }
.dialog-confirm { border-color:#5849e0; background:#5849e0; color:#fff; }
.dialog-confirm:hover { background:#4238be; }
.dialog-confirm.danger { border-color:#d8464c; background:#d8464c; }
.dialog-confirm.danger:hover { background:#bc343a; }
.dialog-enter-active,.dialog-leave-active { transition:opacity .16s ease; }
.dialog-enter-active .app-dialog,.dialog-leave-active .app-dialog { transition:transform .16s ease,opacity .16s ease; }
.dialog-enter-from,.dialog-leave-to { opacity:0; }
.dialog-enter-from .app-dialog,.dialog-leave-to .app-dialog { opacity:0; transform:translateY(8px) scale(.98); }
</style>
