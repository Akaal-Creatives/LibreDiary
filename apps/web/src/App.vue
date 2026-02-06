<script setup lang="ts">
import { RouterView } from 'vue-router';
import ToastContainer from '@/components/ui/ToastContainer.vue';
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
