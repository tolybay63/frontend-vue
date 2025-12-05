import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

const baseRestrictedPatterns = [
  {
    group: ['@entities/*/api/*', '@entities/*/model/*', '@entities/*/ui/*'],
    message: 'Импортируйте сущности через @entities/<module> barrel',
  },
  {
    group: ['@features/*/api/*', '@features/*/model/*', '@features/*/ui/*'],
    message: 'Импортируйте фичи через @features/<feature>',
  },
  {
    group: ['@shared/api/*/*', '@shared/api/*/**', '@shared/lib/*/*', '@shared/lib/*/**'],
    message: 'Используйте публичные модули @shared/api и @shared/lib',
  },
]

const pageRestrictedPatterns = [
  ...baseRestrictedPatterns,
  {
    group: ['@app/*', '@pages/*', '@widgets/*', '@/stores/*'],
    message: 'Страницы используют только @features, @entities, @shared и @layouts',
  },
]

const featureRestrictedPatterns = [
  ...baseRestrictedPatterns,
  {
    group: ['@app/*', '@pages/*', '@layouts/*', '@widgets/*'],
    message: 'Фичи не должны зависеть от app/pages/layouts/widgets',
  },
]

const entityRestrictedPatterns = [
  ...baseRestrictedPatterns,
  {
    group: ['@features/*', '@pages/*', '@layouts/*', '@widgets/*', '@app/*', '@/stores/*'],
    message: 'Сущности зависят только от @shared',
  },
]


export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  
  {
    name: 'app/fsd-base',
    files: ['src/**/*.{ts,tsx,vue}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: baseRestrictedPatterns }],
    },
  },
  {
    name: 'app/fsd-pages',
    files: ['src/pages/**/*.{ts,tsx,vue}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: pageRestrictedPatterns }],
    },
  },
  {
    name: 'app/fsd-features',
    files: ['src/features/**/*.{ts,tsx,vue}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: featureRestrictedPatterns }],
    },
  },
  {
    name: 'app/fsd-entities',
    files: ['src/entities/**/*.{ts,tsx,vue}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: entityRestrictedPatterns }],
    },
  },
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },
  skipFormatting,
)
