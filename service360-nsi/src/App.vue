<!-- Файл: src/App.vue
     Назначение: корневой компонент приложения, оборачивает контент в основной лейаут.
     Использование: импортируется в main.ts и монтируется в #app. -->
<script setup lang="ts">
import S360Layout from '@layouts/S360Layout.vue'
</script>

<template>
  <S360Layout>
    <router-view />
  </S360Layout>
</template>

<style scoped></style>
