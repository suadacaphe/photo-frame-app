<template>
  <div id="app" class="d-flex justify-content-center align-items-center vh-100">
    <FileUpload />
  </div>
  <div id="app">
    <AnimatedBackground />
    <router-view />
  </div>
</template>

<script>
import FileUpload from "./components/FileUpload.vue";

export default {
  name: "App",
  components: {
    FileUpload,
  },
};
</script>

<style>
#app {
  text-align: center;
}
</style>
