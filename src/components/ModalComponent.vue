<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Background overlay -->
    <div class="absolute inset-0 bg-black opacity-50" @click="closeModal"></div>

    <!-- Modal content -->
    <div class="relative bg-white p-3 rounded-lg shadow-lg z-10 max-w-lg w-full">
      <slot></slot>
      <div class="mt-4 flex justify-center">
        <button class="bg-blue-500 text-white px-4 py-2 rounded" @click="closeModal">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    show: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['close'],
  methods: {
    closeModal() {
      this.$emit('close');
    },
  },
};
</script>