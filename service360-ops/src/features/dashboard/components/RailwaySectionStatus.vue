<template>
  <div class="railway-section-wrapper">
    <div class="railway-section" :class="{ 'loading': isLoading }">
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <span>Загрузка данных...</span>
      </div>

      <RailwayStatusHeader
        :title="mode === 'skew' ? 'Перекосы и другие отклонения' : (mode === 'width' ? 'Отклонения по ширине колеи' : 'Оценка состояния пути')"
        :average-score="averageScore"
        :status-stats="statusStats"
        :selected-legends="selectedLegends"
        :mode="mode"
        @toggle-legend="toggleLegend"
      />

      <div ref="railwayContainer" class="railway-container">
        <RailwayStationsRow
          :start-station="edgeStations.startStation.name"
          :end-station="edgeStations.endStation.name"
        />

        <RailwayTrack
          ref="trackComponent"
          :segments="railwaySegments"
          :visible-stations="visibleStationsWithLabels"
          :is-dragging="isDragging"
          :is-zoomable="zoomLevel > MIN_ZOOM"
          @mousedown="handleMouseDown"
        />

        <RailwayDistanceLabels :labels="distanceLabels" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import RailwayStatusHeader from './railway/RailwayStatusHeader.vue';
import RailwayStationsRow from './railway/RailwayStationsRow.vue';
import RailwayTrack from './railway/RailwayTrack.vue';
import RailwayDistanceLabels from './railway/RailwayDistanceLabels.vue';

const props = defineProps({
  intermediateStations: {
    type: Array,
    required: true,
  },
  statusSegments: {
    type: Array,
    default: () => [],
  },
  mode: {
    type: String,
    default: 'status', // 'status' или 'width'
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const TOTAL_RAIL_LENGTH_KM = 151;

const selectedLegends = ref([]);

const zoomLevel = ref(1);
const panOffset = ref(0);
const trackComponent = ref(null);
const railwayContainer = ref(null);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartOffset = ref(0);

const MIN_ZOOM = 1;
const MAX_ZOOM = 20;
const ZOOM_SPEED = 0.1;

const currentDate = computed(() => {
  const today = new Date();
  return today.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
});

const formatStationCoords = (kmValue) => {
  if (kmValue === null || kmValue === undefined) return '';
  const km = Math.floor(kmValue);
  const pk = Math.round((kmValue - km) * 10);
  return `${km}км ${pk}пк`;
};

const toggleLegend = (legendType) => {
  const index = selectedLegends.value.indexOf(legendType);
  if (index > -1) {
    selectedLegends.value.splice(index, 1);
  } else {
    selectedLegends.value.push(legendType);
  }
};

const getSegmentColor = (paramsLimit, skewType = null) => {
  if (props.mode === 'skew') {
    // Режим перекосов - цвет зависит от типа отклонения
    if (skewType === 'level') return '#f59e0b'; // Оранжевый для откл. от уровня
    if (skewType === 'skew') return '#ec4899'; // Розовый для перекоса
    if (skewType === 'subsidence') return '#8b5cf6'; // Фиолетовый для просадки
    if (skewType === 'planDeviation') return '#06b6d4'; // Голубой для откл. в плане
    return '#cbd5e1';
  } else if (props.mode === 'width') {
    // Режим ширины колеи
    if (paramsLimit < 1516) return '#3b82f6'; // Синий для сужения
    if (paramsLimit > 1538) return '#a855f7'; // Фиолетовый для уширения
    return '#cbd5e1'; // Нормальная ширина (серый)
  } else {
    // Режим оценки состояния
    if (paramsLimit <= 25) return '#10b981';
    if (paramsLimit <= 80) return '#84cc16';
    if (paramsLimit <= 180) return '#f97316';
    return '#ef4444';
  }
};

const getSegmentStatus = (paramsLimit, skewType = null) => {
  if (props.mode === 'skew') {
    if (skewType === 'level') return 'Откл. от уровня';
    if (skewType === 'skew') return 'Перекос';
    if (skewType === 'subsidence') return 'Просадка';
    if (skewType === 'planDeviation') return 'Откл. в плане';
    return 'Норма';
  } else if (props.mode === 'width') {
    if (paramsLimit < 1516) return 'Сужение';
    if (paramsLimit > 1538) return 'Уширение';
    return 'Норма';
  } else {
    if (paramsLimit <= 25) return 'Отлично';
    if (paramsLimit <= 80) return 'Хорошо';
    if (paramsLimit <= 180) return 'Удовлетворительно';
    return 'Неудовлетворительно';
  }
};

const getSegmentStatusType = (paramsLimit, skewType = null) => {
  if (props.mode === 'skew') {
    // Для перекосов тип уже есть в skewType
    return skewType;
  } else if (props.mode === 'width') {
    if (paramsLimit < 1516) return 'narrowing';
    if (paramsLimit > 1538) return 'widening';
    return null;
  } else {
    if (paramsLimit <= 25) return 'excellent';
    if (paramsLimit <= 80) return 'good';
    if (paramsLimit <= 180) return 'satisfactory';
    return 'poor';
  }
};

const visibleRange = computed(() => {
  const visibleWidth = TOTAL_RAIL_LENGTH_KM / zoomLevel.value;
  const maxOffset = TOTAL_RAIL_LENGTH_KM - visibleWidth;
  const actualOffset = Math.max(0, Math.min(maxOffset, (panOffset.value / 100) * TOTAL_RAIL_LENGTH_KM));

  return {
    startKm: actualOffset,
    endKm: actualOffset + visibleWidth,
    visibleWidth
  };
});

const railwaySegments = computed(() => {
  const segments = [];
  const { startKm: viewStartKm, endKm: viewEndKm } = visibleRange.value;

  // Группируем все сегменты по километрам (может быть несколько записей на один км)
  const statusMap = new Map();
  props.statusSegments.forEach(segment => {
    const startKm = Math.floor(segment.StartKm || 0);
    const finishKm = Math.floor(segment.FinishKm || 0);

    for (let km = startKm; km <= finishKm; km++) {
      if (!statusMap.has(km)) {
        statusMap.set(km, []);
      }
      statusMap.get(km).push(segment);
    }
  });

  const startKmFloor = Math.floor(viewStartKm);
  const endKmCeil = Math.ceil(viewEndKm);

  for (let km = startKmFloor; km <= endKmCeil && km <= TOTAL_RAIL_LENGTH_KM; km++) {
    const segmentStart = Math.max(km, viewStartKm);
    const segmentEnd = Math.min(km + 1, viewEndKm);

    if (segmentEnd <= segmentStart) continue;

    const startPercent = ((segmentStart - viewStartKm) / (viewEndKm - viewStartKm)) * 100;
    const endPercent = ((segmentEnd - viewStartKm) / (viewEndKm - viewStartKm)) * 100;
    const totalWidth = endPercent - startPercent;

    const widthPercent = totalWidth * 0.95;

    let statusDataArray = statusMap.get(km) || [];

    if (statusDataArray.length === 0) {
      // Нет данных для этого километра
      segments.push({
        km,
        startPercent,
        widthPercent,
        color: '#cbd5e1',
        paramsLimits: [],
        statuses: [],
        statusTypes: [],
      });
      continue;
    }

    // Фильтруем данные по выбранным легендам
    if (selectedLegends.value.length > 0) {
      statusDataArray = statusDataArray.filter(segment => {
        const statusType = getSegmentStatusType(segment.ParamsLimit, segment.skewType);
        return statusType !== null && selectedLegends.value.includes(statusType);
      });

      // Если после фильтрации не осталось подходящих сегментов, пропускаем этот километр
      if (statusDataArray.length === 0) {
        continue;
      }
    }

    // Собираем все типы статусов для этого километра (уже отфильтрованные)
    const statusTypes = statusDataArray.map(s => getSegmentStatusType(s.ParamsLimit, s.skewType)).filter(t => t !== null);
    const uniqueStatusTypes = [...new Set(statusTypes)];

    // Определяем цвет: если есть несколько типов, показываем приоритетный
    let color = '#cbd5e1';
    if (statusDataArray.length > 0) {
      if (props.mode === 'skew') {
        // Для перекосов: если несколько типов, показываем градиент
        if (uniqueStatusTypes.length > 1) {
          const colors = uniqueStatusTypes.map(type => getSegmentColor(null, type));
          const step = 100 / colors.length;
          const gradientStops = colors.map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`).join(', ');
          color = `linear-gradient(90deg, ${gradientStops})`;
        } else {
          // Один тип перекоса
          color = getSegmentColor(null, statusDataArray[0].skewType);
        }
      } else if (props.mode === 'width') {
        // Для ширины: если есть и сужение и уширение, показываем градиент или полоски
        const hasNarrowing = statusDataArray.some(s => s.ParamsLimit < 1516);
        const hasWidening = statusDataArray.some(s => s.ParamsLimit > 1538);

        if (hasNarrowing && hasWidening) {
          // Смешанный случай - используем градиент синего и фиолетового
          color = 'linear-gradient(90deg, #3b82f6 50%, #a855f7 50%)';
        } else if (hasNarrowing) {
          color = getSegmentColor(statusDataArray.find(s => s.ParamsLimit < 1516).ParamsLimit);
        } else if (hasWidening) {
          color = getSegmentColor(statusDataArray.find(s => s.ParamsLimit > 1538).ParamsLimit);
        }
      } else {
        // Для оценки состояния: берём худший балл
        const worstSegment = statusDataArray.reduce((worst, current) =>
          current.ParamsLimit > worst.ParamsLimit ? current : worst
        );
        color = getSegmentColor(worstSegment.ParamsLimit);
      }
    }

    // Собираем данные для тултипа
    let paramsLimits, statuses, hasMultiple;

    if (props.mode === 'skew') {
      // В режиме перекосов показываем все уникальные значения по типам
      const allParamsLimits = statusDataArray.map(s => s.ParamsLimit);
      const uniqueParamsLimits = [...new Set(allParamsLimits)];

      const allStatuses = statusDataArray.map(s => getSegmentStatus(s.ParamsLimit, s.skewType));
      const uniqueStatuses = [...new Set(allStatuses)];

      paramsLimits = uniqueParamsLimits;
      statuses = uniqueStatuses;
      hasMultiple = uniqueParamsLimits.length > 1 || uniqueStatuses.length > 1;
    } else if (props.mode === 'width') {
      // В режиме ширины показываем все уникальные значения
      const allParamsLimits = statusDataArray.map(s => s.ParamsLimit);
      const uniqueParamsLimits = [...new Set(allParamsLimits)];

      const allStatuses = statusDataArray.map(s => getSegmentStatus(s.ParamsLimit));
      const uniqueStatuses = [...new Set(allStatuses)];

      paramsLimits = uniqueParamsLimits;
      statuses = uniqueStatuses;
      hasMultiple = uniqueParamsLimits.length > 1 || uniqueStatuses.length > 1;
    } else {
      // В режиме оценки показываем только худшее значение
      const worstSegment = statusDataArray.reduce((worst, current) =>
        current.ParamsLimit > worst.ParamsLimit ? current : worst
      );

      paramsLimits = [worstSegment.ParamsLimit];
      statuses = [getSegmentStatus(worstSegment.ParamsLimit)];
      hasMultiple = false;
    }

    segments.push({
      km,
      startPercent,
      widthPercent,
      color,
      paramsLimits,
      statuses,
      statusTypes: uniqueStatusTypes,
      hasMultiple,
    });
  }

  return segments;
});

const statusStats = computed(() => {
  if (props.mode === 'skew') {
    // Статистика для режима перекосов
    const stats = {
      level: 0,
      skew: 0,
      subsidence: 0,
      planDeviation: 0,
      totalScore: 0,
      count: 0,
    };

    const { startKm: viewStartKm, endKm: viewEndKm } = visibleRange.value;

    props.statusSegments.forEach(segment => {
      const segStartKm = segment.StartKm || 0;

      if (segStartKm >= viewStartKm && segStartKm < viewEndKm) {
        if (segment.ParamsLimit !== undefined && segment.ParamsLimit !== null) {
          stats.count++;
          stats.totalScore += segment.ParamsLimit;

          if (segment.skewType === 'level') {
            stats.level++;
          } else if (segment.skewType === 'skew') {
            stats.skew++;
          } else if (segment.skewType === 'subsidence') {
            stats.subsidence++;
          } else if (segment.skewType === 'planDeviation') {
            stats.planDeviation++;
          }
        }
      }
    });

    return stats;
  } else if (props.mode === 'width') {
    // Статистика для режима ширины колеи
    const stats = {
      narrowing: 0,
      widening: 0,
      totalScore: 0,
      count: 0,
    };

    const { startKm: viewStartKm, endKm: viewEndKm } = visibleRange.value;

    props.statusSegments.forEach(segment => {
      const segStartKm = segment.StartKm || 0;

      if (segStartKm >= viewStartKm && segStartKm < viewEndKm) {
        if (segment.ParamsLimit !== undefined && segment.ParamsLimit !== null) {
          stats.count++;
          stats.totalScore += segment.ParamsLimit;

          if (segment.ParamsLimit < 1516) {
            stats.narrowing++;
          } else if (segment.ParamsLimit > 1538) {
            stats.widening++;
          }
        }
      }
    });

    return stats;
  } else {
    // Статистика для режима оценки состояния
    const stats = {
      excellent: 0,
      good: 0,
      satisfactory: 0,
      poor: 0,
      totalScore: 0,
      count: 0,
    };

    const { startKm: viewStartKm, endKm: viewEndKm } = visibleRange.value;

    props.statusSegments.forEach(segment => {
      const segStartKm = segment.StartKm || 0;

      if (segStartKm >= viewStartKm && segStartKm < viewEndKm) {
        if (segment.ParamsLimit !== undefined && segment.ParamsLimit !== null) {
          stats.count++;
          stats.totalScore += segment.ParamsLimit;

          if (segment.ParamsLimit <= 25) {
            stats.excellent++;
          } else if (segment.ParamsLimit <= 80) {
            stats.good++;
          } else if (segment.ParamsLimit <= 180) {
            stats.satisfactory++;
          } else {
            stats.poor++;
          }
        }
      }
    });

    return stats;
  }
});

const averageScore = computed(() => {
  if (statusStats.value.count === 0) return 0;
  return Math.round(statusStats.value.totalScore / statusStats.value.count);
});

const edgeStations = computed(() => {
  const { startKm, endKm } = visibleRange.value;

  const allStations = [
    { km: 0, name: 'Станция Шар' },
    ...props.intermediateStations,
    { km: TOTAL_RAIL_LENGTH_KM, name: 'Станция НУК' }
  ];

  let startStation = allStations[0];
  let endStation = allStations[allStations.length - 1];

  for (let i = 0; i < allStations.length; i++) {
    if (allStations[i].km <= startKm) {
      startStation = allStations[i];
    }
    if (allStations[i].km >= endKm) {
      endStation = allStations[i];
      break;
    }
  }

  return { startStation, endStation };
});

const visibleStations = computed(() => {
  const { startKm, endKm, visibleWidth } = visibleRange.value;

  return props.intermediateStations
    .filter(station => {
      const stationKm = station.km || 0;
      return stationKm >= startKm && stationKm <= endKm;
    })
    .map(station => {
      const stationKm = station.km || 0;
      const position = ((stationKm - startKm) / visibleWidth) * 100;
      return {
        ...station,
        position: `${position}%`
      };
    });
});

const visibleStationsWithLabels = computed(() => {
  return visibleStations.value.map(station => ({
    ...station,
    kmLabel: formatStationCoords(station.km)
  }));
});

const distanceLabels = computed(() => {
  const { startKm, endKm, visibleWidth } = visibleRange.value;
  const labels = [];

  let step;
  if (visibleWidth > 100) {
    step = 25;
  } else if (visibleWidth > 50) {
    step = 10;
  } else if (visibleWidth > 20) {
    step = 5;
  } else if (visibleWidth > 10) {
    step = 2;
  } else {
    step = 1;
  }

  const firstLabel = Math.ceil(startKm / step) * step;

  for (let km = firstLabel; km <= endKm; km += step) {
    const position = ((km - startKm) / visibleWidth) * 100;
    if (position >= 0 && position <= 100) {
      labels.push({
        km,
        position: `${position}%`,
        label: `${Math.round(km)}км`
      });
    }
  }

  if (labels.length === 0 || labels[0].km > startKm + 0.5) {
    labels.unshift({
      km: startKm,
      position: '0%',
      label: `${Math.round(startKm)}км`
    });
  }

  // Добавляем метку конца только если она достаточно далеко от последней метки
  const minDistance = step * 0.7; // Минимальное расстояние между метками
  if (labels.length === 0 || labels[labels.length - 1].km < endKm - minDistance) {
    labels.push({
      km: endKm,
      position: '100%',
      label: `${Math.round(endKm)}км`
    });
  }

  return labels;
});

const handleWheel = (event) => {
  event.preventDefault();

  const delta = -Math.sign(event.deltaY);
  const newZoom = zoomLevel.value + delta * ZOOM_SPEED * zoomLevel.value;

  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

  if (clampedZoom !== zoomLevel.value) {
    const trackRef = trackComponent.value?.railwayTrackRef;
    if (!trackRef) return;

    const rect = trackRef.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mousePercent = mouseX / rect.width;

    const oldVisibleWidth = TOTAL_RAIL_LENGTH_KM / zoomLevel.value;
    const newVisibleWidth = TOTAL_RAIL_LENGTH_KM / clampedZoom;

    const currentStartKm = (panOffset.value / 100) * TOTAL_RAIL_LENGTH_KM;
    const mouseKm = currentStartKm + oldVisibleWidth * mousePercent;

    const newStartKm = mouseKm - newVisibleWidth * mousePercent;
    const maxOffset = TOTAL_RAIL_LENGTH_KM - newVisibleWidth;
    const clampedStartKm = Math.max(0, Math.min(maxOffset, newStartKm));

    zoomLevel.value = clampedZoom;
    panOffset.value = (clampedStartKm / TOTAL_RAIL_LENGTH_KM) * 100;
  }
};

const handleMouseDown = (event) => {
  if (zoomLevel.value > MIN_ZOOM) {
    isDragging.value = true;
    dragStartX.value = event.clientX;
    dragStartOffset.value = panOffset.value;
    event.preventDefault();
  }
};

const handleMouseMove = (event) => {
  if (isDragging.value && trackComponent.value?.railwayTrackRef) {
    const rect = trackComponent.value.railwayTrackRef.getBoundingClientRect();
    const deltaX = event.clientX - dragStartX.value;
    const deltaPercent = -(deltaX / rect.width) * (100 / zoomLevel.value);

    const newOffset = dragStartOffset.value + deltaPercent;
    const maxOffset = ((TOTAL_RAIL_LENGTH_KM - visibleRange.value.visibleWidth) / TOTAL_RAIL_LENGTH_KM) * 100;

    panOffset.value = Math.max(0, Math.min(maxOffset, newOffset));
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
};

onMounted(() => {
  if (railwayContainer.value) {
    railwayContainer.value.addEventListener('wheel', handleWheel, { passive: false });
  }
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
  if (railwayContainer.value) {
    railwayContainer.value.removeEventListener('wheel', handleWheel);
  }
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});
</script>

<style scoped>
.railway-section-wrapper {
  position: relative;
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  margin-bottom: 32px;
}

.railway-section {
  position: relative;
}

.railway-section.loading {
  pointer-events: none;
  opacity: 0.6;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  gap: 12px;
  font-size: 14px;
  color: #4a5568;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3182ce;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.railway-container {
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .railway-section {
    padding: 24px;
  }
}

@media (max-width: 480px) {
  .railway-section {
    padding: 20px 16px;
  }
}
</style>
