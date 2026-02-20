<template>
  <component v-if="icon" :is="icon" class="hero-icon" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  ArrowsRightLeftIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  FaceSmileIcon,
  HomeIcon,
  HeartIcon,
  InboxIcon,
  LanguageIcon,
  ListBulletIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  ScissorsIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  SparklesIcon,
  StarIcon,
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
  AdjustmentsHorizontalIcon,
  BriefcaseIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  name: string
}>()

const icons: Record<string, any> = {
  'arrow-path': ArrowPathIcon,
  'arrows-pointing-out': ArrowsPointingOutIcon,
  'arrow-right-left': ArrowsRightLeftIcon,
  'arrow-right-on-rectangle': ArrowRightOnRectangleIcon,
  'chart-bar': ChartBarIcon,
  'chat-bubble-left-right': ChatBubbleLeftRightIcon,
  'check-badge': CheckBadgeIcon,
  'check-circle': CheckCircleIcon,
  'clipboard-document-list': ClipboardDocumentListIcon,
  clock: ClockIcon,
  'document-text': DocumentTextIcon,
  'ellipsis-horizontal': EllipsisHorizontalIcon,
  'ellipsis-vertical': EllipsisVerticalIcon,
  'face-smile': FaceSmileIcon,
  home: HomeIcon,
  heart: HeartIcon,
  inbox: InboxIcon,
  language: LanguageIcon,
  'list-bullet': ListBulletIcon,
  microphone: MicrophoneIcon,
  'paper-airplane': PaperAirplaneIcon,
  'paper-clip': PaperClipIcon,
  'pause-circle': PauseCircleIcon,
  'play-circle': PlayCircleIcon,
  plus: PlusIcon,
  scissors: ScissorsIcon,
  'speaker-wave': SpeakerWaveIcon,
  'speaker-x-mark': SpeakerXMarkIcon,
  sparkles: SparklesIcon,
  star: StarIcon,
  'user-group': UserGroupIcon,
  user: UserIcon,
  users: UsersIcon,
  'x-circle': XCircleIcon,
  'adjustments-horizontal': AdjustmentsHorizontalIcon,
  briefcase: BriefcaseIcon
}

const icon = computed(() => icons[props.name])
</script>

<style scoped>
.hero-icon {
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>


