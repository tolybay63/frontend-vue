<template>
  <ModalWrapper
    title="Редактирование паспортных данных"
    @close="closeModal"
    @save="saveData"
    @delete="handleDelete"
    :showSave="canUpdate"
    :showDelete="canDelete"
    :loading="isSaving || isDeleting"
  >
    <div class="form-section">
      <div class="col-span-2">
        <div class="item-grid">
          <AppDropdown
            class="full-width"
            id="component"
            label="Компонент"
            placeholder="Выберите компонент"
            v-model="form.component"
            :options="componentOptions"
            :loading="loadingComponents"
            @update:value="handleComponentChange"
          />

          <AppDropdown
            class="full-width"
            id="parameter"
            label="Параметр"
            placeholder="Выберите параметр"
            v-model="form.parameter"
            :options="form.parameterOptions"
            :loading="form.loadingParameters"
            @update:value="handleParameterChange"
          />

          <MultipleSelect
            class="full-width"
            id="signs"
            label="Признак"
            v-model="form.signs"
            :options="form.signOptions"
            :loading="form.loadingSigns"
            :singlePerGroup="true"
          />

          <AppDropdown
            id="unit"
            label="Единица измерения"
            placeholder="Выберите единицу"
            v-model="form.unit"
            :options="unitOptions"
            :loading="loadingUnits"
          />

          <AppNumberInput
            id="value"
            label="Значение"
            placeholder="Введите значение"
            v-model="form.value"
            :allowDecimal="true"
            :step="0.01"
          />
        </div>
      </div>
    </div>

    <ConfirmationModal
      v-if="showConfirmModal"
      title="Удаление паспортных данных"
      message="Вы действительно хотите удалить эти паспортные данные?"
      @confirm="confirmDelete"
      @cancel="showConfirmModal = false"
    />
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'
import MultipleSelect from '@/shared/ui/FormControls/MultipleSelect.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { loadComponentsByObjectType, loadParametersByComponent, loadMeasureUnits, loadSignsByParameter, updateComplexObjectPassport, deleteComplexObjectPassport } from '@/shared/api/objects/objectService'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { usePermissions } from '@/shared/api/auth/usePermissions'

const { hasPermission } = usePermissions()
const canUpdate = computed(() => hasPermission('obj:upd'))
const canDelete = computed(() => hasPermission('obj:del'))

const notificationStore = useNotificationStore()

const props = defineProps({
  rowData: { type: Object, default: null }
})

const emit = defineEmits(['close', 'save', 'deleted'])

const createNewItem = () => ({
  component: null,
  parameter: null,
  signs: [],
  unit: null,
  value: null,
  parameterOptions: [],
  loadingParameters: false,
  signOptions: [],
  signRawData: [], // Сырые данные признаков для сохранения
  loadingSigns: false
})

const form = ref(createNewItem())

const componentOptions = ref([])
const unitOptions = ref([])

const loadingComponents = ref(false)
const loadingUnits = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const showConfirmModal = ref(false)

const populateForm = async () => {
  if (!props.rowData) return

  // 1. Устанавливаем простые значения
  form.value.value = props.rowData.PassportVal
  form.value.unit = props.rowData.meaPassportMeasure

  // Устанавливаем компонент
  form.value.component = props.rowData.objComponent

  // 2. Загружаем параметры для выбранного компонента (без сброса значений)
  if (form.value.component) {
    form.value.loadingParameters = true
    try {
      const parameters = await loadParametersByComponent(form.value.component)
      form.value.parameterOptions = parameters.map(p => ({
        label: p.name || p.label,
        value: p.id || p.value,
        pv: p.pv || p.id || p.value
      }))
    } catch (error) {
      console.error('Ошибка загрузки параметров:', error)
      form.value.parameterOptions = []
    } finally {
      form.value.loadingParameters = false
    }
  }

  // 3. Устанавливаем ID параметра
  form.value.parameter = props.rowData.relobjPassportComponentParams

  // 4. Загружаем признаки для выбранного параметра (без сброса значений)
  if (form.value.parameter) {
    form.value.loadingSigns = true
    try {
      const signs = await loadSignsByParameter(form.value.parameter)
      form.value.signRawData = signs
      form.value.signOptions = buildSignTree(signs)
    } catch (error) {
      console.error('Ошибка загрузки признаков:', error)
      form.value.signOptions = []
      form.value.signRawData = []
    } finally {
      form.value.loadingSigns = false
    }
  }

  // 5. Устанавливаем признаки
  if (props.rowData.objPassportSignMulti?.length) {
    form.value.signs = props.rowData.objPassportSignMulti.map(s => s.id)
  }
}

const loadComponents = async () => {
  // ID объекта берем из props.rowData.objectId (передается из PassportData.vue)
  if (!props.rowData?.objectId) {
    console.warn('objectId не найден в записи:', props.rowData)
    return
  }
  loadingComponents.value = true
  try {
    const components = await loadComponentsByObjectType(props.rowData.objectId)
    componentOptions.value = components.map(c => ({
      label: c.name || c.label,
      value: c.id || c.value,
      objComponent: c.id || c.value
    }))
  } catch (error) {
    console.error('Ошибка загрузки компонентов:', error)
    componentOptions.value = []
  } finally {
    loadingComponents.value = false
  }
}

const loadUnits = async () => {
  loadingUnits.value = true
  try {
    const units = await loadMeasureUnits()
    unitOptions.value = units.map(u => ({
      label: u.name || u.label,
      value: u.id || u.value,
      pv: u.pv
    }))
  } catch (error) {
    console.error('Ошибка загрузки единиц измерения:', error)
    unitOptions.value = []
  } finally {
    loadingUnits.value = false
  }
}

const handleComponentChange = async (componentId) => {
  const item = form.value
  item.parameter = null
  item.parameterOptions = []
  item.signs = []
  item.signOptions = []

  if (componentId) {
    item.loadingParameters = true
    try {
      const parameters = await loadParametersByComponent(componentId)
      item.parameterOptions = parameters.map(p => ({
        label: p.name || p.label,
        value: p.id || p.value,
        pv: p.pv || p.id || p.value
      }))
    } catch (error) {
      console.error('Ошибка загрузки параметров:', error)
      item.parameterOptions = []
    } finally {
      item.loadingParameters = false
    }
  }
}

// Функция для преобразования плоского списка в дерево
const buildSignTree = (records) => {
  // Сначала найдем все родительские записи (без parent)
  const parents = records.filter(r => !r.parent)
  // И все дочерние записи (с parent)
  const children = records.filter(r => r.parent)

  // Строим дерево
  return parents.map(parent => {
    const parentChildren = children.filter(c => c.parent === parent.id)
    return {
      label: parent.name,
      value: parent.id,
      disabled: true, // Родители не выбираются
      children: parentChildren.map(child => ({
        label: child.name,
        value: child.id,
        pv: child.pv,
        cls: child.cls
      }))
    }
  }).filter(p => p.children.length > 0) // Показываем только родителей с детьми
}

const handleParameterChange = async (parameterId) => {
  const item = form.value
  item.signs = []
  item.signOptions = []
  item.signRawData = []

  if (parameterId) {
    item.loadingSigns = true
    try {
      const signs = await loadSignsByParameter(parameterId)
      item.signRawData = signs // Сохраняем сырые данные для формирования payload
      item.signOptions = buildSignTree(signs)
    } catch (error) {
      console.error('Ошибка загрузки признаков:', error)
      item.signOptions = []
      item.signRawData = []
    } finally {
      item.loadingSigns = false
    }
  }
}

const closeModal = () => {
  emit('close')
}

const handleDelete = () => {
  if (!props.rowData?.idPassportComplex) {
    notificationStore.showNotification('Не удалось получить ID для удаления', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  if (isDeleting.value) return

  showConfirmModal.value = false
  isDeleting.value = true
  try {
    await deleteComplexObjectPassport(props.rowData.idPassportComplex)
    notificationStore.showNotification('Паспортные данные успешно удалены!', 'success')
    emit('deleted')
    closeModal()
  } catch (error) {
    console.error('Ошибка при удалении паспортных данных:', error)
    notificationStore.showNotification('Ошибка при удалении паспортных данных', 'error')
  } finally {
    isDeleting.value = false
  }
}

const validateForm = () => {
  const item = form.value
  if (!item.parameter) {
    notificationStore.showNotification('Не выбран "Параметр"', 'error')
    return false
  }
  if (item.value === null || item.value === '') {
    notificationStore.showNotification('Не заполнено "Значение"', 'error')
    return false
  }
  return true
}

const saveData = async () => {
  if (isSaving.value) return

  if (!validateForm()) return

  isSaving.value = true
  try {
    const item = form.value
    // Получаем id и pv параметра (item.parameter может быть объектом или числом)
    const parameterId = typeof item.parameter === 'object' ? item.parameter.value : item.parameter
    const parameterData = item.parameterOptions.find(p => p.value === parameterId)

    // Получаем id и pv единицы измерения
    const unitId = typeof item.unit === 'object' ? item.unit.value : item.unit
    const unitData = unitOptions.value.find(u => u.value === unitId)

    // Формируем массив выбранных признаков с полными данными
    const selectedSigns = item.signs.map(signId => {
      const signData = item.signRawData.find(s => s.id === signId)
      if (signData) {
        return {
          id: signData.id,
          cls: signData.cls,
          name: signData.name
        }
      }
      return null
    }).filter(Boolean)

    const payload = {
      id: props.rowData.id,
      idPassportComplex: props.rowData.idPassportComplex,
      idPassportComponentParams: props.rowData.idPassportComponentParams,
      relobjPassportComponentParams: parameterId,
      pvPassportComponentParams: parameterData?.pv,
      idPassportMeasure: props.rowData.idPassportMeasure,
      meaPassportMeasure: unitId,
      pvPassportMeasure: unitData?.pv,
      idPassportVal: props.rowData.idPassportVal,
      PassportVal: item.value,
      objPassportSignMulti: selectedSigns
    }

    await updateComplexObjectPassport(payload)

    notificationStore.showNotification('Паспортные данные успешно сохранены!', 'success')
    emit('save')
    closeModal()
  } catch (error) {
    notificationStore.showNotification('Ошибка при сохранении паспортных данных', 'error')
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadComponents(), loadUnits()])

  if (props.rowData) {
    await populateForm()
  }
})
</script>

<style scoped>
.form-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 0 32px 32px;
  background-color: #f9fafb;
}

.section-title {
  font-weight: 600;
  color: #2b6cb0;
  font-size: 14px;
  margin-bottom: 8px;
}

.col-span-2 {
  grid-column: span 2;
}

.divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 16px 0;
}

.item-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
}

.full-width {
  grid-column: span 2;
}

@media (max-width: 768px) {
  .form-section {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 0 16px 16px;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .item-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .full-width {
    grid-column: span 1;
  }
}
</style>
