<template>
  <div class="heatmap-container">
    <div class="heatmap-header">
      <h2>Состояние пути</h2>
      <div class="month-selector">
        <n-select
          v-model:value="selectedMonthValue"
          :options="monthOptions"
          size="small"
          style="width: 180px"
          @update:value="handleMonthChange"
        />
      </div>
    </div>
    <div ref="chartRef" class="heatmap-chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';
import { NSelect } from 'naive-ui';

const chartRef = ref(null);
let chart = null;
const selectedDay = ref(null); // Выбранный день
const selectedKm = ref(null); // Выбранный километр

// Генерируем опции для выбора месяца
const generateMonthOptions = () => {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const options = [];

  // Генерируем последние 12 месяцев
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentYear, currentDate.getMonth() - i, 1);
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    options.push({
      label: `${months[monthIndex]} ${year}`,
      value: `${year}-${monthIndex}`
    });
  }

  return options;
};

const monthOptions = ref(generateMonthOptions());
const selectedMonthValue = ref(monthOptions.value[0].value);

// Генерация тестовых данных
const generateTestData = (year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data = [];

  // Генерируем данные: [км, день, значение состояния]
  for (let km = 1; km <= 151; km++) {
    for (let day = 1; day <= daysInMonth; day++) {
      // Генерируем случайное состояние (0-4):
      // 0 - отлично, 1 - хорошо, 2 - удовлетворительно, 3 - плохо, 4 - критично
      const value = Math.floor(Math.random() * 5);
      data.push([km - 1, day - 1, value]);
    }
  }

  return data;
};

const getDaysArray = (year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
};

const getKmArray = () => {
  return Array.from({ length: 151 }, (_, i) => `${i + 1}`);
};

const initChart = () => {
  if (!chartRef.value) return;

  // Уничтожаем предыдущий экземпляр если есть
  if (chart) {
    chart.dispose();
  }

  chart = echarts.init(chartRef.value);

  const [year, month] = selectedMonthValue.value.split('-').map(Number);

  const days = getDaysArray(year, month);
  const kilometers = getKmArray();
  const rawData = generateTestData(year, month);

  // Применяем затемнение если выбран день или километр
  const data = rawData.map(item => {
    const [kmIdx, dayIdx, value] = item;
    const daySelected = selectedDay.value !== null;
    const kmSelected = selectedKm.value !== null;

    // Если выбран и день и километр - показываем только пересечение
    if (daySelected && kmSelected) {
      if (dayIdx !== selectedDay.value || kmIdx !== selectedKm.value) {
        return {
          value: [kmIdx, dayIdx, value],
          itemStyle: {
            opacity: 0.2
          },
          tooltip: {
            show: false
          }
        };
      }
    }
    // Если выбран только день - затемняем остальные дни
    else if (daySelected && dayIdx !== selectedDay.value) {
      return {
        value: [kmIdx, dayIdx, value],
        itemStyle: {
          opacity: 0.2
        },
        tooltip: {
          show: false
        }
      };
    }
    // Если выбран только километр - затемняем остальные километры
    else if (kmSelected && kmIdx !== selectedKm.value) {
      return {
        value: [kmIdx, dayIdx, value],
        itemStyle: {
          opacity: 0.2
        },
        tooltip: {
          show: false
        }
      };
    }
    return item;
  });

  const option = {
    tooltip: {
      position: 'top',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: '#1a202c',
        fontSize: 12
      },
      formatter: (params) => {
        const km = params.data[0] + 1;
        const day = parseInt(params.data[1]) + 1;
        const value = params.data[2];
        const states = ['Отлично', 'Хорошо', 'Удовлетворительно', 'Плохо', 'Критично'];
        return `<strong>Км ${km}</strong><br/>День: ${day}<br/>Статус: ${states[value]}`;
      }
    },
    grid: {
      left: 45,
      right: 75,
      top: 8,
      bottom: 80,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: kilometers,
      position: 'bottom',
      axisLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' }
      },
      axisTick: {
        show: false
      },
      splitArea: {
        show: false
      },
      axisLabel: {
        interval: 4,
        fontSize: 9,
        color: '#718096',
        margin: 6
      },
      triggerEvent: true // Включаем события на оси
    },
    yAxis: {
      type: 'category',
      data: days,
      position: 'left',
      inverse: true,
      axisLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' }
      },
      axisTick: {
        show: false
      },
      splitArea: {
        show: false
      },
      axisLabel: {
        interval: 0,
        fontSize: 8,
        color: '#718096',
        margin: 4,
        rotate: 0
      },
      triggerEvent: true // Включаем события на оси
    },
    visualMap: {
      min: 0,
      max: 4,
      calculable: false,
      orient: 'vertical',
      right: 10,
      top: 'center',
      itemWidth: 12,
      itemHeight: 70,
      itemGap: 8,
      inRange: {
        color: [
          '#10b981',
          '#84cc16',
          '#fbbf24',
          '#f97316',
          '#ef4444'
        ]
      },
      text: ['Критично', 'Отлично'],
      textGap: 15,
      textStyle: {
        color: '#64748b',
        fontSize: 10
      },
      borderWidth: 0
    },
    series: [
      {
        name: 'Состояние пути',
        type: 'heatmap',
        data: data,
        itemStyle: {
          borderWidth: 0.5,
          borderColor: '#f8f9fa',
          borderRadius: 1,
          opacity: 1
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 1,
            borderColor: '#1a202c'
          }
        },
        progressive: 1000,
        animation: false
      }
    ],
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100,
        bottom: 20,
        height: 16,
        showDataShadow: false,
        brushSelect: false,
        borderColor: '#e2e8f0',
        fillerColor: 'rgba(100, 116, 139, 0.1)',
        handleStyle: {
          color: '#64748b',
          borderWidth: 0
        },
        dataBackground: {
          lineStyle: { opacity: 0 },
          areaStyle: { opacity: 0 }
        },
        textStyle: {
          color: '#64748b',
          fontSize: 8
        }
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false
      }
    ]
  };

  chart.setOption(option);

  // Обработчик клика на подпись дня (ось Y) и километра (ось X)
  chart.on('click', (params) => {
    // Клик по оси Y (по числу дня)
    if (params.componentType === 'yAxis') {
      const clickedDay = params.value - 1; // value - это текст подписи, нужен индекс (начинается с 0)

      // Если кликнули на уже выбранный день - снимаем выделение
      if (selectedDay.value === clickedDay) {
        selectedDay.value = null;
      } else {
        selectedDay.value = clickedDay;
      }

      // Перерисовываем график
      initChart();
    }
    // Клик по оси X (по километру)
    else if (params.componentType === 'xAxis') {
      const clickedKm = params.value - 1; // value - это текст подписи, нужен индекс (начинается с 0)

      // Если кликнули на уже выбранный километр - снимаем выделение
      if (selectedKm.value === clickedKm) {
        selectedKm.value = null;
      } else {
        selectedKm.value = clickedKm;
      }

      // Перерисовываем график
      initChart();
    }
  });

  // Адаптивность
  const resizeObserver = new ResizeObserver(() => {
    chart?.resize();
  });

  if (chartRef.value) {
    resizeObserver.observe(chartRef.value);
  }

  return () => {
    resizeObserver.disconnect();
  };
};

const handleMonthChange = () => {
  selectedDay.value = null; // Сбрасываем выбранный день при смене месяца
  selectedKm.value = null; // Сбрасываем выбранный километр при смене месяца
  initChart();
};

onMounted(() => {
  initChart();
  window.addEventListener('resize', () => chart?.resize());
});

onUnmounted(() => {
  window.removeEventListener('resize', () => chart?.resize());
  if (chart) {
    chart.dispose();
    chart = null;
  }
});

watch(() => selectedMonthValue.value, () => {
  initChart();
});
</script>

<style scoped>
.heatmap-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.heatmap-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #1a202c;
  letter-spacing: -0.01em;
}

.heatmap-chart {
  height: 420px;
  width: 100%;
}
</style>
