<template>
  <ModalWrapper
    v-if="show"
    title="Привязка кодов"
    :show-save="false"
    :show-cancel="true"
    cancel-text="Закрыть"
    @close="closeModal"
  >
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка данных...</p>
    </div>

    <div v-else-if="assignData.length > 0" class="table-container">
      <table class="assign-table">
        <thead>
          <tr>
            <th>Код</th>
            <th>Код ТОФИ</th>
            <th class="actions-column"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in assignData" :key="index">
            <td>{{ item.cod }}</td>
            <td>
              <div v-if="editingIndex === index" class="edit-mode">
                <AppDropdown
                  :id="`tofi-${index}`"
                  v-model="editingValue"
                  :options="tofiOptions"
                  placeholder="Выберите код ТОФИ"
                />
              </div>
              <span v-else>{{ item.name || '-' }}</span>
            </td>
            <td class="actions-column">
              <div class="action-buttons">
                <template v-if="editingIndex === index">
                  <button
                    class="icon-button save"
                    @click="saveEdit(index)"
                    title="Сохранить"
                  >
                    <Check :size="18" />
                  </button>
                  <button
                    class="icon-button cancel"
                    @click="cancelEdit"
                    title="Отмена"
                  >
                    <X :size="18" />
                  </button>
                </template>
                <button
                  v-else
                  class="icon-button edit"
                  @click="startEdit(index, item.name)"
                  title="Редактировать"
                >
                  <Pencil :size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-state">
      <p>Нет данных для отображения</p>
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Pencil, Check, X } from 'lucide-vue-next';
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue';
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue';
import { loadAssignData, loadRelObjForSelect, loadObjForSelect, saveAssign } from '@/shared/api/track-gauge/trackGaugeApi';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  codes: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close']);

const loading = ref(false);
const assignData = ref([]);
const tofiOptions = ref([]);
const tofiOptionsRaw = ref([]); // Храним полные данные опций
const editingIndex = ref(null);
const editingValue = ref(null);
const saving = ref(false);

const closeModal = () => {
  emit('close');
};

const loadData = async () => {
  if (!props.codes) return;

  loading.value = true;
  try {
    const data = await loadAssignData(props.codes);
    assignData.value = data;
  } catch (error) {
    console.error('Ошибка при загрузке данных привязки:', error);
    assignData.value = [];
    tofiOptions.value = [];
  } finally {
    loading.value = false;
  }
};

const startEdit = async (index, currentValue) => {
  const item = assignData.value[index];
  const code = item.cod;

  editingIndex.value = index;
  editingValue.value = currentValue;

  // Определяем тип кода и загружаем соответствующие опции
  try {
    let options = [];

    if (code && code.includes('kod_otstup')) {
      // Для kod_otstup используем loadRelObjForSelect
      const data = await loadRelObjForSelect(code);
      options = data;
    } else if (code && code.includes('kod_napr')) {
      // Для kod_napr используем loadObjForSelect
      const data = await loadObjForSelect(code);
      options = data;
    }

    // Сохраняем полные данные опций для использования при сохранении
    tofiOptionsRaw.value = options;

    // Формируем опции для dropdown - используем id как value
    tofiOptions.value = options.map(option => ({
      value: option.id,
      label: option.name || option.label || option
    }));
  } catch (error) {
    console.error('Ошибка при загрузке опций для dropdown:', error);
    tofiOptions.value = [];
    tofiOptionsRaw.value = [];
  }
};

const cancelEdit = () => {
  editingIndex.value = null;
  editingValue.value = null;
  tofiOptionsRaw.value = [];
};

const saveEdit = async (index) => {
  if (editingValue.value === null || editingValue.value === undefined) {
    cancelEdit();
    return;
  }

  // AppDropdown возвращает объект {value, label}, поэтому берем value из него
  const selectedId = typeof editingValue.value === 'object' ? editingValue.value.value : editingValue.value;

  // Находим выбранный элемент по id
  const selectedOption = tofiOptionsRaw.value.find(opt => opt.id === selectedId || opt.id === Number(selectedId));

  if (!selectedOption) {
    console.error('Не найден выбранный элемент');
    cancelEdit();
    return;
  }

  const item = assignData.value[index];

  // Формируем данные для сохранения
  const assignDataToSave = {
    cod: item.cod,
    id: selectedOption.id,
    syscod: selectedOption.syscod || selectedOption.id,
    name: selectedOption.name
  };

  saving.value = true;
  try {
    await saveAssign(assignDataToSave);

    // Обновляем локальные данные после успешного сохранения
    assignData.value[index].name = selectedOption.name;

    editingIndex.value = null;
    editingValue.value = null;
    tofiOptionsRaw.value = [];
  } catch (error) {
    console.error('Ошибка при сохранении привязки:', error);
  } finally {
    saving.value = false;
  }
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    loadData();
  } else {
    assignData.value = [];
  }
});
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(49, 130, 206, 0.3);
  border-top-color: #3182ce;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  color: #4a5568;
  font-size: 14px;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #718096;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.table-container {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.assign-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: white;
}

.assign-table thead {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.assign-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: #64748b;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.assign-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s;
}

.assign-table tbody tr:hover {
  background: #f8fafc;
}

.assign-table td {
  padding: 12px 16px;
  color: #1e293b;
  vertical-align: middle;
}

.actions-column {
  width: 120px;
  text-align: right;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.icon-button.edit {
  background: #f3f4f6;
  color: #6b7280;
}

.icon-button.edit:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.icon-button.save {
  background: #f3f4f6;
  color: #6b7280;
}

.icon-button.save:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.icon-button.cancel {
  background: #fef2f2;
  color: #dc2626;
}

.icon-button.cancel:hover {
  background: #dc2626;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
}

.edit-mode {
  min-width: 200px;
}

/* Скрываем лейблы в dropdown внутри таблицы */
.assign-table :deep(label) {
  display: none;
}

.assign-table :deep(.form-group) {
  margin: 0;
}
</style>
