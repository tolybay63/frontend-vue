<template>
  <component :is="layoutComponent">
    <router-view />
  </component>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const route = useRoute()

const layoutComponent = computed(() => (route.meta.layout === 'blank' ? 'div' : MainLayout))
</script>
