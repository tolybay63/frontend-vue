<template>
  <NForm
    :model="modelValue"
    label-placement="top"
    class="sources-form"
    @submit.prevent="handleSubmit"
  >
    <div class="form-grid">
      <NFormItem
        label="Наименование документа"
        :feedback="errors.name"
        :validation-status="errors.name ? 'error' : undefined"
      >
        <NInput
          :value="modelValue.name"
          placeholder="Введите наименование"
          @update:value="updateField('name', $event)"
        />
      </NFormItem>

      <NFormItem
        label="Номер"
        :feedback="errors.DocumentNumber"
        :validation-status="errors.DocumentNumber ? 'error' : undefined"
      >
        <NInput
          :value="modelValue.DocumentNumber"
          placeholder="Введите номер"
          @update:value="updateField('DocumentNumber', $event)"
        />
      </NFormItem>

      <NFormItem
        label="Дата утверждения"
        :feedback="errors.DocumentApprovalDate"
        :validation-status="errors.DocumentApprovalDate ? 'error' : undefined"
      >
        <NDatePicker
          type="date"
          format="dd.MM.yyyy"
          :value="isoDateToTimestamp(modelValue.DocumentApprovalDate)"
          :disabled="saving"
          @update:value="handleDateChange('DocumentApprovalDate', $event)"
        />
      </NFormItem>

      <NFormItem
        label="Орган (регулятор)"
        :feedback="errors.DocumentAuthor"
        :validation-status="errors.DocumentAuthor ? 'error' : undefined"
      >
        <NInput
          :value="modelValue.DocumentAuthor"
          placeholder="Укажите орган"
          @update:value="updateField('DocumentAuthor', $event)"
        />
      </NFormItem>

      <NFormItem label="Дата начала действия">
        <NDatePicker
          type="date"
          format="dd.MM.yyyy"
          :value="isoDateToTimestamp(modelValue.DocumentStartDate)"
          :disabled="saving"
          @update:value="handleDateChange('DocumentStartDate', $event)"
        />
      </NFormItem>

      <NFormItem label="Дата завершения действия">
        <NDatePicker
          type="date"
          format="dd.MM.yyyy"
          :value="isoDateToTimestamp(modelValue.DocumentEndDate)"
          :disabled="saving"
          @update:value="handleDateChange('DocumentEndDate', $event)"
        />
      </NFormItem>

      <NFormItem
        label="Исполнители (подразделения)"
        :feedback="errors.departmentIds"
        :validation-status="errors.departmentIds ? 'error' : undefined"
      >
        <NSelect
          :value="modelValue.departmentIds"
          :options="departmentOptions"
          multiple
          filterable
          placeholder="Выберите исполнителей"
          :disabled="saving"
          @update:value="updateField('departmentIds', $event as number[])"
        />
      </NFormItem>

      <NFormItem label="Файл">
        <NUpload
          :default-file-list="modelValue.fileList"
          :max="1"
          :disabled="saving"
          @update:file-list="handleUpdateFileList"
        >
          <NButton type="primary" quaternary>
            Загрузить файл
          </NButton>
        </NUpload>
        <p class="upload-hint">
          TODO: подключить RPC загрузки файла, когда появится соответствующий API.
        </p>
      </NFormItem>
    </div>

    <div class="form-actions">
      <NButton quaternary @click="handleCancel" :disabled="saving">Отмена</NButton>
      <NButton type="primary" :loading="saving" @click="handleSubmit">Сохранить</NButton>
    </div>
  </NForm>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NDatePicker, NForm, NFormItem, NInput, NSelect, NUpload, type SelectOption, type UploadFileInfo } from 'naive-ui'
import { isoDateToTimestamp, timestampToIsoDate } from '@shared/lib'

export interface SourcesFormModel {
  name: string
  DocumentNumber: string
  DocumentApprovalDate: string | null
  DocumentAuthor: string
  DocumentStartDate: string | null
  DocumentEndDate: string | null
  departmentIds: number[]
  fileList: UploadFileInfo[]
}

type FormErrors = Partial<Record<keyof SourcesFormModel, string>>

const props = defineProps<{
  modelValue: SourcesFormModel
  departmentOptions: SelectOption[]
  saving: boolean
  errors: FormErrors
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SourcesFormModel): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const errors = computed(() => props.errors)

function updateField<K extends keyof SourcesFormModel>(key: K, value: SourcesFormModel[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

function handleUpdateFileList(list: UploadFileInfo[]) {
  updateField('fileList', list)
}

function handleDateChange<K extends keyof SourcesFormModel>(key: K, value: number | null) {
  updateField(key, timestampToIsoDate(value) as SourcesFormModel[K])
}

function handleSubmit() {
  emit('submit')
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.sources-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

.upload-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .form-actions .n-button {
    width: 100%;
  }
}
</style>
