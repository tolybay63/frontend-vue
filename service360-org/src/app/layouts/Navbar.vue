<template>
  <header class="navbar">
    <div class="navbar-left">
      <button class="hamburger-btn" @click="sidebar.toggleMobile">
        <UiIcon name="Menu" class="icon" />
      </button>
      <SearchBox v-if="!isMobile" :collapsed="collapsedSearch" />
    </div>

    <WeatherAndDate
      :weather-temp="weatherTemp"
      :weather-icon-name="weatherIconName"
      :weather-icon-color="weatherIconColor"
      :current-date="currentDate"
    />

    <div class="navbar-right">
      <!-- <div class="lang-select" @click="toggleLangMenu">
        {{ currentLang }}
        <UiIcon name="ChevronDown" class="icon" />
        <div v-if="langMenuOpen" class="lang-dropdown">
          <div
            v-for="lang in languages"
            :key="lang"
            class="lang-item"
            @click.stop="setLanguage(lang)"
          >
            {{ lang }}
          </div>
        </div>
      </div>

      <button class="notif-btn">
        <UiIcon name="Bell" class="icon" />
      </button> -->

      <UserAvatar :initials="'ОГ'" />
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import UiIcon from '@/shared/ui/UiIcon.vue'
import SearchBox from '@/shared/ui/SearchBox.vue'
import UserAvatar from '@/shared/ui/UserAvatar.vue'
import WeatherAndDate from '@/shared/ui/WeatherAndDate.vue'
import { useSidebarStore } from '@/app/stores/sidebar'


const collapsedSearch = ref(false)
const isMobile = ref(false)
const currentLang = ref(localStorage.getItem('lang') || 'РУС')
const languages = ['РУС', 'ҚАЗ', 'ENG']
const langMenuOpen = ref(false)
const sidebar = useSidebarStore()

// Погода
const API_KEY = 'b68cfdf8a6b6640730e7fec49b793661'
const ALMATY_TIMEZONE = 'Asia/Almaty'
const UST_KAMENOGORSK_CITY_ID = '1520316'

const weatherTemp = ref('Загрузка...')
const weatherIconName = ref('Sun')
const weatherIconColor = ref('#f6ad55')
const currentDate = ref('Загрузка...')

const mapOpenWeatherIcon = (iconCode) => {
  const map = {
    '01d': { name: 'Sun', color: '#f6ad55' },
    '01n': { name: 'Moon', color: '#63b3ed' },
    '02d': { name: 'CloudSun', color: '#ecc94b' },
    '02n': { name: 'CloudMoon', color: '#a0aec0' },
    '03d': { name: 'Cloud', color: '#718096' },
    '03n': { name: 'Cloud', color: '#718096' },
    '04d': { name: 'CloudDrizzle', color: '#4a5568' },
    '04n': { name: 'CloudDrizzle', color: '#4a5568' },
    '09d': { name: 'CloudRain', color: '#63b3ed' },
    '09n': { name: 'CloudRain', color: '#63b3ed' },
    '10d': { name: 'CloudRain', color: '#63b3ed' },
    '10n': { name: 'CloudRain', color: '#63b3ed' },
    '11d': { name: 'CloudLightning', color: '#9f7aea' },
    '11n': { name: 'CloudLightning', color: '#9f7aea' },
    '13d': { name: 'CloudSnow', color: '#e2e8f0' },
    '13n': { name: 'CloudSnow', color: '#e2e8f0' },
    '50d': { name: 'Mist', color: '#a0aec0' },
    '50n': { name: 'Mist', color: '#a0aec0' },
  }
  return map[iconCode] || { name: 'Sun', color: '#f6ad55' }
}

const fetchWeather = async () => {
  if (!API_KEY) {
    weatherTemp.value = 'Нет API ключа'
    weatherIconName.value = 'AlertCircle'
    weatherIconColor.value = '#c53030'
    return
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?id=${UST_KAMENOGORSK_CITY_ID}&appid=${API_KEY}&units=metric&lang=ru`

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()

    const temp = Math.round(data.main.temp)
    const iconCode = data.weather[0].icon

    weatherTemp.value = `${temp}°C`
    const iconMapping = mapOpenWeatherIcon(iconCode)
    weatherIconName.value = iconMapping.name
    weatherIconColor.value = iconMapping.color
  } catch (error) {
    console.error("Ошибка при получении погоды:", error)
    weatherTemp.value = '—°C'
    weatherIconName.value = 'AlertCircle'
    weatherIconColor.value = '#c53030'
  }
}

const fetchAlmatyDate = () => {
  try {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: ALMATY_TIMEZONE,
    }
    const nowInAlmaty = new Date().toLocaleDateString('ru-RU', options)
    currentDate.value = nowInAlmaty
  } catch (error) {
    console.error("Ошибка при получении даты:", error)
    currentDate.value = 'Дата недоступна'
  }
}

const toggleLangMenu = () => {
  langMenuOpen.value = !langMenuOpen.value
}

const setLanguage = (lang) => {
  currentLang.value = lang
  localStorage.setItem('lang', lang)
  langMenuOpen.value = false
}

const handleResize = () => {
  isMobile.value = window.innerWidth < 768
  collapsedSearch.value = window.innerWidth < 992 && !isMobile.value // Пример логики для десктопа
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-select')) {
      langMenuOpen.value = false
    }
  })

  // Загружаем погоду и дату
  fetchWeather()
  fetchAlmatyDate()
})


onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', () => (langMenuOpen.value = false))
})
</script>


<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  height: 60px;
  min-height: 60px;
  max-height: 60px;
  box-sizing: border-box;
  flex-shrink: 0;
}


.navbar-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.hamburger-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #4a5568;
}

.hamburger-btn .icon {
  width: 24px;
  height: 24px;
}

.navbar > :nth-child(2) {
  margin-right: 32px;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}

.lang-select {
  font-family: 'SF Pro Text';
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #4a5568;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.lang-select .icon {
  width: 14px;
  height: 14px;
  margin-left: 4px;
  color: #4a5568;
}

.lang-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 60px;
}

.lang-item {
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  color: #4a5568;
}

.lang-item:hover {
  background: #edf2f7;
  color: #2b6cb0;
}

.notif-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-btn .icon {
  width: 20px;
  height: 20px;
  color: #4a5568;
  transition: color 0.2s;
}

.notif-btn:hover .icon {
  color: #2b6cb0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e6f0fb;
  color: #2b6cb0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 768px) {
  .hamburger-btn {
    display: block;
  }
}
</style>
