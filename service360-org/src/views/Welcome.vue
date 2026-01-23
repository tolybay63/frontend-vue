<template>
  <div class="welcome-page">
    <div class="welcome-header">
      <h1 class="welcome-title">Добро пожаловать в Service360 Organization</h1>
      <p class="welcome-subtitle">Система управления организационной структурой и ресурсами</p>
    </div>

    <div class="quick-access-section">
      <h2 class="section-title">Быстрый доступ</h2>
      <div class="cards-grid">
        <QuickAccessCard
          v-for="card in filteredCards"
          :key="card.path"
          :icon="card.icon"
          :title="card.title"
          :description="card.description"
          :path="card.path"
          @click="navigateTo(card.path)"
        />
      </div>
    </div>

    <div class="info-grid">
      <div class="widget-card info-card">
        <div class="info-icon">
          <UiIcon name="Users" />
        </div>
        <div class="info-content">
          <h3>Управление персоналом</h3>
          <p>Ведите учет сотрудников и организационной структуры компании</p>
        </div>
      </div>

      <div class="widget-card info-card">
        <div class="info-icon">
          <UiIcon name="Package" />
        </div>
        <div class="info-content">
          <h3>Объекты и ресурсы</h3>
          <p>Управляйте обслуживаемыми объектами, материалами и оборудованием</p>
        </div>
      </div>

      <div class="widget-card info-card">
        <div class="info-icon">
          <UiIcon name="MapPin" />
        </div>
        <div class="info-content">
          <h3>Инфраструктура</h3>
          <p>Контролируйте участки, перегоны и раздельные пункты</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissions } from '@/shared/api/auth/usePermissions'
import QuickAccessCard from '@/features/welcome/QuickAccessCard.vue'
import UiIcon from '@/shared/ui/UiIcon.vue'

const router = useRouter()
const { hasPermission } = usePermissions()

const allCards = [
  {
    icon: 'Package',
    title: 'Обслуживаемые объекты',
    description: 'Управление объектами обслуживания',
    path: '/objects',
    permission: 'obj'
  },
  {
    icon: 'MapPin',
    title: 'Участки',
    description: 'Участки железнодорожного пути',
    path: '/sections',
    permission: 'sect'
  },
  {
    icon: 'Navigation',
    title: 'Раздельные пункты',
    description: 'Станции и раздельные пункты',
    path: '/stations',
    permission: 'stat'
  },
  {
    icon: 'Truck',
    title: 'Перегоны',
    description: 'Перегоны между станциями',
    path: '/stages',
    permission: 'stag'
  },
  {
    icon: 'Boxes',
    title: 'Материалы',
    description: 'Справочник материалов',
    path: '/resources/materials',
    permission: 'mat'
  },
  {
    icon: 'Wrench',
    title: 'Инструменты',
    description: 'Управление инструментами',
    path: '/resources/tools',
    permission: 'tool'
  },
  {
    icon: 'Drill',
    title: 'Техника',
    description: 'Оборудование и техника',
    path: '/resources/equipment',
    permission: 'equ'
  },
  {
    icon: 'Briefcase',
    title: 'Услуги',
    description: 'Услуги сторонних организаций',
    path: '/resources/thirdparty-services',
    permission: 'tps'
  },
  {
    icon: 'FolderTree',
    title: 'Организация',
    description: 'Организационная структура',
    path: '/organization',
    permission: 'org'
  },
  {
    icon: 'Users',
    title: 'Сотрудники',
    description: 'Управление персоналом',
    path: '/personnel',
    permission: 'team'
  },
  {
    icon: 'Users',
    title: 'Клиенты',
    description: 'Управление клиентами',
    path: '/clients',
    permission: 'cl'
  }
]

const filteredCards = computed(() => {
  return allCards.filter(card => {
    return !card.permission || hasPermission(card.permission)
  })
})

const navigateTo = (path) => {
  router.push(path)
}
</script>

<style scoped>
.welcome-page {
  padding: 24px;
  background: #f7fafc;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: system-ui;
}

.welcome-header {
  text-align: center;
  margin-bottom: 40px;
}

.welcome-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 15px;
  color: #718096;
}

.quick-access-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 20px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (min-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 32px;
}

.widget-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  max-width: 100%;
}

.info-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  background: transparent;
  border: 1px solid #e2e8f0;
  box-shadow: none;
  cursor: default;
}

.info-icon {
  width: 48px;
  height: 48px;
  background: transparent;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #718096;
}

.info-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.info-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 6px;
}

.info-content p {
  font-size: 13px;
  color: #718096;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .welcome-page {
    padding: 16px;
  }

  .welcome-header {
    margin-bottom: 24px;
  }

  .welcome-title {
    font-size: 22px;
  }

  .welcome-subtitle {
    font-size: 14px;
  }

  .cards-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 24px;
  }

  .widget-card {
    padding: 16px;
  }

  .section-title {
    font-size: 18px;
    margin-bottom: 16px;
  }
}
</style>
