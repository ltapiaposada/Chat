<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(defineProps<{ modelValue: string; label?: string; min?: string; max?: string }>(), { label: 'Fecha' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const trigger = ref<HTMLButtonElement | null>(null), popup = ref<HTMLElement | null>(null)
const opened = ref(false), month = ref(new Date()), focusedDate = ref('')
const position = ref({ top: '0px', left: '0px' })
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
function dateValue(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
function parse(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) && dateValue(date) === value ? date : null
}
const displayValue = computed(() => { const date = parse(props.modelValue); return date ? date.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' }) : 'Seleccionar fecha' })
const monthTitle = computed(() => { const title = month.value.toLocaleDateString('es', { month:'long', year:'numeric' }); return title[0]!.toUpperCase()+title.slice(1) })
const today = computed(() => dateValue(new Date()))
function enabled(value: string) { return (!props.min || value >= props.min) && (!props.max || value <= props.max) }
const days = computed(() => {
  const first = new Date(month.value.getFullYear(), month.value.getMonth(), 1)
  const start = new Date(first); start.setDate(1-((first.getDay()+6)%7))
  return Array.from({ length:42 }, (_, index) => {
    const date = new Date(start); date.setDate(start.getDate()+index)
    return { value:dateValue(date), number:date.getDate(), outside:date.getMonth() !== month.value.getMonth(), label:date.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) }
  })
})
function updatePosition() {
  if (!trigger.value || !popup.value) return
  const rect = trigger.value.getBoundingClientRect(), size = popup.value.getBoundingClientRect()
  const left = Math.max(16,Math.min(rect.left, window.innerWidth-size.width-16))
  const below = rect.bottom+8
  const top = below+size.height <= window.innerHeight-16 ? below : Math.max(16,rect.top-size.height-8)
  position.value = { left:`${left}px`, top:`${top}px` }
}
function close(restoreFocus = false) {
  opened.value = false
  document.removeEventListener('pointerdown', outsideClick)
  document.removeEventListener('keydown', escape)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  if (restoreFocus) trigger.value?.focus()
}
function outsideClick(event: PointerEvent) { const target = event.target as Node; if (!trigger.value?.contains(target) && !popup.value?.contains(target)) close() }
function escape(event: KeyboardEvent) { if (event.key === 'Escape') { event.preventDefault(); close(true) } }
async function toggle() {
  if (opened.value) { close(); return }
  let initial = parse(props.modelValue) || new Date()
  if (props.min && dateValue(initial) < props.min) initial = parse(props.min) || initial
  if (props.max && dateValue(initial) > props.max) initial = parse(props.max) || initial
  month.value = new Date(initial.getFullYear(),initial.getMonth(),1)
  focusedDate.value = dateValue(initial); opened.value = true
  await nextTick(); updatePosition()
  popup.value?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate.value}"]`)?.focus()
  document.addEventListener('pointerdown',outsideClick)
  document.addEventListener('keydown',escape)
  window.addEventListener('resize',updatePosition)
  window.addEventListener('scroll',updatePosition,true)
}
function moveMonth(offset: number) {
  month.value = new Date(month.value.getFullYear(),month.value.getMonth()+offset,1)
  focusedDate.value = dateValue(month.value)
}
function select(value: string) { if (value && !enabled(value)) return; emit('update:modelValue',value); close(true) }
async function moveDay(event: KeyboardEvent, value: string) {
  const offsets: Record<string,number> = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7 }
  if (!(event.key in offsets)) return
  event.preventDefault()
  const date = parse(value)!; date.setDate(date.getDate()+offsets[event.key]!)
  const next = dateValue(date); if (!enabled(next)) return
  focusedDate.value = next; month.value = new Date(date.getFullYear(),date.getMonth(),1)
  await nextTick(); popup.value?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus()
}
onBeforeUnmount(() => close())
</script>

<template>
  <button ref="trigger" class="date-trigger" :class="{ opened, placeholder: !modelValue }" type="button" :aria-label="`${label}: ${displayValue}`" aria-haspopup="dialog" :aria-expanded="opened" :aria-controls="`${id}-calendar`" @click="toggle"><span>{{ displayValue }}</span><CalendarDaysIcon /></button>
  <Teleport to="body">
    <div v-if="opened" :id="`${id}-calendar`" ref="popup" class="date-calendar" role="dialog" :aria-label="`Seleccionar ${label.toLocaleLowerCase('es')}`" :style="position">
      <div class="calendar-head"><button type="button" aria-label="Mes anterior" @click="moveMonth(-1)"><ChevronLeftIcon /></button><strong aria-live="polite">{{ monthTitle }}</strong><button type="button" aria-label="Mes siguiente" @click="moveMonth(1)"><ChevronRightIcon /></button></div>
      <div class="weekdays" aria-hidden="true"><span v-for="(day,index) in weekdays" :key="index">{{ day }}</span></div>
      <div class="calendar-days">
        <button v-for="day in days" :key="day.value" type="button" :data-date="day.value" :aria-label="day.label" :aria-pressed="day.value === modelValue" :aria-current="day.value === today ? 'date' : undefined" :tabindex="day.value === focusedDate ? 0 : -1" :disabled="!enabled(day.value)" :class="{ outside:day.outside, selected:day.value === modelValue, today:day.value === today }" @focus="focusedDate = day.value" @keydown="moveDay($event,day.value)" @click="select(day.value)">{{ day.number }}</button>
      </div>
      <div class="calendar-footer"><button type="button" @click="select('')">Limpiar</button><button type="button" :disabled="!enabled(today)" @click="select(today)">Hoy</button></div>
    </div>
  </Teleport>
</template>

<style scoped>
.date-trigger{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-width:165px;height:40px;padding:0 12px;border:1px solid #d7d9e7;border-radius:10px;background:#fff;color:#15172e;font:inherit;font-size:.84rem;font-weight:400;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease}
.date-trigger svg{width:18px;height:18px;flex-shrink:0;color:#7c7e96}.date-trigger:hover{border-color:#aaa2eb;background:#fafaff}.date-trigger.opened{border-color:#5849e0;box-shadow:0 0 0 3px #eeebfd}.date-trigger.placeholder{color:#9497aa}
.date-calendar{position:fixed;z-index:10000;width:min(296px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow-y:auto;padding:16px;border:1px solid #e6e7f0;border-radius:16px;background:#fff;color:#15172e;box-shadow:0 16px 48px rgba(21,23,46,.18);font-family:inherit}
.calendar-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}.calendar-head strong{font-size:.88rem;font-weight:600}.calendar-head button{display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:#6c6f8d;cursor:pointer}.calendar-head svg{width:17px;height:17px}.calendar-head button:hover{background:#eeebfd;color:#5849e0}
.weekdays,.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.weekdays{margin-bottom:8px}.weekdays span{text-align:center;padding:5px 0;font-size:.72rem;color:#9497aa;font-weight:500}
.calendar-days button{display:grid;place-items:center;height:33px;padding:0;border:0;border-radius:9px;background:transparent;color:#15172e;font-size:.8rem;font-family:inherit;font-weight:400;cursor:pointer;transition:background .12s ease,color .12s ease}.calendar-days button.outside{color:#a5a7b8}.calendar-days button.today:not(.selected){color:#5849e0;box-shadow:inset 0 0 0 1px #cfc9f8}.calendar-days button:hover:not(:disabled){background:#eeebfd;color:#5849e0}.calendar-days button.selected,.calendar-days button.selected:hover{background:#5849e0;color:#fff}.calendar-days button:disabled{opacity:.3;cursor:default}
.calendar-footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e6e7f0;margin-top:14px;padding-top:12px}.calendar-footer button{padding:6px 10px;border:0;border-radius:8px;background:transparent;color:#5849e0;font-family:inherit;font-size:.78rem;cursor:pointer}.calendar-footer button:hover:not(:disabled){background:#eeebfd}.calendar-footer button:disabled{opacity:.35;cursor:default}
.date-trigger:focus-visible,.date-calendar button:focus-visible{outline:2px solid #5849e0;outline-offset:2px}
@media(prefers-reduced-motion:reduce){.date-trigger,.calendar-days button{transition:none}}
</style>
