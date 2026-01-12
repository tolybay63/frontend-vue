<template>
  <TableWrapper
    ref="tableWrapperRef"
    title="Импорт данных путеизмерителя"
    :columns="columns"
    :actions="tableActions"
    :limit="limit"
    :loadFn="loadDataWrapper"
    :showFilters="false"
    @row-dblclick="onRowDoubleClick"
  >
  </TableWrapper>

  <input
    ref="fileInputRef"
    type="file"
    accept=".xml"
    style="display: none"
    @change="handleFileSelect"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import TableWrapper from '@/app/layouts/Table/TableWrapper.vue';
import { analyzeTrackGaugeFile } from '@/shared/api/track-gauge/trackGaugeApi';
import { useNotificationStore } from '@/app/stores/notificationStore';

const router = useRouter();
const notificationStore = useNotificationStore();

const limit = 10;
const tableWrapperRef = ref(null);
const fileInputRef = ref(null);
const selectedFileName = ref('');
const selectedFile = ref(null);
const analyzedData = ref([]);
const columns = ref([
  { key: 'id', label: '№' },
]);

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    selectedFileName.value = file.name;
  }
};

const openFileDialog = () => {
  fileInputRef.value?.click();
};

const handleAnalyze = async () => {
  if (!selectedFile.value || !selectedFileName.value) {
    notificationStore.showNotification('Пожалуйста, выберите файл', 'warning');
    return;
  }

  try {
    const records = await analyzeTrackGaugeFile(selectedFileName.value, selectedFile.value);

    console.log('Полученные записи:', records);

    if (records && records.length > 0) {
      // Динамически создаем колонки на основе ключей первой записи
      const firstRecord = records[0];
      const dynamicColumns = Object.keys(firstRecord).map(key => ({
        key: key,
        label: key,
      }));

      columns.value = dynamicColumns;
      analyzedData.value = records;

      console.log('Созданные колонки:', dynamicColumns);
      console.log('Данные для таблицы:', records);

      // Обновляем таблицу
      if (tableWrapperRef.value && tableWrapperRef.value.refreshTable) {
        tableWrapperRef.value.refreshTable();
      }

      notificationStore.showNotification(`Файл успешно проанализирован. Найдено записей: ${records.length}`, 'success');
    } else {
      notificationStore.showNotification('Нет данных для отображения', 'warning');
    }
  } catch (error) {
    console.error('Ошибка при анализе файла:', error);

    let errorMessage = 'Ошибка при анализе файла';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    notificationStore.showNotification(errorMessage, 'error');
  }
};

const loadDataWrapper = async ({ page, limit, filters: filterValues }) => {
  return {
    total: analyzedData.value.length,
    data: analyzedData.value,
  };
};

const onRowDoubleClick = (row) => {
  // Логика обработки двойного клика будет добавлена позже
};

const tableActions = computed(() => [
  {
    label: 'Выбрать файл',
    icon: 'FolderClosed',
    onClick: openFileDialog,
    show: true,
    variant: 'primary',
    extraText: selectedFileName.value,
  },
  {
    label: 'Анализ',
    icon: 'ChartNoAxesGantt',
    onClick: handleAnalyze,
    show: true,
  },
  {
    label: 'Привязка',
    icon: 'Link2',
    onClick: () => {
      // Логика привязки
    },
    show: true,
  },
  {
    label: 'Залить',
    icon: 'FolderUp',
    onClick: () => {
      // Логика заливки
    },
    show: true,
  },
]);
</script>

<style scoped>
</style>
