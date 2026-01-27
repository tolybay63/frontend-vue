<template>
  <ModalWrapper title="Создать организационную структуру" @close="closeModal" @save="saveData">
    <div class="form-section">

      <AppInput
        class="col-span-2"
        id="name"
        label="Наименование"
        placeholder="Введите наименование"
        v-model="form.name"
        :required="true" />

      <AppDropdown
        class="col-span-2"
        id="parent"
        label="Родительское подразделение"
        placeholder="Выберите родительское подразделение"
        v-model="form.parent"
        :options="parentOptions"
        :loading="loadingParents"
        :required="true" />

      <AppDropdown
        id="activityType"
        label="Вид деятельности"
        placeholder="Выберите вид деятельности"
        :options="activityOptions"
        :loading="loadingActivities"
        :value="form.activityType"
        @update:value="val => { form.activityType = val; handleActivityTypeChange(val) }"
        :required="true" />

      <AppDropdown
        id="region"
        label="Регион"
        placeholder="Выберите регион"
        v-model="form.region"
        :options="regionOptions"
        :loading="loadingRegions"
        :required="true" />

      <div class="col-span-2" v-if="form.activityType === 1069">
        <h4 class="section-title">Дополнительная информация</h4>
        <div class="coordinate-grid">
          <AppInput
            id="address"
            label="Адрес"
            placeholder="Введите адрес"
            v-model="form.address"
            :required="true" />
          <PhoneInput
            id="phone"
            label="Номер телефона"
            placeholder="Введите номер телефона"
            v-model="form.phone"
            :required="true" />
        </div>
      </div>

      <div class="col-span-2" v-if="form.activityType === 1070">
        <h4 class="section-title">Дополнительная информация</h4>
        <div class="coordinate-grid">
          <CoordinateInputs 
            v-model="form.coordinates" 
            :required="true" />
          <AppInput
            class="col-span-2"
            id="distance"
            label="Протяженность (км)"
            placeholder="Введите координаты"
            v-model="form.distance"
            :disabled="true"
            :required="true" />
          <MultipleSelect
            class="col-span-2"
            id="multi"
            label="Обслуживаемые объекты"
            v-model="form.multipleSelect"
            :options="multiOptions"
            placeholder="Выберите объекты"
            :required="false" :fallback-option="(val) => ({ label: val, value: val })"
          />
        </div>
      </div>

      <AppInput
        class="col-span-2"
        id="description"
        label="Описание"
        placeholder="Введите описание..."
        v-model="form.description"
        type="textarea"
        :required="true" />

      <div class="active-row">
        <label for="active">Активно</label>
        <n-switch
          id="active"
          :value="form.active?.id === trueOption?.id"
          @update:value="val => form.active = val ? trueOption : falseOption"
        />
      </div>
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import PhoneInput from '@/shared/ui/FormControls/PhoneInput.vue'
import CoordinateInputs from '@/shared/ui/FormControls/CoordinateInputs.vue'
import MultipleSelect from '@/shared/ui/FormControls/MultipleSelect.vue'

import {
  fetchParentDepartments,
  fetchActivityTypes,
  fetchRegions,
  fetchActiveOptions,
  loadTypes
} from '@/shared/api/organization/organizationService'

import { saveLocation } from '@/shared/api/locations/locationService'
import { useNotificationStore } from '@/app/stores/notificationStore'

const emit = defineEmits(['close', 'update-table'])

const notificationStore = useNotificationStore()

const form = ref({
  name: '',
  parent: null,
  activityType: '',
  region: null,
  address: '',
  phone: '',
  description: '',
  coordinates: {
    coordStartKm: 0,
    coordStartPk: 0,
    coordEndKm: 0,
    coordEndPk: 0
  },
  distance: '',
  multipleSelect: [],
  active: null,
})

const parentOptions = ref([])
const loadingParents = ref(false)

const activityOptions = ref([])
const loadingActivities = ref(false)

const regionOptions = ref([])
const loadingRegions = ref(false)

const trueOption = ref(null)
const falseOption = ref(null)

const multiOptions = ref([])

const closeModal = () => {
  emit('close')
}

const saveData = async () => {
  try {
    await saveLocation(
      form.value,
      multiOptions.value,
      regionOptions.value,
      trueOption.value,
      falseOption.value
    )
    notificationStore.showNotification('Организационная структура успешно создана!', 'success')
    emit('update-table')
    closeModal()
  } catch (e) {
    console.error('Ошибка при сохранении:', e)
    notificationStore.showNotification('Ошибка при сохранении структуры', 'error')
  }
}

const handleActivityTypeChange = (selectedId) => {
  if (selectedId === 1069 || selectedId === 1070) {
    form.value.address = ''
    form.value.phone = ''
    form.value.coordinates = {
      coordStartKm: 0,
      coordStartPk: 0,
      coordEndKm: 0,
      coordEndPk: 0
    }
    form.value.distance = ''
  }
}

watch(
  [
    () => form.value.coordinates.coordStartKm,
    () => form.value.coordinates.coordStartPk,
    () => form.value.coordinates.coordEndKm,
    () => form.value.coordinates.coordEndPk,
  ],
  ([startKm, startPk, endKm, endPk]) => {
    const skm = parseFloat(startKm)
    const spk = parseFloat(startPk)
    const ekm = parseFloat(endKm)
    const epk = parseFloat(endPk)

    const isValid = [skm, spk, ekm, epk].every(n => Number.isFinite(n))

    if (!isValid) {
      form.value.distance = ''
      return
    }

    const startTotal = skm * 1000 + spk * 100
    const endTotal = ekm * 1000 + epk * 100
    const diff = endTotal - startTotal

    if (diff >= 0) {
      form.value.distance = (diff / 1000).toFixed(2)
    } else {
      form.value.distance = 'Неверные данные'
    }
  }
)

onMounted(async () => {
  try {
    loadingParents.value = true
    parentOptions.value = (await fetchParentDepartments()).map(item => ({
      label: item.name,
      value: item.id
    }))
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки подразделений', 'error')
  } finally {
    loadingParents.value = false
  }

  try {
    loadingActivities.value = true
    activityOptions.value = (await fetchActivityTypes()).map(item => ({
      label: item.name,
      value: item.id
    }))
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки видов деятельности', 'error')
  } finally {
    loadingActivities.value = false
  }

  try {
    loadingRegions.value = true
    const rawRegions = await fetchRegions()
    regionOptions.value = rawRegions.map(item => ({
      label: item.name,
      value: item.id,
      id: item.id,
      name: item.name,
      pv: item.pv,
      factor: item.factor,
    }))
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки регионов', 'error')
  } finally {
    loadingRegions.value = false
  }

  try {
    const activeOptions = await fetchActiveOptions()
    trueOption.value = activeOptions.find(opt => opt.name.toLowerCase() === 'да')
    falseOption.value = activeOptions.find(opt => opt.name.toLowerCase() === 'нет')
    form.value.active = falseOption.value?.id ?? null
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки флага активности', 'error')
  }

  try {
    multiOptions.value = await loadTypes()
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки типов объектов', 'error')
  }
})
</script>





<style scoped>
.form-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  padding: 0 32px 32px;
  background-color: #f9fafb;
}

.col-span-2 {
  grid-column: span 2;
}

.coordinate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  
}

.active-row {
  display: flex;
  align-items: center;
  
  grid-column: span 2;
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
}

#distance {
  grid-column: span 2;
}
</style>
