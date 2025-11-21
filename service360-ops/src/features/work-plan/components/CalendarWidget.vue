<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <h2 class="calendar-title">Календарь работ</h2>
      <div class="month-navigation">
        <button @click="prevMonth" class="nav-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span class="current-month">
          {{ monthNames[currentDate.getMonth()] }} {{ currentDate.getFullYear() }}
        </span>
        <button @click="nextMonth" class="nav-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <div class="calendar-grid">
      <div class="weekdays">
        <div 
          v-for="(day, index) in weekDays" 
          :key="day" 
          :class="['weekday', { 'weekend-label': index >= 5 }]"
        >
          {{ day }}
        </div>
      </div>
      <div class="days-grid">
        <div 
          v-for="(day, index) in calendarDays" 
          :key="index"
          :class="['calendar-day', { 'empty': !day }]"
        >
          <div 
            v-if="day" @click="selectDay(day.number)"
            :class="['day-number', { 
              'today': day.isToday, 
              'weekend': day.isWeekend,
              'selected': day.isSelected
            }]"
          >
            {{ day.number }}
            <div 
              v-if="day.dotColor" 
              class="event-dot" 
              :style="{ backgroundColor: day.dotColor }"
            ></div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { loadWorkPlanForKpi } from '@/shared/api/dashboard/dashboardApi';

const props = defineProps({
  selectedFarmId: [Number, null],
});

const currentDate = ref(new Date());
const selectedDate = ref(new Date());
const workPlanEvents = ref({});

const emit = defineEmits(['date-selected']);

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const colors = {
  blue: '#3B82F6',
};

const formatDateToString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fetchWorkPlanForMonth = async (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const periodTypeId = 11;

  try {
    const records = await loadWorkPlanForKpi(
      formatDateToString(firstDayOfMonth),
      periodTypeId,
      props.selectedFarmId
    );
    
    const events = {};
    records.forEach(record => {
      const date = record.PlanDateEnd.split('T')[0];
      if (!events[date]) {
        events[date] = [];
      }
      events[date].push({
        type: 'blue',
        title: record.fullNameWork,
        time: '' 
      });
    });
    workPlanEvents.value = events;
  } catch (error) {
    console.error("Ошибка при загрузке плана работ для календаря:", error);
    workPlanEvents.value = {};
  }
};

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  const days = [];

  for (let i = 0; i < adjustedStartDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const event = workPlanEvents.value[dateStr];
    const dotColor = event && event.length > 0 ? colors[event[0].type] : null;
    const today = new Date();
    const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
    const dayOfWeek = (adjustedStartDay + day - 1) % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const isSelected = selectedDate.value &&
      year === selectedDate.value.getFullYear() &&
      month === selectedDate.value.getMonth() &&
      day === selectedDate.value.getDate();

    days.push({
      number: day,
      dotColor,
      isToday,
      isWeekend,
      isSelected
    });
  }

  return days;
});

const prevMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1
  );
};

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1
  );
};

const selectDay = (dayNumber) => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  selectedDate.value = new Date(year, month, dayNumber);
  emit('date-selected', formatDateToString(selectedDate.value));
};

onMounted(() => {
  fetchWorkPlanForMonth(currentDate.value);
  emit('date-selected', formatDateToString(selectedDate.value));
});

watch(currentDate, (newDate) => {
  fetchWorkPlanForMonth(newDate);
});

watch(() => props.selectedFarmId, () => {
  fetchWorkPlanForMonth(currentDate.value);
});
</script>

<style scoped>
.calendar-container {
  max-width: 800px;
  background: white;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  border-radius: 8px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 34px;
  margin-top: 20px;
}

.calendar-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.month-navigation {
  display: flex;
  align-items: center;
}

.nav-button {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.nav-button:hover {
  color: #000;
}

.current-month {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  min-width: 140px;
  text-align: center;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  padding: 8px 0;
}

.weekday.weekend-label {
  color: #666;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.calendar-day.empty {
  pointer-events: none;
}

.day-number {  
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 15px;
  font-weight: 400;
  color: #1a1a1a;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
}

.day-number:hover {
  background-color: #f5f5f5;
}

.day-number.weekend {
  color: #1a1a1a;
}

.day-number.today {
  background-color: #E2E8F0;
  color: #1a1a1a;
  font-weight: 600;
}

.day-number.selected {
  background-color: #3B82F6;
  color: white;
  font-weight: 600;
}

.day-number.selected:hover {
  background-color: #2563EB;
}

.event-dot {
  position: absolute;
  bottom: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

@media (max-width: 480px) {
  .calendar-container {
    padding: 16px;
  }
}
</style>