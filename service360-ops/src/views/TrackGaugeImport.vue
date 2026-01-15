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
    <template #controls-footer>
      <div v-if="analysisStatus" class="analysis-status" :class="`status-${analysisStatus.type}`">
        Статус: <span class="status-text">{{ analysisStatus.message }}</span>
      </div>
    </template>
  </TableWrapper>

  <LoadingSpinner :show="isAnalyzing" message="Анализ файла..." />

  <AssignModal
    :show="showAssignModal"
    :codes="assignCodes"
    @close="showAssignModal = false"
  />

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
import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue';
import AssignModal from '@/features/TrackGaugeImport/AssignModal.vue';
import { analyzeTrackGaugeFile, loadImportLog, uploadTrackGaugeData } from '@/shared/api/track-gauge/trackGaugeApi';
import { useNotificationStore } from '@/app/stores/notificationStore';

const router = useRouter();
const notificationStore = useNotificationStore();

const limit = 10;
const tableWrapperRef = ref(null);
const fileInputRef = ref(null);
const selectedFileName = ref('');
const selectedFile = ref(null);
const analyzedData = ref([]);
const analysisStatus = ref(null);
const canUpload = ref(false);
const canBind = ref(false);
const isAnalyzing = ref(false);
const showAssignModal = ref(false);
const assignCodes = ref('');
const columns = ref([
  { key: 'id', label: '№' },
]);

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    selectedFileName.value = file.name;

    // Сброс таблицы при выборе нового файла
    analyzedData.value = [];
    analysisStatus.value = null;
    canUpload.value = false;
    canBind.value = false;
    columns.value = [{ key: 'id', label: '№' }];

    if (tableWrapperRef.value && tableWrapperRef.value.refreshTable) {
      tableWrapperRef.value.refreshTable();
    }
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

  isAnalyzing.value = true;

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

      // Вызываем loadImportLog для проверки статуса
      try {
        const logData = await loadImportLog(selectedFileName.value);
        console.log('Данные лога:', logData);

        if (logData && logData.msg) {
          // Если есть сообщение в msg, показываем его красным
          analysisStatus.value = {
            type: 'error',
            message: logData.msg
          };
          canUpload.value = false;

          // Проверяем, есть ли в сообщении kod_napr в квадратных скобках
          // Например: "Нет привязки [kod_napr_24026]" или "Нет привязки [kod_napr_24026, kod_napr_24027]"
          const hasKodNapr = /\[.*kod_napr.*\]/.test(logData.msg);
          canBind.value = hasKodNapr;
        } else {
          // Если msg пустой, показываем успешно
          analysisStatus.value = {
            type: 'success',
            message: 'успешно'
          };
          canUpload.value = true;
          canBind.value = false;
        }
      } catch (logError) {
        console.error('Ошибка при загрузке лога:', logError);
        // Если не удалось загрузить лог, все равно показываем успешно
        analysisStatus.value = {
          type: 'success',
          message: 'успешно'
        };
        canUpload.value = true;
      }

      notificationStore.showNotification(`Файл успешно проанализирован. Найдено записей: ${records.length}`, 'success');
    } else {
      analysisStatus.value = {
        type: 'warning',
        message: 'нет данных'
      };
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

    analysisStatus.value = {
      type: 'error',
      message: 'ошибка'
    };

    notificationStore.showNotification(errorMessage, 'error');
  } finally {
    isAnalyzing.value = false;
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

const extractCodesFromMessage = (message) => {
  // Извлекаем все что внутри квадратных скобок
  // Например: "Нет привязки [kod_napr_24026]" -> "kod_napr_24026"
  // Или: "Нет привязки [kod_napr_24026, kod_napr_24027]" -> "kod_napr_24026, kod_napr_24027"
  const match = message.match(/\[(.*?)\]/);
  return match ? match[1] : '';
};

const handleBind = () => {
  if (analysisStatus.value && analysisStatus.value.message) {
    assignCodes.value = extractCodesFromMessage(analysisStatus.value.message);
    showAssignModal.value = true;
  }
};

const handleUpload = async () => {
  if (!analyzedData.value || analyzedData.value.length === 0) {
    notificationStore.showNotification('Нет данных для заливки', 'warning');
    return;
  }

  isAnalyzing.value = true;

  try {
    await uploadTrackGaugeData(analyzedData.value);
    notificationStore.showNotification('Данные успешно залиты', 'success');

    // Обновляем таблицу
    if (tableWrapperRef.value && tableWrapperRef.value.refreshTable) {
      tableWrapperRef.value.refreshTable();
    }
  } catch (error) {
    console.error('Ошибка при заливке данных:', error);

    let errorMessage = 'Ошибка при заливке данных';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    notificationStore.showNotification(errorMessage, 'error');
  } finally {
    isAnalyzing.value = false;
  }
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
    onClick: handleBind,
    show: true,
    disabled: !canBind.value,
  },
  {
    label: 'Залить',
    icon: 'FolderUp',
    onClick: handleUpload,
    show: true,
    disabled: !canUpload.value,
  },
]);
</script>

<style scoped>
.analysis-status {
  font-size: 14px;
  font-weight: normal;
  color: #1a202c;
}

.analysis-status .status-text {
  font-weight: normal;
}

.status-success .status-text {
  color: #22c55e;
}

.status-warning .status-text {
  color: #f59e0b;
}

.status-error .status-text {
  color: #ef4444;
}
</style>
