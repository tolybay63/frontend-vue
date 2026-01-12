import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Login from '@/views/Login.vue'
import WorkPlan from '@/views/WorkPlan.vue'
import Inspections from '@/views/Inspections.vue'
import FaultJournalPage from '@/views/FaultJournalPage.vue'
import ParameterLogPage from '@/views/ParameterLogPage.vue'
import Incidents from '@/views/Incidents.vue'
import WorkPlanForm from '@/views/WorkPlanForm.vue'
import ResourcePlanning from '@/views/ResourcePlanning.vue'
import ResourcePlanningForm from '@/views/ResourcePlanningForm.vue'
import ResourcePlanningEdit from '@/views/ResourcePlanningEdit.vue'
import WorkLog from '@/views/WorkLog.vue'
import WorkLogForm from '@/views/WorkLogForm.vue'
import HeatmapTest from '@/views/HeatmapTest.vue'
import TrackGaugeImport from '@/views/TrackGaugeImport.vue'
import { isAuthenticated } from '@/shared/api/auth/auth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/main',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/work-plan',
    name: 'WorkPlan',
    component: WorkPlan,
    meta: { requiresAuth: true }
  },
  {
    path: '/work-log',
    name: 'WorkLog',
    component: WorkLog,
    meta: { requiresAuth: true }
  },
  {
    path: '/work-log/record/:id',
    name: 'WorkLogForm',
    component: WorkLogForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/resource-planning',
    name: 'ResourcePlanning',
    component: ResourcePlanning,
    meta: { requiresAuth: true }
  },
  {
    path: '/resource-planning/record',
    name: 'ResourcePlanningRecord',
    component: ResourcePlanningForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/resource-planning/edit/:id',
    name: 'ResourcePlanningEdit',
    component: ResourcePlanningEdit,
    meta: { requiresAuth: true }
  },
  {
    path: '/inspections',
    name: 'Inspections',
    component: Inspections,
    meta: { requiresAuth: true }
  },
  {
    path: '/parameters',
    name: 'Paramaters',
    component: ParameterLogPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/defects',
    name: 'Defects',
    component: FaultJournalPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/inspections/record',
    name: 'InspectionRecord',
    component: WorkPlanForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/incidents',
    name: 'Incidents',
    component: Incidents,
    meta: { requiresAuth: true }
  },
  {
    path: '/heatmap-test',
    name: 'HeatmapTest',
    component: HeatmapTest,
    meta: { requiresAuth: true }
  },
  {
    path: '/track-gauge-import',
    name: 'TrackGaugeImport',
    component: TrackGaugeImport,
    meta: { requiresAuth: true }
  },
];


const router = createRouter({
  history: createWebHistory('/dtj/ops/'),
  routes
})

// Navigation Guard - защита роутов (ВРЕМЕННО ОТКЛЮЧЕНО)
router.beforeEach((to, from, next) => {
  // ВРЕМЕННО: пропускаем все запросы без проверки авторизации
  next()

  /* ЗАКОММЕНТИРОВАНО ДЛЯ РАЗРАБОТКИ
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const authenticated = isAuthenticated()

  if (requiresAuth && !authenticated) {
    // Пытается зайти на защищенную страницу без авторизации
    next('/login')
  } else if (to.path === '/login' && authenticated) {
    // Уже авторизован, пытается зайти на логин - редирект на dashboard
    next('/main')
  } else {
    // Всё ок, пропускаем
    next()
  }
  */
})

export default router
