<template>
  <Transition name="modal-fade" appear>
    <div class="modal-overlay" @click.self="closeModal">
      <div class="modal-wrapper">
        <div class="modal-card">
          <ModalHeader :title="title" @close="closeModal" />
          <div class="modal-scrollable">
            <div class="modal-body">
              <slot></slot>
            </div>
          </div>
          <ModalFooter
            v-if="showFooter"
            :disabled="disabled"
            :showDelete="showDelete"
            :showSave="showSave"
            :showCancel="showCancel"
            @cancel="closeModal"
            @save="onSave"
            @delete="onDelete"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import ModalHeader from './ModalHeader.vue'
import ModalFooter from './ModalFooter.vue'

const props = defineProps({
  title: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
  showSave: { type: Boolean, default: true },
  showCancel: { type: Boolean, default: true }
})

const emit = defineEmits(['close', 'save', 'delete'])

const showFooter = props.showSave || props.showDelete || props.showCancel;


const closeModal = () => emit('close')
const onSave = () => emit('save')
const onDelete = () => emit('delete')
</script>

<style scoped>
/* Стили для анимации модального окна */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.52, 0.02, 0.19, 1.02);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-wrapper,
.modal-fade-leave-active .modal-wrapper {
  transition: all 0.3s cubic-bezier(0.52, 0.02, 0.19, 1.02);
}

.modal-fade-enter-from .modal-wrapper,
.modal-fade-leave-to .modal-wrapper {
  transform: scale(0.95) translateY(-20px);
  opacity: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-wrapper {
  background: #f9fafb;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.modal-scrollable {
  overflow-y: auto;
  flex: 1;
}

.modal-body {
  padding: 24px;
}

@media (max-width: 640px) {
  .modal-wrapper {
    max-width: 100%;
    max-height: 90vh;
  }

  .modal-body {
    padding: 16px;
  }

  /* Делаем grid layouts одноколоночными */
  .modal-body :deep(.form-section) {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  .modal-body :deep(.col-span-2) {
    grid-column: span 1 !important;
  }
}
</style>