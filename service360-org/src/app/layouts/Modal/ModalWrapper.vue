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
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-wrapper {
  width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background-color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.modal-card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  height: 100%;
}

.modal-scrollable {
  overflow-y: auto;
  flex: 1;
}

.modal-body {
  padding: 32px;
  background-color: #f9fafb;
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
</style>