<template>
  <section class="page">
    <h1>Данные</h1>

    <article class="step">
      <header class="step__header">
        <div class="step__badge">1</div>
        <div>
          <h2>Источник и параметры</h2>
          <p class="muted">
            Выберите источник данных и задайте параметры выборки. Сначала загрузите таблицу,
            чтобы перейти к следующему шагу.
          </p>
        </div>
        <div
          v-if="hasPlanData || (!isPivotSource && hasResultData)"
          class="step__status"
        >
          <span class="dot dot--success"></span>
          Данные загружены
        </div>
      </header>

      <div class="step__body">
        <div class="source-panel">
          <div class="source-panel__selector">
            <label class="field">
              <span class="field__label">Источники данных</span>
              <n-select
                v-model:value="dataSource"
                :options="sourceOptions"
                placeholder="Выберите или начните вводить источник"
                filterable
                clearable
                class="combobox"
                :disabled="planLoading"
                size="large"
                @search="handleSourceSearch"
              >
                <template #action v-if="canCreateSourceFromSearch">
                  <div class="select-action" @mousedown.prevent @click="startCreatingSource(pendingNewSourceName)">
                    Создать источник «{{ pendingNewSourceName }}»
                  </div>
                </template>
              </n-select>
            </label>
            <p class="muted combobox__hint">
              Найдите существующий источник или введите новое имя, чтобы создать его.
            </p>
          </div>

          <div class="source-panel__actions">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  @click="executeCurrentSource"
                  :disabled="!canSendRequest || planLoading"
                  aria-label="Отправить запрос"
                >
                  <span class="icon icon-send" />
                </n-button>
              </template>
              {{ planLoading ? 'Выполняем запрос' : 'Отправить данные' }}
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  @click="toggleDetails"
                  :disabled="!canToggleDetails"
                  aria-label="Переключить детали"
                >
                  <span class="icon" :class="detailsIconClass" />
                </n-button>
              </template>
              {{ detailsTooltipLabel }}
            </n-tooltip>
          </div>
        </div>

        <div v-if="shouldShowDetails" class="source-panel__details">
          <div class="source-details-grid">
            <label class="field">
              <span class="field__label">Название источника</span>
              <n-input v-model:value="sourceDraft.name" placeholder="Например: План на ноябрь" size="large" />
            </label>
            <label class="field">
              <span class="field__label">URL</span>
              <n-input v-model:value="sourceDraft.url" placeholder="/dtj/api/plan" size="large" />
            </label>
            <label class="field">
              <span class="field__label">Метод</span>
              <n-select v-model:value="sourceDraft.httpMethod" :options="httpMethodOptions" size="large" />
            </label>
          </div>

          <label class="field">
            <span class="field__label">Метод API</span>
            <n-input v-model:value="rpcMethod" placeholder="data/loadPlan" size="large" />
            <span class="muted" v-if="!structuredBodyAvailable && !hasPrimitiveParams">
              Добавьте параметры в формате объекта в «Raw body», чтобы редактировать их по ключам.
            </span>
          </label>

          <div
            v-if="structuredBodyAvailable && parameterKeys.length"
            class="params-grid"
          >
            <label v-for="key in parameterKeys" :key="key" class="field">
              <span class="field__label">{{ key }}</span>
              <n-input v-model:value="bodyParams[key]" />
            </label>
          </div>
          <div
            v-else-if="hasPrimitiveParams"
            class="params-grid params-grid--compact"
          >
            <label v-for="(value, index) in primitiveParams" :key="`primitive-${index}`" class="field">
              <span class="field__label">params[{{ index }}]</span>
              <n-input v-model:value="primitiveParams[index]" />
            </label>
          </div>
          <p v-else class="muted">
            Добавьте параметры в «Raw body», чтобы редактировать их здесь.
          </p>

          <label class="field">
            <span class="field__label">Raw body</span>
            <n-input
              v-model:value="sourceDraft.rawBody"
              type="textarea"
              :autosize="{ minRows: 6, maxRows: 14 }"
              placeholder='{"method":"data/loadPlan","params":[{...}]}'
            />
            <span v-if="rawBodyError" class="error">{{ rawBodyError }}</span>
          </label>

          <div class="source-actions">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  @click="saveCurrentSource"
                  :disabled="!canSaveSource"
                  aria-label="Сохранить источник"
                >
                  <span class="icon icon-save" />
                </n-button>
              </template>
              Сохранить источник
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  @click="executeCurrentSource"
                  :disabled="!canSendRequest || planLoading"
                  aria-label="Отправить запрос"
                >
                  <span class="icon icon-send" />
                </n-button>
              </template>
              Отправить запрос
            </n-tooltip>
          </div>
        </div>

        <div class="step__info" v-if="shouldShowDetails">
          <p class="muted">
            {{ sourceDraft.httpMethod }} · {{ sourceDraft.url || 'URL не указан' }}
          </p>
          <p class="muted" v-if="structuredBodyAvailable">
            Метод API: <strong>{{ rpcMethod || 'не указан' }}</strong>
          </p>
          <p class="muted" v-if="hasPlanData">
            Загружено записей: <strong>{{ planRecords.length }}</strong>
          </p>
        </div>

        <p v-if="planError" class="error">{{ planError }}</p>
        <p v-else-if="planLoading" class="muted">Выполняем запрос...</p>

        <div v-if="hasResultData" class="result-tabs">
          <div class="tabs">
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeResultTab === 'json' }"
              @click="activeResultTab = 'json'"
            >
              JSON
            </button>
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeResultTab === 'preview' }"
              @click="activeResultTab = 'preview'"
            >
              Preview
            </button>
          </div>
          <div class="tabs__body">
            <pre v-if="activeResultTab === 'json'">{{ formattedResultJson }}</pre>
            <div v-else class="preview-table">
              <table v-if="previewColumns.length && previewRows.length" class="table-s360">
                <thead>
                  <tr>
                    <th v-for="column in previewColumns" :key="column.key">
                      {{ getFieldDisplayName(column) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in previewRows" :key="rowIndex">
                    <td v-for="column in previewColumns" :key="column.key">
                      {{ formatValue(row[column.key]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="muted">Нет данных для предпросмотра.</p>
            </div>
          </div>
        </div>
      </div>
    </article>

    <article
      v-if="isPivotSource"
      class="step"
      :class="{ 'step--disabled': !hasPlanData }"
    >
      <header class="step__header">
        <div class="step__badge">2</div>
        <div>
          <h2>Настройте сводную таблицу</h2>
          <p class="muted">
            Выберите поля для фильтров, строк и столбцов, задайте агрегации и сразу увидите результат ниже.
          </p>
        </div>
        <div class="step__header-actions">
          <div v-if="pivotReady" class="step__status">
            <span class="dot dot--success"></span>
            Таблица готова
          </div>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                quaternary
                circle
                size="large"
                @click="openDictionary"
                aria-label="Редактор словаря"
              >
                <span class="icon icon-dictionary" />
              </n-button>
            </template>
            Настроить словарь полей
          </n-tooltip>
        </div>
      </header>

      <div class="step__body">
        <p v-if="!hasPlanData" class="muted">
          Сначала загрузите данные плана, чтобы настроить сводную таблицу.
        </p>
        <template v-else>
          <section class="config-panel">
            <div class="config-block">
              <input v-model="configName" placeholder="Название конфигурации" />
              <button class="btn-success" type="button" @click="saveCurrentConfig">Сохранить конфигурацию</button>
            </div>
            <div class="config-block">
              <select v-model="selectedConfigId">
                <option value="">Выберите конфигурацию</option>
                <option v-for="cfg in savedConfigs" :key="cfg.id" :value="cfg.id">
                  {{ cfg.name }}
                </option>
              </select>
              <button
                class="btn-outline"
                type="button"
                @click="loadSelectedConfig"
                :disabled="!selectedConfigId"
              >
                Загрузить
              </button>
              <button
                class="btn-danger"
                type="button"
                @click="deleteSelectedConfig"
                :disabled="!selectedConfigId"
              >
                Удалить
              </button>
            </div>
          </section>

          <div class="pivot-layout">
            <section class="samples">
              <div class="step__subheader">
                <h3>Доступные поля</h3>
                <span class="muted">
                  Название, ключ и примеры реальных значений из загруженной таблицы
                </span>
              </div>
              <ul>
                <li v-for="field in planFields" :key="field.key">
                  <div class="field-main">
                    <strong>{{ getFieldDisplayName(field) }}</strong>
                    <span class="key-tag">{{ field.key }}</span>
                  </div>
                  <div class="field-meta">
                    <span>Тип: {{ field.type === 'number' ? 'Число' : 'Текст' }}</span>
                    <span>
                      Пример:
                      <code>{{ field.sample }}</code>
                    </span>
                  </div>
                  <div v-if="field.values.length" class="value-examples">
                    <span class="meta-label">Частые значения (до 20):</span>
                    <div class="chip-list">
                      <span
                        v-for="value in field.values"
                        :key="`${field.key}-${value || 'empty'}-example`"
                        class="chip"
                      >
                        {{ value || 'пусто' }}
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </section>

            <section class="pivot-grid">
              <div v-for="section in pivotSections" :key="section.key" class="pivot-section">
                <div class="pivot-title">{{ section.title }}</div>
                <div class="field-list">
                  <label
                    v-for="field in planFields"
                    :key="`${section.key}-${field.key}`"
                    class="field-option"
                  >
                    <input type="checkbox" :value="field.key" v-model="pivotConfig[section.key]" />
                    <span>{{ getFieldDisplayName(field) }}</span>
                  </label>
                </div>
                <div v-if="pivotConfig[section.key].length" class="selected-fields">
                  <div
                    v-for="(fieldKey, index) in pivotConfig[section.key]"
                    :key="`${section.key}-selected-${fieldKey}`"
                    class="selected-field"
                  >
                    <span>{{ getFieldDisplayNameByKey(fieldKey) }}</span>
                    <div class="selected-field__actions">
                      <button
                        class="btn-outline btn-xs"
                        type="button"
                        @click="moveField(section.key, index, -1)"
                        :disabled="index === 0"
                      >
                        ↑
                      </button>
                      <button
                        class="btn-outline btn-xs"
                        type="button"
                        @click="moveField(section.key, index, 1)"
                        :disabled="index === pivotConfig[section.key].length - 1"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section class="pivot-settings">
            <label>
              <input type="checkbox" v-model="pivotOptions.showRowTotals" />
              Показывать итоги по строкам
            </label>
            <label>
              <input type="checkbox" v-model="pivotOptions.showColumnTotals" />
              Показывать итоги по столбцам
            </label>
          </section>

          <section class="alias-panel" v-if="renamableFields.length">
            <h3>Переименовать заголовки</h3>
            <div class="alias-grid">
              <label v-for="field in renamableFields" :key="`alias-${field.key}`">
                <span>{{ field.displayLabel }}</span>
                <input v-model="headerOverrides[field.key]" placeholder="Введите название" />
              </label>
            </div>
          </section>

        <section class="metrics-panel">
            <header>
              <h3>Метрики сводной таблицы</h3>
              <button class="btn-outline" type="button" @click="addMetric">Добавить метрику</button>
            </header>
            <div v-if="!pivotMetrics.length" class="muted">
              Добавьте хотя бы одну метрику (поле + агрегат), чтобы увидеть расчёты.
            </div>
            <div class="metrics-list">
              <div v-for="metric in pivotMetrics" :key="metric.id" class="metric-row">
                <select v-model="metric.fieldKey">
                  <option disabled value="">Поле</option>
                  <option
                    v-for="field in planFields"
                    :key="`metric-${metric.id}-${field.key}`"
                    :value="field.key"
                  >
                    {{ field.label }}
                  </option>
                </select>
                <select v-model="metric.aggregator">
                  <option v-for="agg in aggregatorOptions" :key="agg.value" :value="agg.value">
                    {{ agg.label }}
                  </option>
                </select>
                <button
                  class="remove"
                  type="button"
                  @click="removeMetric(metric.id)"
                  :disabled="pivotMetrics.length === 1"
                >
                  ×
                </button>
              </div>
            </div>
          </section>

        <div v-if="selectedFilterFields.length" class="filters-panel">
          <h3>Значения фильтров</h3>
          <div class="filters-panel__actions">
            <span class="muted">Отметьте конкретные значения, чтобы сузить выборку.</span>
            <button
              class="btn-outline btn-sm"
              type="button"
              @click="resetFilterValues"
              :disabled="!hasSelectedFilterValues"
            >
              Сбросить значения
            </button>
          </div>
          <div class="filters-grid">
            <div v-for="field in selectedFilterFields" :key="field.key" class="filters-field">
              <div class="filter-title">{{ field.displayLabel }}</div>
              <MultiSelectDropdown
                v-model="filterValues[field.key]"
                :options="fieldValueOptions(field)"
                placeholder="Выберите значения"
              />
            </div>
          </div>
        </div>

          <div
            v-if="dimensionValueOptions.rows.length || dimensionValueOptions.columns.length"
            class="dimension-panel"
          >
            <div v-if="dimensionValueOptions.rows.length" class="dimension-group">
              <div class="dimension-title">Фильтр значений строк</div>
              <div class="dimension-fields">
                <div
                  v-for="field in dimensionValueOptions.rows"
                  :key="`row-values-${field.key}`"
                  class="dimension-field"
                >
                  <div class="dimension-field__title">{{ field.displayLabel }}</div>
                  <MultiSelectDropdown
                    v-model="dimensionValueFilters.rows[field.key]"
                    :options="fieldValueOptions(field)"
                    placeholder="Выберите значения"
                  />
                </div>
              </div>
            </div>

            <div v-if="dimensionValueOptions.columns.length" class="dimension-group">
              <div class="dimension-title">Фильтр значений столбцов</div>
              <div class="dimension-fields">
                <div
                  v-for="field in dimensionValueOptions.columns"
                  :key="`column-values-${field.key}`"
                  class="dimension-field"
                >
                  <div class="dimension-field__title">{{ field.displayLabel }}</div>
                  <MultiSelectDropdown
                    v-model="dimensionValueFilters.columns[field.key]"
                    :options="fieldValueOptions(field)"
                    placeholder="Выберите значения"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="pivotWarnings.length" class="warning">
            <p v-for="note in pivotWarnings" :key="note">{{ note }}</p>
          </div>

          <div v-else-if="pivotView && pivotView.rows.length" class="pivot-preview">
            <div class="step__subheader">
              <h3>Сводная таблица</h3>
              <span class="muted">Обновляется при изменении полей</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th :style="columnStyle('__rows__')">
                    <div class="th-content">
                      Строки
                      <span
                        class="resize-handle"
                        @mousedown.prevent="startColumnResize('__rows__', $event)"
                      ></span>
                    </div>
                  </th>
                  <th
                    v-for="column in pivotView.columns"
                    :key="column.key"
                    :style="columnStyle(column.key)"
                  >
                    <div class="th-content">
                      <div
                        v-if="column.levels?.length"
                        class="column-levels"
                      >
                        <span v-for="(level, idx) in column.levels" :key="`${column.key}-lvl-${idx}`">
                          {{ level.fieldLabel }}: {{ level.value }}
                        </span>
                      </div>
                      <div class="column-metric">{{ column.label }}</div>
                      <span
                        class="resize-handle"
                        @mousedown.prevent="startColumnResize(column.key, $event)"
                      ></span>
                    </div>
                  </th>
                  <th
                    v-for="total in pivotView.rowTotalHeaders"
                    :key="`row-total-${total.metricId}`"
                    v-if="pivotOptions.showRowTotals"
                  >
                    {{ total.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in tableRows" :key="row.key" :style="rowStyle(row.key)">
                  <td class="row-label">
                    <div class="row-tree" :style="{ paddingLeft: `${row.depth * 18}px` }">
                      <button
                        v-if="row.hasChildren"
                        class="row-toggle"
                        type="button"
                        @click="toggleRowCollapse(row.key)"
                      >
                        {{ isRowCollapsed(row.key) ? '+' : '−' }}
                      </button>
                      <div class="row-content">
                        <span class="row-field" v-if="row.fieldLabel">
                          {{ row.fieldLabel }}:
                        </span>
                        <span>{{ row.label }}</span>
                      </div>
                    </div>
                    <span
                      class="row-resize-handle"
                      @mousedown.prevent="startRowResize(row.key, $event)"
                    ></span>
                  </td>
                  <td v-for="cell in row.cells" :key="cell.key" class="cell">
                    {{ cell.display }}
                  </td>
                  <td
                    v-for="total in row.totals"
                    :key="`row-${row.key}-${total.metricId}`"
                    class="total"
                    v-if="pivotOptions.showRowTotals"
                  >
                    {{ total.display }}
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="pivotOptions.showColumnTotals || pivotOptions.showRowTotals">
                <tr>
                  <td v-if="pivotOptions.showColumnTotals">Итого по столбцам</td>
                  <td
                    v-for="column in pivotView.columns"
                    :key="`total-${column.key}`"
                    class="total"
                    v-if="pivotOptions.showColumnTotals"
                  >
                    {{ column.totalDisplay }}
                  </td>
                  <td
                    v-for="total in pivotView.rowTotalHeaders"
                    :key="`grand-${total.metricId}`"
                    class="grand-total"
                    v-if="pivotOptions.showRowTotals"
                  >
                    {{ pivotView.grandTotals[total.metricId] }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-else class="empty-state">
            <h4>Нет данных для этой комбинации полей</h4>
            <p>
              Проверьте выбранные значения фильтров и метрик. Если фильтры не нужны, очистите их —
              таблица построится по всем загруженным строкам.
            </p>
            <ul class="empty-state__tips">
              <li>Попробуйте выбрать другие поля в строках или столбцах.</li>
              <li>Очистите значения фильтров, чтобы вернуть все записи.</li>
              <li>Убедитесь, что в источнике есть данные за заданный период.</li>
            </ul>
            <div class="empty-state__meta">
              <span>Загружено строк: {{ planRecords.length }}</span>
              <span>После фильтрации: {{ filteredPlanRecords.length }}</span>
            </div>
            <button
              class="btn-outline btn-sm"
              type="button"
              @click="resetFilterValues"
              :disabled="!hasSelectedFilterValues"
            >
              Очистить значения фильтров
            </button>
          </div>
        </template>
      </div>
    </article>

    <article
      class="step"
      :class="{
        'step--disabled': isPivotSource ? !pivotReady : !hasResultData,
      }"
    >
      <header class="step__header">
        <div class="step__badge">3</div>
        <div>
          <h2>Визуализация и выдача</h2>
          <p class="muted">
            После настройки сводной таблицы выберите вид диаграммы или выгрузите результат.
          </p>
        </div>
      </header>

      <div class="step__body">
        <div class="viz-grid">
          <label class="field">
            <span class="field__label">Тип визуализации</span>
            <select v-model="vizType" :disabled="!canUseVizSettings">
              <option value="table">Таблица</option>
              <option value="bar">Столбчатая диаграмма</option>
              <option value="line">Линейная диаграмма</option>
              <option value="pie">Круговая диаграмма</option>
            </select>
          </label>
        </div>

        <div class="step__actions">
          <button
            class="btn-primary"
            type="button"
            @click="saveTemplate"
            :disabled="!canUseVizSettings"
          >
            Сохранить как шаблон
          </button>
          <button
            v-if="isPivotSource"
            class="btn-outline"
            type="button"
            @click="exportToCsv"
            :disabled="!pivotReady"
          >
            Выгрузить в Excel (CSV)
          </button>
          <button
            v-if="isPivotSource"
            class="btn-outline"
            type="button"
            @click="swapPivotAxes"
            :disabled="!pivotReady"
          >
            Поменять строки и столбцы
          </button>
        </div>

        <div v-if="showChart" class="chart-panel">
          <ReportChart
            :viz-type="vizType"
            :chart-data="chartConfig?.data"
            :chart-options="chartConfig?.options"
          />
        </div>

        <div v-if="!isPivotSource && hasResultData" class="result">
          <pre v-if="vizType === 'table'">{{ formattedResultJson }}</pre>
          <div v-else>Заглушка визуализации: {{ vizType }}</div>
        </div>
        <p v-else-if="!canUseVizSettings" class="muted">
          Завершите предыдущие шаги, чтобы выбрать визуализацию или экспорт.
        </p>
      </div>
    </article>
  </section>

  <n-modal
    v-model:show="showDictionaryModal"
    preset="card"
    title="Словарь полей"
    class="dictionary-modal"
  >
    <div class="dictionary-toolbar">
      <n-input
        v-model:value="dictionarySearch"
        placeholder="Поиск по ключу или названию"
        size="large"
        clearable
      />
      <n-select
        v-model:value="dictionaryGrouping"
        :options="dictionaryGroupOptions"
        size="large"
      />
    </div>
    <div v-if="dictionaryGroups.length" class="dictionary-groups">
      <section v-for="group in dictionaryGroups" :key="group.title" class="dictionary-group">
        <header class="dictionary-group__title">{{ group.title || 'Без группы' }}</header>
        <div class="dictionary-group__list">
          <div v-for="item in group.items" :key="item.key" class="dictionary-row">
            <div class="dictionary-row__meta">
              <div class="dictionary-row__key">{{ item.key }}</div>
              <div class="dictionary-row__hint">{{ item.sourceLabel }}</div>
            </div>
            <n-input
              :value="item.currentLabel"
              placeholder="Введите понятное название"
              @update:value="updateDictionaryLabel(item.key, $event)"
            />
          </div>
        </div>
      </section>
    </div>
    <p v-else class="muted">Поля появятся после загрузки данных.</p>
  </n-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { NButton, NTooltip, NSelect, NInput, NModal } from 'naive-ui'
import ReportChart from '@/components/ReportChart.vue'
import MultiSelectDropdown from '@/components/MultiSelectDropdown.vue'
import { sendDataSourceRequest } from '@/shared/api/dataSource'
import { useDataSourcesStore } from '@/shared/stores/dataSources'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import {
  buildPivotView,
  humanizeKey,
  normalizeValue,
  formatValue,
  formatNumber,
} from '@/shared/lib/pivotUtils'

const dataSourcesStore = useDataSourcesStore()
const fieldDictionaryStore = useFieldDictionaryStore()
const dataSources = computed(() => dataSourcesStore.sources)
const dataSource = ref('')
const vizType = ref('table')
const result = ref(null)
const isCreatingSource = ref(false)
const sourceSearch = ref('')
const pendingNewSourceName = ref('')
const EMPTY_BODY_TEMPLATE = JSON.stringify(
  {
    method: '',
    params: [{}],
  },
  null,
  2,
)
const HTTP_METHODS = ['POST', 'GET', 'PUT', 'PATCH']
const sourceDraft = reactive(createBlankSource())
const rawBodyError = ref('')
const structuredBodyAvailable = ref(false)
const rpcMethod = ref('')
const bodyParams = reactive({})
const bodyParamTypes = reactive({})
const primitiveParams = ref([])
const activeResultTab = ref('json')
const detailsVisible = ref(false)
const paramContainerType = ref('array')
const showDictionaryModal = ref(false)
const dictionaryGrouping = ref('alphabet')
const dictionarySearch = ref('')

const planRecords = ref([])
const planFields = ref([])
const planLoading = ref(false)
const planError = ref('')
const selectedSource = computed(
  () => dataSources.value.find((source) => source.id === dataSource.value) || null,
)
const sourceOptions = computed(() =>
  dataSources.value.map((source) => ({
    label: source.name,
    value: source.id,
  })),
)
const pivotSourceIds = computed(() =>
  dataSources.value.filter((source) => source.supportsPivot !== false).map((source) => source.id),
)
const isPivotSource = computed(() => {
  if (isCreatingSource.value) return true
  return pivotSourceIds.value.includes(dataSource.value)
})
const hasResultData = computed(() => {
  const value = result.value
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(value)
})
const hasPlanData = computed(() => isPivotSource.value && planFields.value.length > 0)
const hasSourceContext = computed(() => Boolean(selectedSource.value) || isCreatingSource.value)
const shouldShowDetails = computed(() => hasSourceContext.value && detailsVisible.value)
const canCreateSourceFromSearch = computed(() => Boolean(pendingNewSourceName.value))
const canSaveSource = computed(() => {
  if (!shouldShowDetails.value) return false
  const hasName = Boolean(sourceDraft.name?.trim())
  const hasUrl = Boolean(sourceDraft.url?.trim())
  const hasBody =
    sourceDraft.httpMethod === 'GET'
      ? true
      : Boolean(sourceDraft.rawBody?.trim()) && !rawBodyError.value
  return hasName && hasUrl && hasBody
})
const canSendRequest = computed(() => {
  const hasUrl = Boolean(sourceDraft.url?.trim())
  if (!hasUrl) return false
  if (sourceDraft.httpMethod === 'GET') {
    return !rawBodyError.value
  }
  return Boolean(sourceDraft.rawBody?.trim()) && !rawBodyError.value
})
const canToggleDetails = computed(() => hasSourceContext.value)
const parameterKeys = computed(() => Object.keys(bodyParams))
const hasPrimitiveParams = computed(() => primitiveParams.value.length > 0)
const detailsTooltipLabel = computed(() =>
  shouldShowDetails.value ? 'Скрыть детали' : 'Показать детали',
)
const detailsIconClass = computed(() =>
  shouldShowDetails.value ? 'icon-close' : 'icon-gear',
)
const dictionaryGroupOptions = [
  { label: 'По алфавиту', value: 'alphabet' },
  { label: 'По URL', value: 'url' },
]
const dictionaryKeys = computed(() => {
  const unique = new Set()
  planFields.value.forEach((field) => unique.add(field.key))
  fieldDictionaryStore.entries.forEach((entry) => unique.add(entry.key))
  return [...unique]
})
const filteredDictionaryKeys = computed(() => {
  const search = dictionarySearch.value.trim().toLowerCase()
  if (!search) return dictionaryKeys.value
  return dictionaryKeys.value.filter((key) => {
    const friendly = (dictionaryLabelValue(key) || '').toLowerCase()
    const raw = getRawFieldLabel(key).toLowerCase()
    return (
      key.toLowerCase().includes(search) ||
      friendly.includes(search) ||
      raw.includes(search)
    )
  })
})
const dictionaryGroups = computed(() => {
  const keys = [...filteredDictionaryKeys.value]
  if (!keys.length) return []
  if (dictionaryGrouping.value === 'url') {
    const groupMap = new Map()
    const fallback = normalizeDictionaryUrl(sourceDraft.url) || 'Без URL'
    keys.forEach((key) => {
      const entry = fieldDictionaryStore.entryMap[key]
      const urls = entry?.urls?.length ? entry.urls : [fallback]
      urls.forEach((url) => {
        if (!groupMap.has(url)) groupMap.set(url, [])
        groupMap.get(url).push(buildDictionaryItem(key))
      })
    })
    return [...groupMap.entries()].map(([title, items]) => ({
      title,
      items: items.sort((a, b) => a.key.localeCompare(b.key, 'ru', { sensitivity: 'base' })),
    }))
  }
  const alphaMap = new Map()
  keys
    .sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }))
    .forEach((key) => {
      const letter = key.charAt(0).toUpperCase() || '#'
      if (!alphaMap.has(letter)) alphaMap.set(letter, [])
      alphaMap.get(letter).push(buildDictionaryItem(key))
    })
  return [...alphaMap.entries()].map(([title, items]) => ({
    title,
    items,
  }))
})
const httpMethodOptions = HTTP_METHODS.map((method) => ({
  label: method,
  value: method,
}))
const formattedResultJson = computed(() => {
  if (!hasResultData.value) return ''
  try {
    return JSON.stringify(result.value, null, 2)
  } catch {
    return String(result.value)
  }
})
const previewColumns = computed(() => {
  if (planFields.value.length) return planFields.value
  const firstRecord = planRecords.value[0]
  if (firstRecord && typeof firstRecord === 'object') {
    return Object.keys(firstRecord).map((key) => ({
      key,
      label: FIELD_ALIASES[key] || humanizeKey(key),
    }))
  }
  return []
})
const previewRows = computed(() => planRecords.value.slice(0, 100))

const pivotSections = [
  { key: 'filters', title: 'Фильтры' },
  { key: 'rows', title: 'Строки' },
  { key: 'columns', title: 'Столбцы' },
]

const pivotConfig = reactive({
  filters: [],
  rows: [],
  columns: [],
})

const filterValues = reactive({})
const pivotMetrics = reactive([])
const pivotMetricsVersion = ref(0)
const dimensionValueFilters = reactive({
  rows: {},
  columns: {},
})
const pivotOptions = reactive({
  showRowTotals: true,
  showColumnTotals: true,
})
const headerOverrides = reactive({})
const columnWidths = reactive({})
const rowHeights = reactive({})
const defaultColumnWidth = 150
const defaultRowHeight = 48
const resizingColumns = ref(false)
const resizingRows = ref(false)
const collapsedRowKeys = reactive({})

function resetRowCollapse() {
  Object.keys(collapsedRowKeys).forEach((key) => delete collapsedRowKeys[key])
}
function toggleRowCollapse(rowKey) {
  if (!rowKey) return
  collapsedRowKeys[rowKey] = !collapsedRowKeys[rowKey]
}
function isRowCollapsed(rowKey) {
  return Boolean(collapsedRowKeys[rowKey])
}

const aggregatorOptions = [
  { value: 'count', label: 'Количество' },
  { value: 'sum', label: 'Сумма' },
  { value: 'avg', label: 'Среднее' },
]
const supportedChartTypes = ['bar', 'line', 'pie']
const chartPalette = ['#2b6cb0', '#f97316', '#0ea5e9', '#10b981', '#ef4444', '#8b5cf6']

const CONFIG_STORAGE_KEY = 'report-pivot-configs'
const savedConfigs = ref(loadSavedConfigs())
const selectedConfigId = ref('')
const configName = ref('')
const pageBuilderStore = usePageBuilderStore()

watch(
  dataSources,
  (list) => {
    if (!list.length) {
      if (!isCreatingSource.value) {
        dataSource.value = ''
      }
      return
    }
    if (!isCreatingSource.value && !list.find((item) => item.id === dataSource.value)) {
      dataSource.value = list[0].id
    }
  },
  { immediate: true },
)

watch(
  selectedSource,
  (source) => {
    if (!source) {
      if (!isCreatingSource.value) {
        resetSourceDraft()
        detailsVisible.value = false
      }
      return
    }
    isCreatingSource.value = false
    loadDraftFromSource(source)
    sourceSearch.value = source.name || ''
    detailsVisible.value = false
  },
  { immediate: true },
)

watch(
  () => sourceSearch.value,
  (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      pendingNewSourceName.value = ''
      return
    }
    const match = dataSources.value.find(
      (source) => source.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (match && !isCreatingSource.value) {
      dataSource.value = match.id
      pendingNewSourceName.value = ''
    } else {
      pendingNewSourceName.value = match ? '' : trimmed
    }
  },
)

watch(
  () => dataSource.value,
  (value, prev) => {
    if (value === prev) return
    pendingNewSourceName.value = ''
    resetPlanState()
  },
)

watch(
  () => isCreatingSource.value,
  (next, prev) => {
    if (next && !prev) {
      resetPlanState()
    }
  },
)

let syncingFromBody = false
let syncingFromEditors = false

watch(
  () => sourceDraft.rawBody,
  (raw) => {
    if (syncingFromEditors) return
    const value = raw?.trim()
    if (!value) {
      rawBodyError.value = ''
      structuredBodyAvailable.value = false
      syncingFromBody = true
      rpcMethod.value = ''
      paramContainerType.value = 'array'
      syncReactiveObject(bodyParams, {})
      syncReactiveObject(bodyParamTypes, {})
      primitiveParams.value = []
      syncingFromBody = false
      return
    }
    try {
      const parsed = JSON.parse(value)
      rawBodyError.value = ''
      const methodValue = typeof parsed.method === 'string' ? parsed.method : ''
      let paramPayload = null
      let container = 'array'
      if (Array.isArray(parsed.params)) {
        const firstEntry = parsed.params[0]
        if (firstEntry && typeof firstEntry === 'object' && !Array.isArray(firstEntry)) {
          paramPayload = firstEntry
        } else if (parsed.params.length) {
          primitiveParams.value = parsed.params.map((item) => formatPrimitiveParam(item))
        }
      } else if (parsed.params && typeof parsed.params === 'object') {
        paramPayload = parsed.params
        container = 'object'
      }
      syncingFromBody = true
      rpcMethod.value = methodValue
      paramContainerType.value = container
      structuredBodyAvailable.value = Boolean(paramPayload)
      if (!paramPayload) {
        if (!Array.isArray(parsed.params) || !parsed.params.length) {
          primitiveParams.value = []
        }
      } else {
        primitiveParams.value = []
      }
      if (paramPayload) {
        syncReactiveObject(bodyParams, formatParamsForEditors(paramPayload))
        syncReactiveObject(bodyParamTypes, detectParamTypes(paramPayload))
      } else {
        syncReactiveObject(bodyParams, {})
        syncReactiveObject(bodyParamTypes, {})
      }
      syncingFromBody = false
    } catch (err) {
      rawBodyError.value = err.message
      structuredBodyAvailable.value = false
      syncingFromBody = true
      paramContainerType.value = 'array'
      syncReactiveObject(bodyParams, {})
      syncReactiveObject(bodyParamTypes, {})
      primitiveParams.value = []
      syncingFromBody = false
    }
  },
  { immediate: true },
)

watch(
  () => ({
    structured: structuredBodyAvailable.value,
    method: rpcMethod.value,
    params: structuredBodyAvailable.value ? snapshotParams(bodyParams) : null,
  }),
  ({ structured, method, params }) => {
    if (syncingFromBody) return
    if (!structured) return
    const rawValue = sourceDraft.rawBody?.trim()
    let parsed
    try {
      parsed = rawValue ? JSON.parse(rawValue) : {}
    } catch {
      return
    }
    parsed.method = method || parsed.method || ''
    if (params) {
      const normalizedParams = normalizeParamValues(params)
      parsed.params =
        paramContainerType.value === 'object'
          ? normalizedParams
          : [normalizedParams]
    }
    syncingFromEditors = true
    sourceDraft.rawBody = JSON.stringify(parsed, null, 2)
    syncingFromEditors = false
  },
  { deep: true },
)

watch(
  () => ({
    method: rpcMethod.value,
    params: [...primitiveParams.value],
  }),
  ({ method, params }) => {
    if (syncingFromBody) return
    if (!params.length) return
    const rawValue = sourceDraft.rawBody?.trim()
    let parsed
    try {
      parsed = rawValue ? JSON.parse(rawValue) : {}
    } catch {
      return
    }
    parsed.method = method || parsed.method || ''
    parsed.params = params.map((value) => normalizePrimitiveValue(value))
    syncingFromEditors = true
    sourceDraft.rawBody = JSON.stringify(parsed, null, 2)
    syncingFromEditors = false
  },
  { deep: true },
)

watch(
  () => planFields.value.map((field) => field.key),
  (validKeys) => {
    pivotSections.forEach((section) => {
      pivotConfig[section.key] = pivotConfig[section.key].filter((key) =>
        validKeys.includes(key),
      )
    })
    pivotMetrics.forEach((metric) => {
      if (metric.fieldKey && !validKeys.includes(metric.fieldKey)) {
        metric.fieldKey = ''
      }
    })
    pivotMetricsVersion.value += 1
  },
)

watch(
  () => [...pivotConfig.filters],
  (next, prev) => {
    next.forEach((key) => {
      if (!filterValues[key]) filterValues[key] = []
    })
    prev.forEach((key) => {
      if (!next.includes(key)) {
        delete filterValues[key]
      }
    })
  },
  { deep: true },
)

function syncDimensionFilters(type, keys) {
  keys.forEach((key) => {
    if (!dimensionValueFilters[type][key]) {
      dimensionValueFilters[type][key] = []
    }
  })
  Object.keys(dimensionValueFilters[type]).forEach((key) => {
    if (!keys.includes(key)) {
      delete dimensionValueFilters[type][key]
    }
  })
}

watch(
  () => [...pivotConfig.rows],
  (keys) => {
    syncDimensionFilters('rows', keys)
    resetRowCollapse()
  },
  { deep: true },
)

watch(
  () => [...pivotConfig.columns],
  (keys) => {
    syncDimensionFilters('columns', keys)
  },
  { deep: true },
)

watch(
  () => planFields.value,
  (fields) => {
    if (fields.length && pivotMetrics.length === 1 && !pivotMetrics[0].fieldKey) {
      const firstNumericField = fields.find((field) => field.type === 'number')
      const firstFieldKey = firstNumericField?.key || fields[0]?.key
      if (firstFieldKey) {
        pivotMetrics[0].fieldKey = firstFieldKey
        pivotMetrics[0].aggregator = firstNumericField ? 'sum' : 'count'
        pivotMetricsVersion.value += 1
      }
    }
  },
  { deep: true },
)

watch(
  () => {
    const metricKeys = pivotMetrics.map((metric) => metric.fieldKey).filter(Boolean)
    return [
      ...pivotConfig.rows,
      ...pivotConfig.columns,
      ...pivotConfig.filters,
      ...metricKeys,
    ]
  },
  (keys) => {
    const allowed = new Set(keys.filter(Boolean))
    Object.keys(headerOverrides).forEach((key) => {
      if (!allowed.has(key)) {
        delete headerOverrides[key]
      }
    })
  },
  { deep: true },
)

watch(
  () => savedConfigs.value,
  (configs) => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configs))
  },
  { deep: true },
)

watch(
  pivotMetrics,
  () => {
    pivotMetricsVersion.value += 1
  },
  { deep: true },
)

const planFieldsMap = computed(() => {
  return planFields.value.reduce((acc, field) => {
    acc.set(field.key, field)
    return acc
  }, new Map())
})

const selectedFilterFields = computed(() =>
  pivotConfig.filters
    .map((key) => {
      const field = planFieldsMap.value.get(key)
      if (!field) return null
      return {
        ...field,
        displayLabel: getFieldDisplayNameByKey(key),
      }
    })
    .filter(Boolean),
)

const dimensionValueOptions = computed(() => {
  const mapField = (key) => {
    const field = planFieldsMap.value.get(key)
    if (!field) return null
    return {
      ...field,
      displayLabel: getFieldDisplayNameByKey(key),
    }
  }
  return {
    rows: pivotConfig.rows.map((key) => mapField(key)).filter(Boolean),
    columns: pivotConfig.columns.map((key) => mapField(key)).filter(Boolean),
  }
})

const renamableFields = computed(() => {
  const keys = new Set([
    ...pivotConfig.rows,
    ...pivotConfig.columns,
    ...pivotConfig.filters,
    ...pivotMetrics.map((metric) => metric.fieldKey).filter(Boolean),
  ])
  return [...keys]
    .map((key) => {
      const field = planFieldsMap.value.get(key)
      if (!field) return null
      return {
        ...field,
        displayLabel: getFieldDisplayNameByKey(key),
      }
    })
    .filter(Boolean)
})

const activeMetrics = computed(() => {
  pivotMetricsVersion.value
  return pivotMetrics
    .map((metric) => {
      const field = planFieldsMap.value.get(metric.fieldKey)
      if (!field || !metric.fieldKey) return null
      return {
        ...metric,
        label: aggregatorLabel(metric.aggregator, field),
        field,
      }
    })
    .filter(Boolean)
})

function matchesFieldValues(record, fieldsList, store) {
  return fieldsList.every((fieldKey) => {
    const selectedValues = store[fieldKey]
    if (!selectedValues || !selectedValues.length) return true
    const normalizedRecordValue = normalizeValue(record[fieldKey])
    return selectedValues.includes(normalizedRecordValue)
  })
}

const filteredPlanRecords = computed(() => {
  if (!planRecords.value.length) return []
  return planRecords.value.filter((record) => {
    const basicFiltersMatch = pivotConfig.filters.every((fieldKey) => {
      const selectedValues = filterValues[fieldKey]
      if (!selectedValues || !selectedValues.length) return true
      const normalizedRecordValue = normalizeValue(record[fieldKey])
      return selectedValues.includes(normalizedRecordValue)
    })
    if (!basicFiltersMatch) return false
    if (!matchesFieldValues(record, pivotConfig.rows, dimensionValueFilters.rows)) return false
    if (!matchesFieldValues(record, pivotConfig.columns, dimensionValueFilters.columns)) return false
    return true
  })
})

const pivotWarnings = computed(() => {
  const messages = []
  if (!planRecords.value.length) {
    messages.push('Загрузите данные плана, чтобы построить сводную таблицу.')
  }
  if (!pivotConfig.rows.length && !pivotConfig.columns.length) {
    messages.push('Добавьте хотя бы одно поле в строки или столбцы.')
  }
  if (!activeMetrics.value.length) {
    messages.push('Добавьте хотя бы одну метрику.')
  }
  activeMetrics.value.forEach((metric) => {
    if (
      metric.field.type !== 'number' &&
      metric.aggregator !== 'count'
    ) {
      messages.push(
        `Метрика «${metric.label}» требует числовое поле. Выберите другое поле или агрегат.`,
      )
    }
  })
  return messages
})

const pivotView = computed(() => {
  if (pivotWarnings.value.length) return null
  if (!filteredPlanRecords.value.length) return null
  return buildPivotView({
    records: filteredPlanRecords.value,
    rows: pivotConfig.rows,
    columns: pivotConfig.columns,
    metrics: activeMetrics.value,
    fieldMeta: planFieldsMap.value,
    headerOverrides,
  })
})
const pivotReady = computed(() => Boolean(pivotView.value && pivotView.value.rows.length))
const canUseVizSettings = computed(() =>
  isPivotSource.value ? pivotReady.value : hasResultData.value,
)
const hasSelectedFilterValues = computed(() =>
  Object.values(filterValues).some((values) => values && values.length),
)
const tableRows = computed(() => {
  const view = pivotView.value
  if (!view) return []
  if (view.rowTree && view.rowTree.length) {
    return flattenRowTree(view.rowTree, collapsedRowKeys)
  }
  return (view.rows || []).map((row) => ({
    key: row.key,
    label: row.label,
    fieldLabel: '',
    depth: 0,
    hasChildren: false,
    cells: row.cells,
    totals: row.totals,
  }))
})

function columnWidthStyle(key) {
  const baseWidth = key === '__rows__' ? 200 : defaultColumnWidth
  const width = columnWidths[key] || baseWidth
  return `${width}px`
}
function rowHeightStyle(key) {
  const height = rowHeights[key] || defaultRowHeight
  return `${height}px`
}
function startColumnResize(key, event) {
  resizingColumns.value = true
  const startX = event.clientX
  const th = event.currentTarget.closest('th')
  const initial = columnWidths[key] || th?.offsetWidth || defaultColumnWidth
  const onMove = (e) => {
    const delta = e.clientX - startX
    columnWidths[key] = Math.max(80, initial + delta)
  }
  const onUp = () => {
    resizingColumns.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
function startRowResize(key, event) {
  resizingRows.value = true
  const startY = event.clientY
  const tr = event.currentTarget.closest('tr')
  const initial = rowHeights[key] || tr?.offsetHeight || defaultRowHeight
  const onMove = (e) => {
    const delta = e.clientY - startY
    rowHeights[key] = Math.max(36, initial + delta)
  }
  const onUp = () => {
    resizingRows.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
function moveField(sectionKey, index, delta) {
  const list = pivotConfig[sectionKey]
  if (!list) return
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= list.length) return
  const [item] = list.splice(index, 1)
  list.splice(nextIndex, 0, item)
}
function columnStyle(columnKey) {
  return { width: columnWidthStyle(columnKey) }
}
function rowStyle(rowKey) {
  return { height: rowHeightStyle(rowKey) }
}
const chartConfig = computed(() => {
  if (!isPivotSource.value) return null
  if (!pivotReady.value) return null
  if (!supportedChartTypes.includes(vizType.value)) return null
  const view = pivotView.value
  if (!view || !view.rows.length) return null
  const labels = view.rows.map((row) => row.label || '—')
  let datasets = []

  if (view.columns.length) {
    datasets = view.columns.map((column, index) => {
      const color = chartPalette[index % chartPalette.length]
      const data = view.rows.map((row) => {
        const cell = row.cells[index]
        return typeof cell?.value === 'number' ? Number(cell.value) : 0
      })
      return {
        label: column.label,
        data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 2,
        tension: 0.3,
        fill: vizType.value !== 'line',
      }
    })
  }

  if (!datasets.length && view.rowTotalHeaders.length) {
    datasets = view.rowTotalHeaders.map((header, index) => {
      const color = chartPalette[index % chartPalette.length]
      const data = view.rows.map((row) => {
        const total = row.totals.find((item) => item.metricId === header.metricId)
        return typeof total?.value === 'number' ? Number(total.value) : 0
      })
      return {
        label: header.label,
        data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 2,
        tension: 0.3,
        fill: vizType.value !== 'line',
      }
    })
  }

  if (!datasets.length) return null

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { mode: 'index', intersect: false },
    },
  }

  if (vizType.value === 'pie') {
    const pieDataset = datasets[0]
    const pieColors = labels.map((_, idx) => chartPalette[idx % chartPalette.length])
    return {
      data: {
        labels,
        datasets: [
          {
            ...pieDataset,
            backgroundColor: pieColors,
            borderColor: '#fff',
            borderWidth: 1,
            fill: true,
          },
        ],
      },
      options: baseOptions,
    }
  }
  return {
    data: {
      labels,
      datasets,
    },
    options: {
      ...baseOptions,
      scales: {
        x: { ticks: { autoSkip: false } },
        y: { beginAtZero: true },
      },
    },
  }
})
const showChart = computed(
  () => isPivotSource.value && chartConfig.value && vizType.value !== 'table',
)

function startCreatingSource(name = '') {
  const normalized = name?.trim() || ''
  isCreatingSource.value = true
  dataSource.value = ''
  resetSourceDraft({ name: normalized })
  sourceSearch.value = normalized
  pendingNewSourceName.value = ''
  detailsVisible.value = true
}

function handleSourceSearch(value = '') {
  sourceSearch.value = value || ''
}

function toggleDetails() {
  if (!canToggleDetails.value) return
  detailsVisible.value = !detailsVisible.value
}

function openDictionary() {
  showDictionaryModal.value = true
}

function saveCurrentSource() {
  if (!canSaveSource.value) return
  const payload = {
    id: sourceDraft.id,
    name: sourceDraft.name.trim(),
    url: sourceDraft.url.trim(),
    httpMethod: sourceDraft.httpMethod?.toUpperCase?.() || 'POST',
    rawBody: sourceDraft.rawBody.trim(),
    headers: {
      ...(sourceDraft.headers || {}),
    },
    supportsPivot: sourceDraft.supportsPivot !== false,
  }
  const id = dataSourcesStore.saveSource(payload)
  dataSource.value = id
  isCreatingSource.value = false
  pendingNewSourceName.value = ''
}

async function executeCurrentSource() {
  await loadPlanFields()
}

function saveTemplate() {
  if (!isPivotSource.value) {
    alert('Сохранение шаблонов доступно только для источников плана и параметров.')
    return
  }
  if (!pivotReady.value) {
    alert('Постройте сводную таблицу, прежде чем сохранять шаблон.')
    return
  }
  const suggestedName = configName.value || `Конфигурация ${new Date().toLocaleDateString()}`
  const name = prompt('Название шаблона', suggestedName)
  if (!name) return
  const description = prompt('Описание шаблона (опционально)', '')

  const payload = {
    name: name.trim(),
    description: description?.trim() || '',
    dataSource: dataSource.value,
    visualization: vizType.value,
    snapshot: snapshotCurrentConfig(),
    createdAt: new Date().toISOString(),
  }
  const id = pageBuilderStore.saveTemplate(payload)
  alert(`Шаблон сохранён и доступен в списке. ID: ${id}`)
}

async function loadPlanFields() {
  if (planLoading.value) return
  const requestPayload = resolveCurrentRequestPayload()
  if (!requestPayload) return

  planLoading.value = true
  planError.value = ''
  try {
    const response = await sendDataSourceRequest(requestPayload)
    result.value = response
    const records = extractRecordsFromResponse(response)
    planRecords.value = records
    planFields.value = extractFieldDescriptors(records)
    ensureMetricExists()
    activeResultTab.value = 'json'
  } catch (err) {
    planError.value =
      err?.response?.data?.message ||
      err?.message ||
      'Не удалось загрузить данные источника.'
    planRecords.value = []
    planFields.value = []
    result.value = null
  } finally {
    planLoading.value = false
  }
}

function resolveCurrentRequestPayload() {
  const url = sourceDraft.url?.trim()
  if (!url) {
    planError.value = 'Укажите URL источника.'
    return null
  }
  const method = sourceDraft.httpMethod?.toUpperCase?.() || 'POST'
  const headers = sourceDraft.headers || { 'Content-Type': 'application/json' }

  if (method === 'GET') {
    if (!sourceDraft.rawBody?.trim()) {
      return { url, method, headers }
    }
    try {
      return { url, method, headers, body: JSON.parse(sourceDraft.rawBody) }
    } catch {
      planError.value = 'Параметры GET-запроса должны быть корректным JSON.'
      return null
    }
  }

  if (!sourceDraft.rawBody?.trim()) {
    planError.value = 'Добавьте тело запроса.'
    return null
  }
  if (rawBodyError.value) {
    planError.value = 'Исправьте JSON в поле Raw body.'
    return null
  }
  return { url, method, headers, body: sourceDraft.rawBody }
}

function resetPlanState() {
  planRecords.value = []
  planFields.value = []
  planError.value = ''
  result.value = null
  activeResultTab.value = 'json'
  primitiveParams.value = []
  replaceArray(pivotConfig.filters, [])
  replaceArray(pivotConfig.rows, [])
  replaceArray(pivotConfig.columns, [])
  pivotMetrics.splice(0, pivotMetrics.length)
  pivotMetricsVersion.value += 1
  Object.keys(filterValues).forEach((key) => delete filterValues[key])
  Object.keys(dimensionValueFilters.rows).forEach((key) => delete dimensionValueFilters.rows[key])
  Object.keys(dimensionValueFilters.columns).forEach((key) => delete dimensionValueFilters.columns[key])
  Object.keys(columnWidths).forEach((key) => delete columnWidths[key])
  Object.keys(rowHeights).forEach((key) => delete rowHeights[key])
  resetRowCollapse()
}

function resetFilterValues() {
  Object.keys(filterValues).forEach((key) => {
    filterValues[key] = []
  })
}

function extractRecordsFromResponse(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.records)) return payload.records
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.result)) return payload.result
  if (payload.result && Array.isArray(payload.result.records)) return payload.result.records
  return []
}

function extractFieldDescriptors(records) {
  const map = new Map()
  records.forEach((record) => {
    Object.entries(record || {}).forEach(([key, value]) => {
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: FIELD_ALIASES[key] || humanizeKey(key),
          sample: formatSample(value),
          total: 0,
          numericCount: 0,
          values: new Set(),
        })
      }
      const descriptor = map.get(key)
      descriptor.total += 1
      if (typeof value === 'number') descriptor.numericCount += 1
      if (descriptor.values.size < 20) {
        descriptor.values.add(normalizeValue(value))
      }
      if (!descriptor.sample && value !== undefined && value !== null) {
        descriptor.sample = formatSample(value)
      }
    })
  })

  return Array.from(map.values()).map((descriptor) => ({
    key: descriptor.key,
    label: descriptor.label,
    sample: descriptor.sample || '—',
    values: Array.from(descriptor.values),
    type:
      descriptor.numericCount > 0 && descriptor.numericCount === descriptor.total
        ? 'number'
        : 'string',
  }))
}

function formatSample(value) {
  if (value === null || typeof value === 'undefined') return '—'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (err) {
      return '[object]'
    }
  }
  if (value === '') return 'пусто'
  return String(value)
}

function aggregatorLabel(aggregator, field) {
  const agg = aggregatorOptions.find((opt) => opt.value === aggregator)
  const aggName = agg ? agg.label : aggregator
  const override = headerOverrides[field?.key]
  const fieldLabel = override?.trim() || field?.label || field?.key || 'поле'
  return `${aggName}: ${fieldLabel}`
}

function ensureMetricExists() {
  if (!pivotMetrics.length) {
    const firstNumericField = planFields.value.find((field) => field.type === 'number')
    const firstFieldKey = firstNumericField?.key || planFields.value[0]?.key || ''
    pivotMetrics.push(
      createMetric({
        fieldKey: firstFieldKey,
        aggregator: firstNumericField ? 'sum' : 'count',
      }),
    )
    pivotMetricsVersion.value += 1
  }
}

let metricCounter = 0
function createMetric(overrides = {}) {
  metricCounter += 1
  return {
    id: `metric-${metricCounter}`,
    fieldKey: overrides.fieldKey || '',
    aggregator: overrides.aggregator || 'count',
  }
}

function addMetric() {
  pivotMetrics.push(createMetric())
  pivotMetricsVersion.value += 1
}

function removeMetric(metricId) {
  if (pivotMetrics.length === 1) return
  const index = pivotMetrics.findIndex((metric) => metric.id === metricId)
  if (index >= 0) {
    pivotMetrics.splice(index, 1)
    pivotMetricsVersion.value += 1
  }
}

function loadSavedConfigs() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function createBlankSource(overrides = {}) {
  return {
    id: overrides.id || '',
    name: overrides.name || '',
    url: overrides.url || '',
    httpMethod: overrides.httpMethod?.toUpperCase?.() || 'POST',
    rawBody: overrides.rawBody || EMPTY_BODY_TEMPLATE,
    headers: {
      'Content-Type': 'application/json',
      ...(overrides.headers || {}),
    },
    supportsPivot: overrides.supportsPivot !== false,
  }
}

function resetSourceDraft(overrides = {}) {
  Object.assign(sourceDraft, createBlankSource(overrides))
}

function loadDraftFromSource(source) {
  if (!source) {
    resetSourceDraft()
    return
  }
  resetSourceDraft({
    ...source,
    headers: {
      'Content-Type': 'application/json',
      ...(source.headers || {}),
    },
  })
}

function syncReactiveObject(target, source) {
  Object.keys(target).forEach((key) => delete target[key])
  Object.entries(source || {}).forEach(([key, value]) => {
    target[key] = value
  })
}

function formatParamsForEditors(paramsObj) {
  return Object.entries(paramsObj || {}).reduce((acc, [key, value]) => {
    if (value === null || typeof value === 'undefined') {
      acc[key] = ''
    } else if (typeof value === 'object') {
      acc[key] = JSON.stringify(value)
    } else {
      acc[key] = String(value)
    }
    return acc
  }, {})
}

function detectParamTypes(paramsObj) {
  return Object.entries(paramsObj || {}).reduce((acc, [key, value]) => {
    if (value === null) {
      acc[key] = 'null'
    } else if (Array.isArray(value) || typeof value === 'object') {
      acc[key] = 'json'
    } else {
      acc[key] = typeof value
    }
    return acc
  }, {})
}

function snapshotParams(store) {
  return Object.entries(store || {}).reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {})
}

function normalizeParamValues(values) {
  return Object.entries(values || {}).reduce((acc, [key, value]) => {
    acc[key] = formatParamValueForBody(key, value)
    return acc
  }, {})
}

function formatParamValueForBody(key, value) {
  const type = bodyParamTypes[key]
  if (type === 'number') {
    const num = Number(value)
    return Number.isNaN(num) ? value : num
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value
    return String(value).trim() === 'true'
  }
  if (type === 'json') {
    if (!value) return null
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  if (type === 'null') {
    return null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!type) {
      if (trimmed === 'true' || trimmed === 'false') {
        return trimmed === 'true'
      }
      if (!Number.isNaN(Number(trimmed)) && trimmed !== '') {
        return Number(trimmed)
      }
    }
    return value
  }
  return value
}

function formatPrimitiveParam(value) {
  if (value === null || typeof value === 'undefined') return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

function normalizePrimitiveValue(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed.length) return ''
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  const num = Number(trimmed)
  if (!Number.isNaN(num)) return num
  return value
}

function saveCurrentConfig() {
  if (!configName.value.trim()) {
    alert('Укажите название конфигурации')
    return
  }
  if (!activeMetrics.value.length) {
    alert('Добавьте хотя бы одну метрику')
    return
  }
  const payload = snapshotCurrentConfig()
  const normalizedName = configName.value.trim()
  const existingIndex = savedConfigs.value.findIndex((cfg) => cfg.name === normalizedName)
  const entry = {
    id: existingIndex >= 0 ? savedConfigs.value[existingIndex].id : createId(),
    name: normalizedName,
    updatedAt: new Date().toISOString(),
    payload,
  }
  if (existingIndex >= 0) {
    savedConfigs.value.splice(existingIndex, 1, entry)
  } else {
    savedConfigs.value.push(entry)
  }
  selectedConfigId.value = entry.id
}

function snapshotCurrentConfig() {
  const filtersMeta = pivotConfig.filters
    .map((key) => {
      const field = planFieldsMap.value.get(key)
      if (!field) return null
      return {
        key: field.key,
        label: getFieldDisplayName(field),
        type: field.type,
        values: field.values?.slice?.(0, 50) || [],
      }
    })
    .filter(Boolean)

  const usedFieldKeys = new Set([
    ...pivotConfig.rows,
    ...pivotConfig.columns,
    ...pivotConfig.filters,
    ...pivotMetrics.map((metric) => metric.fieldKey).filter(Boolean),
  ])
  const fieldMeta = {}
  usedFieldKeys.forEach((key) => {
    const field = planFieldsMap.value.get(key)
    fieldMeta[key] = {
      label: field?.label || humanizeKey(key),
      type: field?.type || 'string',
    }
  })

  return {
    pivot: {
      filters: [...pivotConfig.filters],
      rows: [...pivotConfig.rows],
      columns: [...pivotConfig.columns],
    },
    metrics: pivotMetrics.map((metric) => {
      const field = planFieldsMap.value.get(metric.fieldKey)
      return {
        ...metric,
        fieldLabel: headerOverrides[metric.fieldKey]?.trim() || field?.label || metric.fieldKey,
      }
    }),
    filtersMeta,
    filterValues: Object.entries(filterValues).reduce((acc, [key, values]) => {
      acc[key] = [...values]
      return acc
    }, {}),
    dimensionValues: {
      rows: copyFilterStore(dimensionValueFilters.rows),
      columns: copyFilterStore(dimensionValueFilters.columns),
    },
    options: {
      showRowTotals: pivotOptions.showRowTotals,
      showColumnTotals: pivotOptions.showColumnTotals,
      headerOverrides: Object.entries(headerOverrides).reduce((acc, [key, value]) => {
        if (value && value.trim()) {
          acc[key] = value.trim()
        }
        return acc
      }, {}),
    },
    fieldMeta,
  }
}

function loadSelectedConfig() {
  const entry = savedConfigs.value.find((cfg) => cfg.id === selectedConfigId.value)
  if (!entry) return
  applyConfig(entry.payload)
}

function applyConfig(payload) {
  replaceArray(pivotConfig.filters, payload?.pivot?.filters || [])
  replaceArray(pivotConfig.rows, payload?.pivot?.rows || [])
  replaceArray(pivotConfig.columns, payload?.pivot?.columns || [])
  pivotMetrics.splice(0, pivotMetrics.length, ...(payload?.metrics || []).map((metric) => ({ ...metric })))
  pivotMetricsVersion.value += 1
  if (!pivotMetrics.length) ensureMetricExists()

  Object.keys(filterValues).forEach((key) => delete filterValues[key])
  Object.entries(payload?.filterValues || {}).forEach(([key, values]) => {
    filterValues[key] = [...values]
  })
  applyFilterSnapshot(
    dimensionValueFilters.rows,
    pivotConfig.rows,
    payload?.dimensionValues?.rows || {},
  )
  applyFilterSnapshot(
    dimensionValueFilters.columns,
    pivotConfig.columns,
    payload?.dimensionValues?.columns || {},
  )
  pivotOptions.showRowTotals =
    payload?.options?.showRowTotals === undefined ? true : Boolean(payload.options.showRowTotals)
  pivotOptions.showColumnTotals =
    payload?.options?.showColumnTotals === undefined
      ? true
      : Boolean(payload.options.showColumnTotals)
  Object.keys(headerOverrides).forEach((key) => delete headerOverrides[key])
  Object.entries(payload?.options?.headerOverrides || {}).forEach(([key, value]) => {
    headerOverrides[key] = value
  })
}

function deleteSelectedConfig() {
  const index = savedConfigs.value.findIndex((cfg) => cfg.id === selectedConfigId.value)
  if (index >= 0) {
    savedConfigs.value.splice(index, 1)
    selectedConfigId.value = ''
  }
}

function replaceArray(target, next) {
  target.splice(0, target.length, ...next)
}

function copyFilterStore(store) {
  return Object.entries(store).reduce((acc, [key, values]) => {
    acc[key] = [...values]
    return acc
  }, {})
}

function applyFilterSnapshot(store, keys, snapshot) {
  Object.keys(store).forEach((key) => delete store[key])
  keys.forEach((key) => {
    store[key] = [...(snapshot[key] || [])]
  })
}

function swapPivotAxes() {
  if (!isPivotSource.value) return
  const prevRows = [...pivotConfig.rows]
  const prevColumns = [...pivotConfig.columns]
  const prevRowFilters = copyFilterStore(dimensionValueFilters.rows)
  const prevColumnFilters = copyFilterStore(dimensionValueFilters.columns)

  replaceArray(pivotConfig.rows, prevColumns)
  replaceArray(pivotConfig.columns, prevRows)

  applyFilterSnapshot(dimensionValueFilters.rows, pivotConfig.rows, prevColumnFilters)
  applyFilterSnapshot(dimensionValueFilters.columns, pivotConfig.columns, prevRowFilters)

  Object.keys(columnWidths).forEach((key) => delete columnWidths[key])
  Object.keys(rowHeights).forEach((key) => delete rowHeights[key])
}

function exportToCsv() {
  if (!pivotView.value) {
    alert('Нет данных для экспорта')
    return
  }
  const csv = buildCsvFromPivot(pivotView.value, pivotOptions)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pivot-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function buildCsvFromPivot(view, options = { showRowTotals: true, showColumnTotals: true }) {
  const header = ['Строки', ...view.columns.map((col) => col.label)]
  if (options.showRowTotals) {
    header.push(...view.rowTotalHeaders.map((total) => total.label))
  }
  const rows = view.rows.map((row) => {
    const cells = [
      row.label,
      ...row.cells.map((cell) => cell.display),
    ]
    if (options.showRowTotals) {
      cells.push(...row.totals.map((total) => total.display))
    }
    return cells
  })
  const totalsRow = ['Итого по столбцам']
  if (options.showColumnTotals) {
    totalsRow.push(...view.columns.map((column) => column.totalDisplay))
  } else {
    totalsRow.push(...view.columns.map(() => ''))
  }
  if (options.showRowTotals) {
    totalsRow.push(...view.rowTotalHeaders.map((total) => view.grandTotals[total.metricId]))
  }

  return [header, ...rows, totalsRow]
    .map((line) =>
      line
        .map((value) => {
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(';'),
    )
    .join('\n')
}

const FIELD_ALIASES = {
  name: 'Название плана',
  nameCls: 'Класс плана',
  nameClsWork: 'Класс работ',
  fullNameWork: 'Описание работ',
  fullNameObject: 'Объект',
  nameClsObject: 'Тип объекта',
  PlanDateEnd: 'Плановая дата окончания',
  CreatedAt: 'Создано',
  UpdatedAt: 'Обновлено',
  StartKm: 'Начальный километр',
  FinishKm: 'Конечный километр',
  StartPicket: 'Начальный пикет',
  FinishPicket: 'Конечный пикет',
  fullNameUser: 'Ответственный',
  nameLocationClsSection: 'Участок',
  id: 'ID записи',
  login: 'Логин',
  nameLocation: 'Локация',
  idIncident: 'Инцидент',
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `cfg-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getFieldDisplayName(field) {
  if (!field) return ''
  const dictionaryLabel = dictionaryLabelValue(field.key)
  if (dictionaryLabel) return dictionaryLabel
  const override = headerOverrides[field.key]
  if (override && override.trim()) return override.trim()
  return field.label || humanizeKey(field.key)
}

function getFieldDisplayNameByKey(key = '') {
  const dictionaryLabel = dictionaryLabelValue(key)
  if (dictionaryLabel) return dictionaryLabel
  const field = planFieldsMap.value.get(key)
  if (!field) {
    const override = headerOverrides[key]
    if (override && override.trim()) return override.trim()
    return humanizeKey(key)
  }
  return getFieldDisplayName(field)
}

function fieldValueOptions(field) {
  if (!field) return []
  return (field.values || []).map((value) => ({
    value,
    label: value || 'пусто',
  }))
}

function flattenRowTree(nodes = [], collapsedState = {}) {
  const result = []
  const walk = (list) => {
    list.forEach((node) => {
      const item = {
        key: node.key,
        label: node.label,
        fieldLabel: node.fieldLabel,
        depth: node.depth,
        hasChildren: Boolean(node.children?.length),
        cells: node.cells,
        totals: node.totals,
      }
      result.push(item)
      if (!collapsedState[node.key] && node.children?.length) {
        walk(node.children)
      }
    })
  }
  walk(nodes)
  return result
}

function dictionaryLabelValue(key) {
  return fieldDictionaryStore.labelMap[key] || ''
}

function updateDictionaryLabel(key, value = '') {
  fieldDictionaryStore.saveEntry({
    key,
    label: value,
    url: sourceDraft.url,
  })
}

function buildDictionaryItem(key) {
  return {
    key,
    currentLabel: dictionaryLabelValue(key),
    sourceLabel: getRawFieldLabel(key),
  }
}

function getRawFieldLabel(key) {
  return FIELD_ALIASES[key] || humanizeKey(key)
}

function normalizeDictionaryUrl(value) {
  if (!value || typeof value !== 'string') return ''
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(value, window.location.origin)
      return url.pathname
    } catch {
      return value.trim()
    }
  }
  return value.trim()
}
</script>

<style scoped>
.page {
  padding: 32px clamp(16px, 6vw, 72px);
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin: 0 auto;
  max-width: 1320px;
  box-sizing: border-box;
}
.step {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: var(--s360-radius-lg, 16px);
  background: var(--s360-color-surface, #fff);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.step--disabled {
  opacity: 0.55;
  pointer-events: none;
}
.step__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.step__badge {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--s360-color-primary, #2b6cb0);
  color: #fff;
  font-weight: 600;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step__status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--s360-text-success, #198754);
  font-weight: 600;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
  background: currentColor;
}
.dot--success {
  background: var(--s360-text-success, #198754);
}
.step__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.source-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (min-width: 900px) {
  .source-panel {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}
.source-panel__selector {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.source-panel__actions {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  align-self: flex-start;
  padding-top: 32px;
}
@media (max-width: 900px) {
  .source-panel__actions {
    padding-top: 4px;
  }
}
.source-panel__details {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--s360-color-surface, #fff);
}
.source-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.combobox {
  width: 100%;
}
.combobox__hint {
  margin: 0;
  font-size: 12px;
  color: var(--s360-text-muted, #6b7280);
}
.select-action {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--s360-text-primary, #1f2937);
}
.select-action:hover {
  background: #f5f7fb;
  color: var(--s360-color-primary, #2563eb);
}
.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.params-grid--compact {
  grid-template-columns: repeat(auto-fit, minmax(160px, 200px));
}
.raw-body {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  min-height: 160px;
  resize: vertical;
}
.source-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.result-tabs {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.tabs {
  display: flex;
  border-bottom: 1px solid var(--s360-color-border-subtle, #e5e7eb);
}
.tab {
  flex: 1;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.05em;
  padding: 10px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--s360-text-muted, #6b7280);
}
.tab--active {
  color: var(--s360-text-primary, #1f2937);
  border-bottom: 2px solid var(--s360-color-primary, #2563eb);
}
.tabs__body {
  padding: 12px;
  max-height: 360px;
  overflow: auto;
}
.tabs__body pre {
  margin: 0;
  font-size: 13px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
}
.preview-table {
  overflow-x: auto;
}
.dictionary-modal :global(.n-card) {
  max-width: 720px;
}
.dictionary-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.dictionary-toolbar .n-input,
.dictionary-toolbar .n-select {
  flex: 1;
  min-width: 220px;
}
.dictionary-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow: auto;
}
.dictionary-group__title {
  font-weight: 600;
  margin-bottom: 8px;
}
.dictionary-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--s360-color-border-subtle, #e5e7eb);
}
.dictionary-row:last-child {
  border-bottom: none;
}
.dictionary-row__meta {
  min-width: 220px;
}
.dictionary-row__key {
  font-weight: 600;
  font-size: 13px;
}
.dictionary-row__hint {
  font-size: 12px;
  color: var(--s360-text-muted, #6b7280);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}
.field__label {
  font-weight: 600;
  color: var(--s360-text-primary, #111827);
}
.field input,
.field select,
.config-block select,
.config-block input {
  border: 1px solid var(--s360-color-border-subtle, #d1d5db);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--s360-color-surface, #fff);
  width: 100%;
}
.step__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}
.btn-xs {
  padding: 4px 8px;
  font-size: 12px;
}
.step__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.muted {
  color: var(--s360-text-muted, #6b7280);
  font-size: 13px;
}
.config-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.config-block {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.pivot-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
}
.pivot-settings label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.alias-panel {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.alias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.alias-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.alias-grid input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
}
.pivot-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.samples {
  flex: 1 1 260px;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  background: var(--s360-color-panel, #f8fafc);
}
.samples ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.samples li {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--s360-color-border-subtle, #f3f4f6);
  font-size: 13px;
}
.field-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.key-tag {
  font-size: 11px;
  color: #374151;
  background: var(--s360-color-neutral-soft, #e5e7eb);
  padding: 2px 6px;
  border-radius: 6px;
}
.field-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #4b5563;
  margin-bottom: 6px;
}
.field-meta code {
  background: #111827;
  color: #fff;
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 12px;
}
.value-examples {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.meta-label {
  font-size: 12px;
  color: var(--s360-text-muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border-radius: 999px;
  border: 1px solid var(--s360-color-border-subtle, #d1d5db);
  padding: 2px 10px;
  font-size: 12px;
  background: var(--s360-color-surface, #fff);
}
.samples li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.pivot-grid {
  flex: 2 1 420px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.pivot-section {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  background: var(--s360-color-panel, #fdfdfd);
  display: flex;
  flex-direction: column;
  min-height: 280px;
}
.pivot-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.field-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.selected-fields {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.selected-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 13px;
}
.selected-field__actions {
  display: flex;
  gap: 4px;
}
.metrics-panel {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
}
.metrics-panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}
.dimension-panel {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dimension-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dimension-title {
  font-weight: 600;
  color: var(--s360-text-primary, #111827);
}
.dimension-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.dimension-field {
  flex: 1 1 220px;
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 10px;
  padding: 10px;
}
.dimension-field__title {
  font-weight: 600;
  margin-bottom: 8px;
}
.dimension-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow: auto;
}
.dimension-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.metric-row select {
  min-width: 180px;
  border: 1px solid var(--s360-color-border-subtle, #d1d5db);
  border-radius: 8px;
  padding: 8px;
  background: var(--s360-color-surface, #fff);
}
.metric-row .remove {
  border: 1px solid #f87171;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  background: #fef2f2;
  color: #b91c1c;
  cursor: pointer;
}
.filters-panel {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.filters-panel__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.filters-field {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 10px;
  padding: 10px;
}
.filter-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.filter-values {
  max-height: 180px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.filter-option {
  display: flex;
  align-items: center;
  gap: 6px;
}
.warning {
  border: 1px solid #f97316;
  border-radius: 10px;
  padding: 12px;
  color: #c2410c;
  background: #fff7ed;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pivot-preview {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  overflow: auto;
  background: var(--s360-color-surface, #fff);
}
.pivot-preview table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.th-content {
  position: relative;
  padding-right: 12px;
}
.column-levels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #475569;
}
.column-metric {
  font-weight: 600;
}
.resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
}
.row-resize-handle {
  position: absolute;
  right: -8px;
  bottom: 0;
  width: 16px;
  height: 8px;
  cursor: row-resize;
}
.pivot-preview th,
.pivot-preview td {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  padding: 8px;
  text-align: right;
}
.pivot-preview th:first-child,
.pivot-preview td:first-child {
  text-align: left;
}
.row-label {
  font-weight: 500;
  position: relative;
}
.row-tree {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.row-toggle {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  line-height: 18px;
  text-align: center;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}
.row-content {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.row-field {
  color: #6b7280;
  font-size: 12px;
}
.cell {
  min-width: 90px;
}
.total,
.grand-total {
  font-weight: 600;
}
.error {
  color: var(--s360-text-critical, #dc2626);
  font-size: 13px;
}
.result {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  background: var(--s360-color-panel, #f9fafb);
}
.chart-panel {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 16px;
  background: var(--s360-color-surface, #fff);
  min-height: 360px;
}
.empty-state {
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 16px;
  background: var(--s360-color-panel, #f9fafb);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.empty-state h4 {
  margin: 0;
  font-size: 16px;
}
.empty-state__tips {
  margin: 0;
  padding-left: 18px;
  color: #4b5563;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.empty-state__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #4b5563;
}
.step__subheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.viz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
details summary {
  cursor: pointer;
  margin-bottom: 8px;
}
@media (max-width: 768px) {
  .step__header {
    flex-direction: column;
  }
  .config-block {
    flex-direction: column;
    align-items: stretch;
  }
  .step__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
