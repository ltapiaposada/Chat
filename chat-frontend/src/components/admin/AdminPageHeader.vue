<template>
  <header class="admin-page-header">
    <div class="admin-page-heading">
      <h2>{{ title }}</h2>
      <p class="admin-page-description">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="admin-page-actions">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<style scoped>
.admin-page-header {
  width: 100%;
  max-width: 1260px;
  margin: 0 auto 22px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.admin-page-heading {
  min-width: 0;
}

.admin-page-header h2 {
  margin: 0;
  color: #15172e;
  font-size: 1.75rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.admin-page-description {
  margin: 10px 0 0;
  color: #6c6f8d;
  font-size: 0.88rem;
  font-weight: 400;
  line-height: 1.45;
}

.admin-page-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-page-actions :deep(button) {
  min-height: 36px;
  border: 0;
  border-radius: 9px;
  padding: 9px 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: #5849e0;
  color: #ffffff;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease;
}

.admin-page-actions :deep(button:hover) {
  background: #4238be;
}

.admin-page-actions :deep(button:active) {
  transform: scale(0.98);
}

@media (max-width: 640px) {
  .admin-page-header {
    min-height: 0;
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .admin-page-actions,
  .admin-page-actions :deep(button) {
    width: 100%;
  }
}
</style>
