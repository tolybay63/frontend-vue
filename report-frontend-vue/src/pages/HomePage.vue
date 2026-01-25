<template>
  <section class="page">
    <div class="page-heading">
      <h1>Мастер создания представления</h1>
      <button class="btn-outline" type="button" @click="returnToViews">
        Вернуться к представлениям
      </button>
    </div>

    <div class="wizard-card">
      <div>
        <div class="wizard-card__title">Шаги мастера</div>
        <p class="muted">
          Источник → Конфигурация данных → Представление. Можно менять шаги в
          любом порядке после загрузки данных.
        </p>
      </div>
    </div>

    <article ref="sourceStepRef" class="step">
      <header class="step__header">
        <div class="step__badge">1</div>
        <div>
          <h2>Источник данных</h2>
          <p class="muted">
            Выберите источник данных и задайте параметры выборки. Сначала
            загрузите таблицу, чтобы перейти к следующему шагу.
          </p>
        </div>
        <div class="step__header-actions">
          <div
            v-if="hasPlanData || (!isPivotSource && hasResultData)"
            class="step__status"
          >
            <span class="dot dot--success"></span>
            Данные загружены
          </div>
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
                <template v-if="canCreateSourceFromSearch" #action>
                  <div
                    class="select-action"
                    @mousedown.prevent
                    @click="startCreatingSource(pendingNewSourceName)"
                  >
                    Создать источник «{{ pendingNewSourceName }}»
                  </div>
                </template>
              </n-select>
            </label>
            <p class="muted combobox__hint">
              Найдите существующий источник или введите новое имя, чтобы создать
              его.
            </p>
          </div>

          <div class="source-panel__actions">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  :disabled="!canSendRequest || planLoading"
                  aria-label="Отправить запрос"
                  @click="executeCurrentSource"
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
                  :disabled="!canToggleDetails"
                  aria-label="Переключить детали"
                  @click="toggleDetails"
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
              <n-input
                v-model:value="sourceDraft.name"
                placeholder="Например: План на ноябрь"
                size="large"
              />
            </label>
            <label class="field">
              <span class="field__label">URL</span>
              <n-input
                v-model:value="sourceDraft.url"
                placeholder="/dtj/api/plan"
                size="large"
              />
            </label>
            <label class="field">
              <span class="field__label">Метод</span>
              <n-select
                v-model:value="sourceDraft.httpMethod"
                :options="httpMethodOptions"
                size="large"
              />
            </label>
          </div>

          <label class="field">
            <span class="field__label">Метод API</span>
            <n-input
              v-model:value="rpcMethod"
              placeholder="data/loadPlan"
              size="large"
            />
            <span
              v-if="
                !structuredBodyAvailable &&
                !hasPrimitiveParams &&
                !multiParamsAvailable
              "
              class="muted"
            >
              Добавьте параметры в формате объекта в «Raw body», чтобы
              редактировать их по ключам.
            </span>
          </label>

          <div v-if="!multiParamsAvailable" class="params-table__starter">
            <n-button size="small" quaternary @click="enableMultiParamTable">
              Создать таблицу
            </n-button>
            <span class="muted">
              Таблица удобна для ввода нескольких наборов параметров.
            </span>
          </div>

          <div v-if="multiParamsAvailable" class="params-table">
            <div class="params-table__actions">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    size="small"
                    quaternary
                    circle
                    aria-label="Добавить колонку"
                    @click="addMultiParamColumn"
                  >
                    <span class="icon icon-columns" />
                  </n-button>
                </template>
                Добавить колонку
              </n-tooltip>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    size="small"
                    quaternary
                    circle
                    aria-label="Добавить строку"
                    @click="addMultiParamRow"
                  >
                    <span class="icon icon-rows" />
                  </n-button>
                </template>
                Добавить строку
              </n-tooltip>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    size="small"
                    quaternary
                    :disabled="!canFillDownMultiParams"
                    circle
                    aria-label="Заполнить вниз"
                    @click="fillDownMultiParam"
                  >
                    <span class="icon icon-down" />
                  </n-button>
                </template>
                Копирует значение активной ячейки вниз по колонке.
              </n-tooltip>
            </div>
            <p class="muted params-table__hint">
              Вставляйте данные из Excel/Sheets (tab/CSV). Названия колонок
              станут ключами параметров. «Заполнить вниз» копирует значение
              активной ячейки по колонке.
            </p>
            <div class="params-table__grid">
              <div class="params-table__row params-table__row--header">
                <div class="params-table__cell params-table__cell--index">
                  #
                </div>
                <div
                  v-for="column in multiParamColumns"
                  :key="column.id"
                  class="params-table__cell params-table__cell--header"
                  :class="resolveMultiParamColumnClass(column.id)"
                >
                  <div class="params-table__header-input">
                    <n-input
                      v-model:value="column.key"
                      size="small"
                      placeholder="ключ"
                      :status="resolveMultiParamColumnStatus(column.id)"
                      @paste="handleMultiParamHeaderPaste($event, column.id)"
                    />
                    <n-button
                      quaternary
                      circle
                      size="tiny"
                      aria-label="Удалить колонку"
                      @click="removeMultiParamColumn(column.id)"
                    >
                      <span class="icon icon-close" />
                    </n-button>
                  </div>
                </div>
                <div class="params-table__cell params-table__cell--actions">
                  Действия
                </div>
              </div>
              <div
                v-for="(row, rowIndex) in multiParamRows"
                :key="row.id"
                class="params-table__row"
              >
                <div class="params-table__cell params-table__cell--index">
                  {{ rowIndex + 1 }}
                </div>
                <div
                  v-for="column in multiParamColumns"
                  :key="`${row.id}-${column.id}`"
                  class="params-table__cell"
                >
                  <n-input
                    v-model:value="row.values[column.id]"
                    size="small"
                    @focus="setActiveMultiParamCell(row.id, column.id)"
                    @keydown="
                      handleMultiParamKeydown($event, rowIndex, column.id)
                    "
                    @paste="handleMultiParamPaste($event, row.id, column.id)"
                  />
                </div>
                <div class="params-table__cell params-table__cell--actions">
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button
                        quaternary
                        circle
                        size="tiny"
                        aria-label="Дублировать строку"
                        @click="duplicateMultiParamRow(rowIndex)"
                      >
                        <span class="icon icon-duplicate" />
                      </n-button>
                    </template>
                    Дублировать строку
                  </n-tooltip>
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button
                        quaternary
                        circle
                        size="tiny"
                        aria-label="Удалить строку"
                        @click="removeMultiParamRow(rowIndex)"
                      >
                        <span class="icon icon-trash" />
                      </n-button>
                    </template>
                    Удалить строку
                  </n-tooltip>
                </div>
              </div>
            </div>
            <p v-if="multiParamColumnsWarning" class="muted">
              {{ multiParamColumnsWarning }}
            </p>
          </div>
          <div
            v-else-if="structuredBodyAvailable && parameterKeys.length"
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
            <label
              v-for="(value, index) in primitiveParams"
              :key="`primitive-${index}`"
              class="field"
            >
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

          <section class="joins-section">
            <div class="joins-section__header">
              <div>
                <span class="field__label">Связанные источники</span>
                <p class="muted">
                  Соедините текущие данные с другим источником по ключам.
                </p>
              </div>
              <n-button size="small" quaternary @click="addJoin">
                Добавить связь
              </n-button>
            </div>
            <p v-if="!sourceDraft.joins.length" class="muted">
              Связи не заданы. Нажмите «Добавить связь», чтобы выбрать второй
              источник.
            </p>
            <article
              v-for="(join, index) in sourceDraft.joins"
              :key="join.id"
              class="join-card"
            >
              <header class="join-card__header">
                <strong>Связь {{ index + 1 }}</strong>
                <n-button
                  quaternary
                  circle
                  size="small"
                  aria-label="Удалить связь"
                  @click="removeJoin(join.id)"
                >
                  <span class="icon icon-close" />
                </n-button>
              </header>
              <div class="join-card__grid">
                <label class="field">
                  <span class="field__label">Источник</span>
                  <n-select
                    v-model:value="join.targetSourceId"
                    :options="joinSourceOptions"
                    placeholder="Выберите источник"
                    size="large"
                    clearable
                  />
                </label>
                <label class="field">
                  <span class="field__label">Поле этого источника</span>
                  <n-input
                    v-model:value="join.primaryKey"
                    placeholder="Например: planId"
                    size="large"
                  />
                </label>
                <label class="field">
                  <span class="field__label">Поле связанного источника</span>
                  <n-input
                    v-model:value="join.foreignKey"
                    placeholder="Например: planId"
                    size="large"
                  />
                </label>
                <label class="field">
                  <span class="field__label">Тип соединения</span>
                  <n-select
                    v-model:value="join.joinType"
                    :options="joinTypeOptions"
                    size="large"
                  />
                </label>
                <label class="field">
                  <span class="field__label">Префикс полей</span>
                  <n-input
                    v-model:value="join.resultPrefix"
                    placeholder="Например: plan"
                    size="large"
                  />
                  <span class="muted">
                    Будет добавлен перед названием каждого поля связи.
                  </span>
                </label>
                <label class="field">
                  <span class="field__label">Список полей</span>
                  <n-input
                    :value="join.fieldsInput ?? join.fields?.join(', ') ?? ''"
                    placeholder="Например: name, status"
                    size="large"
                    @update:value="updateJoinFieldsInput(join, $event)"
                  />
                  <span class="muted">
                    Оставьте пустым, чтобы добавить все поля связанного
                    источника.
                  </span>
                </label>
              </div>
            </article>
          </section>

          <details class="pushdown-section">
            <summary class="pushdown-section__summary">
              <span>Pushdown (оптимизация upstream)</span>
              <span class="muted">метаданные для report-back</span>
            </summary>
            <div class="pushdown-section__body">
              <div class="pushdown-toggle">
                <span class="field__label">Enable pushdown</span>
                <n-switch v-model:value="sourceDraft.pushdown.enabled" />
              </div>
              <p class="muted">
                Настройка не влияет на текущие запросы. Backend применит pushdown
                только при поддержке выбранного upstream.
              </p>

              <div v-if="sourceDraft.pushdown.enabled" class="pushdown-grid">
                <label class="field">
                  <span class="field__label">Mode</span>
                  <n-select
                    v-model:value="sourceDraft.pushdown.mode"
                    :options="pushdownModeOptions"
                    size="large"
                  />
                </label>
                <label class="field">
                  <span class="field__label">Paging strategy</span>
                  <n-select
                    v-model:value="sourceDraft.pushdown.paging.strategy"
                    :options="pushdownPagingOptions"
                    size="large"
                  />
                </label>
                <label
                  v-if="sourceDraft.pushdown.paging.strategy === 'offset'"
                  class="field"
                >
                  <span class="field__label">limitPath</span>
                  <n-input
                    v-model:value="sourceDraft.pushdown.paging.limitPath"
                    placeholder="body.params.0.limit"
                  />
                </label>
                <label
                  v-if="sourceDraft.pushdown.paging.strategy === 'offset'"
                  class="field"
                >
                  <span class="field__label">offsetPath</span>
                  <n-input
                    v-model:value="sourceDraft.pushdown.paging.offsetPath"
                    placeholder="body.params.0.offset"
                  />
                </label>
                <label
                  v-if="sourceDraft.pushdown.paging.strategy === 'cursor'"
                  class="field"
                >
                  <span class="field__label">cursorPath</span>
                  <n-input
                    v-model:value="sourceDraft.pushdown.paging.cursorPath"
                    placeholder="body.params.0.cursor"
                  />
                </label>
              </div>

              <section
                v-if="sourceDraft.pushdown.enabled"
                class="pushdown-filters"
              >
                <div class="pushdown-filters__header">
                  <div>
                    <span class="field__label">Filters mapping</span>
                    <p class="muted">
                      Карта полей фильтров → путь в body.* для upstream.
                    </p>
                  </div>
                  <n-button size="small" quaternary @click="addPushdownFilter">
                    Добавить фильтр
                  </n-button>
                </div>
                <p v-if="!sourceDraft.pushdown.filters.length" class="muted">
                  Фильтры не заданы.
                </p>
                <div
                  v-for="(mapping, index) in sourceDraft.pushdown.filters"
                  :key="`pushdown-filter-${index}`"
                  class="pushdown-filter-row"
                >
                  <n-input
                    v-model:value="mapping.filterKey"
                    placeholder="requestDate"
                    size="small"
                  />
                  <n-select
                    v-model:value="mapping.op"
                    :options="pushdownOperatorOptions"
                    size="small"
                  />
                  <n-input
                    v-model:value="mapping.targetPath"
                    placeholder="body.params.0.date"
                    size="small"
                  />
                  <n-button
                    quaternary
                    circle
                    size="small"
                    aria-label="Удалить фильтр"
                    @click="removePushdownFilter(index)"
                  >
                    <span class="icon icon-close" />
                  </n-button>
                </div>
                <p v-if="pushdownFilterHasErrors" class="error">
                  Заполните filterKey и targetPath для каждого фильтра.
                </p>
              </section>

              <label v-if="sourceDraft.pushdown.enabled" class="field">
                <span class="field__label">Notes</span>
                <n-input
                  v-model:value="sourceDraft.pushdown.notes"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  placeholder="Комментарий к pushdown mapping"
                />
              </label>

              <div
                v-if="sourceDraft.pushdown.enabled"
                class="pushdown-test"
              >
                <n-button size="small" quaternary @click="runPushdownTest">
                  Test mapping locally
                </n-button>
                <div
                  v-if="pushdownTest.executed"
                  class="pushdown-test__result"
                >
                  <p class="muted">
                    Preview: {{
                      pushdownTest.preview.length
                        ? pushdownTest.preview.join(', ')
                        : 'нет путей для записи'
                    }}
                  </p>
                  <p
                    v-for="(warning, index) in pushdownTest.warnings"
                    :key="`pushdown-warning-${index}`"
                    class="error"
                  >
                    {{ warning }}
                  </p>
                </div>
              </div>

              <div class="pushdown-warning">
                Это только подсказка для report-back. Реально применится только
                если backend разрешит pushdown для этого upstream.
              </div>
            </div>
          </details>

          <div class="source-actions">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  :disabled="!canSaveSource"
                  aria-label="Сохранить источник"
                  @click="saveCurrentSource"
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
                  :disabled="!canSendRequest || planLoading"
                  aria-label="Отправить запрос"
                  @click="executeCurrentSource"
                >
                  <span class="icon icon-send" />
                </n-button>
              </template>
              Отправить запрос
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  :disabled="!canDeleteSource"
                  aria-label="Удалить источник"
                  @click="deleteCurrentSource"
                >
                  <span class="icon icon-trash" />
                </n-button>
              </template>
              Удалить источник
            </n-tooltip>
          </div>
        </div>

        <div v-if="shouldShowDetails" class="step__info">
          <p class="muted">
            {{ sourceDraft.httpMethod }} ·
            {{ sourceDraft.url || 'URL не указан' }}
          </p>
          <p v-if="structuredBodyAvailable" class="muted">
            Метод API: <strong>{{ rpcMethod || 'не указан' }}</strong>
          </p>
          <p v-if="hasPlanData" class="muted">
            Загружено записей: <strong>{{ records.length }}</strong>
          </p>
        </div>

        <p v-if="planError" class="error">{{ planError }}</p>
        <div v-if="batchJobId" class="batch-status">
          <div class="batch-status__header">
            <span>Пакетная загрузка</span>
            <span class="muted">
              Статус: {{ batchStatusLabel || 'в очереди' }}
            </span>
          </div>
          <div class="batch-status__meta">
            <span
              >Готово: {{ batchTotals.done }} из {{ batchTotals.total }}</span
            >
            <span>Прогресс: {{ Math.round(batchProgress * 100) }}%</span>
          </div>
          <button
            v-if="batchIsActive"
            class="btn-outline btn-xs"
            type="button"
            :disabled="batchCancelRequested"
            @click="cancelBatchJob"
          >
            {{ batchCancelRequested ? 'Отмена отправлена' : 'Отменить' }}
          </button>
        </div>
        <p v-else-if="planLoading" class="muted">Выполняем запрос...</p>

        <div v-if="hasResultData" class="result-tabs">
          <div class="tabs">
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeResultTab === 'preview' }"
              @click="activeResultTab = 'preview'"
            >
              Просмотр
            </button>
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeResultTab === 'json' }"
              @click="activeResultTab = 'json'"
            >
              JSON
            </button>
          </div>
          <div class="tabs__body">
            <div v-if="activeResultTab === 'preview'" class="preview-table">
              <table
                v-if="previewColumns.length && previewRows.length"
                class="table-s360"
              >
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
            <pre v-else>{{ formattedResultJson }}</pre>
          </div>
        </div>
      </div>
    </article>

    <article
      ref="configStepRef"
      v-if="isPivotSource"
      class="step"
      :class="{ 'step--disabled': !hasPlanData }"
    >
      <header class="step__header">
        <div class="step__badge">2</div>
        <div>
          <h2>Конфигурация данных</h2>
          <p class="muted">
            Настройте фильтры, строки, столбцы и агрегации — это логика, которую
            можно переиспользовать в разных представлениях.
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
                aria-label="Редактор словаря"
                @click="openDictionary"
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
          <div class="source-panel layout-panel">
            <div class="source-panel__selector">
              <label class="field">
                <span class="field__label">Конфигурации данных</span>
                <n-select
                  v-model:value="selectedConfigId"
                  :options="configOptions"
                  placeholder="Выберите конфигурацию"
                  :disabled="!configsReady"
                  filterable
                  clearable
                  size="large"
                  @search="handleConfigSearch"
                >
                  <template v-if="pendingConfigName" #action>
                    <div
                      class="select-action"
                      @mousedown.prevent
                      @click="createConfigFromSearch"
                    >
                      Создать конфигурацию «{{ pendingConfigName }}»
                    </div>
                  </template>
                </n-select>
              </label>
              <p class="muted">
                Найдите макет в списке или введите название, чтобы создать
                новый.
              </p>
            </div>
            <div class="source-panel__actions">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="large"
                    :disabled="!selectedConfigId || !configsReady"
                    aria-label="Загрузить конфигурацию"
                    @click="loadLayoutConfig"
                  >
                    <span class="icon icon-send" />
                  </n-button>
                </template>
                Загрузить конфигурацию
              </n-tooltip>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="large"
                    aria-label="Настройки макета"
                    @click="toggleLayoutDetails"
                  >
                    <span class="icon" :class="layoutDetailsIcon" />
                  </n-button>
                </template>
                {{ layoutDetailsTooltip }}
              </n-tooltip>
            </div>
          </div>

          <div
            v-if="layoutDetailsVisible"
            class="source-panel__details layout-details"
          >
            <div class="layout-details__header">
              <n-input
                v-model:value="configName"
                placeholder="Название конфигурации"
                size="large"
              />
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="large"
                    :disabled="configSaving"
                    :loading="configSaving"
                    aria-label="Сохранить конфигурацию"
                    @click="saveCurrentConfig"
                  >
                    <span class="icon icon-save" />
                  </n-button>
                </template>
                Сохранить конфигурацию
              </n-tooltip>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="large"
                    :disabled="!selectedConfigId"
                    aria-label="Удалить конфигурацию"
                    @click="deleteSelectedConfig"
                  >
                    <span class="icon icon-trash" />
                  </n-button>
                </template>
                Удалить конфигурацию
              </n-tooltip>
            </div>

            <PivotLayout
              :fields="fields"
              :rows="pivotConfig.rows"
              :columns="pivotConfig.columns"
              :filters="pivotConfig.filters"
              :metrics="pivotMetrics"
              :metric-tokens="formulaMetricTokens"
              :header-overrides="headerOverrides"
              :filter-values="filterValues"
              :filter-range-values="filterRangeValues"
              :filter-mode-store="filterModeSelections"
              :filter-visibility-store="filterVisibilityStore"
              :row-value-filters="dimensionValueFilters.rows"
              :row-range-filters="dimensionRangeFilters.rows"
              :column-value-filters="dimensionValueFilters.columns"
              :column-range-filters="dimensionRangeFilters.columns"
              :row-sorts="pivotSortState.rows"
              :column-sorts="pivotSortState.columns"
              :filter-sorts="pivotSortState.filters"
              :value-options-resolver="fieldValueOptions"
              :get-field-label="getFieldDisplayNameByKey"
              :supports-range="supportsFieldRange"
              :aggregator-options="aggregatorOptions"
              @update:rows="updateRows"
              @update:columns="updateColumns"
              @update:filters="updateFilters"
              @rename-field="handleFieldRename"
              @update-filter-values="handleFilterValuesChange"
              @update-filter-range="handleFilterRangeChange"
              @update-filter-mode="handleFilterModePreference"
              @update-filter-visibility="handleFilterVisibilityChange"
              @update-row-values="handleRowValueFiltersChange"
              @update-row-range="handleRowRangeFiltersChange"
              @update-column-values="handleColumnValueFiltersChange"
              @update-column-range="handleColumnRangeFiltersChange"
              @update-row-sort="handleRowSortChange"
              @update-column-sort="handleColumnSortChange"
              @update-filter-sort="handleFilterSortChange"
              @add-metric="addMetric"
              @move-metric="moveMetric"
              @remove-metric="removeMetric"
            />
          </div>

          <div v-if="pivotWarnings.length" class="warning">
            <p v-for="note in pivotWarnings" :key="note">{{ note }}</p>
          </div>

          <div
            v-else-if="pivotView && pivotView.rows.length"
            class="pivot-preview"
          >
            <div class="step__subheader">
              <h3>Сводная таблица</h3>
              <span class="muted">Обновляется при изменении полей</span>
            </div>
            <table>
              <thead>
                <tr v-if="metricColumnGroups.length" class="metric-header">
                  <th
                    v-for="(label, index) in rowHeaderColumns"
                    :key="`row-header-${index}`"
                    :rowspan="rowHeaderRowSpan"
                    :style="columnStyle('__rows__')"
                    class="row-header-title"
                  >
                    {{ label }}
                  </th>
                  <th
                    v-for="group in metricColumnGroups"
                    :key="`metric-${group.metric.id}`"
                    :colspan="group.span || 1"
                    class="column-field-group"
                    :title="group.metric.label || ''"
                  >
                    <span class="column-field-label">Метрика</span>
                    <span
                      class="column-field-value"
                      :title="group.metric.label || ''"
                    >
                      {{ group.metric.label }}
                    </span>
                  </th>
                  <th
                    v-if="hasRowTotals"
                    :rowspan="rowHeaderRowSpan"
                    class="column-field-group row-total-header"
                  >
                    <span class="column-field-label">Итоги</span>
                  </th>
                </tr>
                <template v-if="columnFieldRows.length">
                  <tr
                    v-for="(headerRow, rowIndex) in columnFieldRows"
                    :key="`column-header-${rowIndex}`"
                    class="column-header-row"
                  >
                    <template
                      v-for="segment in headerRow.segments"
                      :key="`segment-${rowIndex}-${segment.metricId}`"
                    >
                      <template
                        v-for="(cell, cellIndex) in segment.cells"
                        :key="`cell-${rowIndex}-${segment.metricId}-${cellIndex}`"
                      >
                        <th
                          v-if="cell.isValue"
                          :style="columnStyle(cell.styleKey)"
                          class="column-field-group"
                          :title="cell.label || ''"
                        >
                          <span class="column-field-label">{{
                            headerRow.fieldLabel
                          }}</span>
                          <span
                            class="column-field-value"
                            :title="cell.label || ''"
                          >
                            {{ cell.label }}
                          </span>
                          <span
                            class="resize-handle"
                            @mousedown.prevent="
                              startColumnResize(cell.styleKey, $event)
                            "
                          ></span>
                        </th>
                        <th
                          v-else
                          :colspan="cell.colspan"
                          class="column-field-group"
                          :title="cell.label || ''"
                        >
                          <span class="column-field-label">{{
                            headerRow.fieldLabel
                          }}</span>
                          <span
                            class="column-field-value"
                            :title="cell.label || ''"
                          >
                            {{ cell.label }}
                          </span>
                        </th>
                      </template>
                    </template>
                  </tr>
                </template>
                <tr v-else>
                  <th
                    v-for="(label, index) in rowHeaderColumns"
                    :key="`row-header-${index}`"
                    :style="columnStyle('__rows__')"
                  >
                    {{ label }}
                  </th>
                  <th
                    v-for="column in pivotView.columns"
                    :key="column.key"
                    :style="columnStyle(column.key)"
                    :title="resolveColumnHeaderLabel(column)"
                  >
                    <span :title="resolveColumnHeaderLabel(column)">
                      {{ resolveColumnHeaderLabel(column) }}
                    </span>
                  </th>
                  <template v-if="hasRowTotals">
                    <th
                      v-for="total in rowTotalHeaders"
                      :key="`row-total-${total.metricId}`"
                      class="row-total-header"
                    >
                      {{ total.label }}
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in tableRows"
                  :key="row.key"
                  :style="rowStyle(row.key)"
                >
                  <template v-if="useRowHeaderColumns">
                    <template
                      v-for="(cell, levelIndex) in rowHeaderMatrix[rowIndex] ||
                      []"
                      :key="`row-${row.key}-${levelIndex}`"
                    >
                      <td
                        v-if="cell.show"
                        :rowspan="cell.rowspan"
                        class="row-label row-header-cell"
                      >
                        <div class="row-content">
                          <span>{{ cell.value }}</span>
                        </div>
                        <span
                          v-if="levelIndex === rowHeaderCellCount - 1"
                          class="row-resize-handle"
                          @mousedown.prevent="startRowResize(row.key, $event)"
                        ></span>
                      </td>
                    </template>
                  </template>
                  <td v-else class="row-label">
                    <div
                      class="row-tree"
                      :style="{ paddingLeft: `${row.depth * 18}px` }"
                    >
                      <button
                        v-if="row.hasChildren"
                        class="row-toggle"
                        type="button"
                        @click="toggleRowCollapse(row.key)"
                      >
                        {{ isRowCollapsed(row.key) ? '+' : '−' }}
                      </button>
                      <div class="row-content">
                        <span>{{ resolveRowHeaderLabel(row) }}</span>
                      </div>
                    </div>
                    <span
                      class="row-resize-handle"
                      @mousedown.prevent="startRowResize(row.key, $event)"
                    ></span>
                  </td>
                  <td v-for="cell in row.cells" :key="cell.key" class="cell">
                    <ConditionalCellValue
                      :display="cell.display"
                      :formatting="cell.formatting"
                    />
                  </td>
                  <template v-if="hasRowTotals">
                    <td
                      v-for="total in filteredRowTotals(row)"
                      :key="`row-${row.key}-${total.metricId}`"
                      class="total"
                    >
                      <ConditionalCellValue
                        :display="total.display"
                        :formatting="total.formatting"
                      />
                    </td>
                  </template>
                </tr>
              </tbody>
              <tfoot v-if="hasColumnTotals || hasRowTotals">
                <tr>
                  <td class="total-label">
                    {{ hasColumnTotals ? 'Итого по столбцам' : 'Итоги' }}
                  </td>
                  <td
                    v-for="column in pivotView.columns"
                    :key="`total-${column.key}`"
                    class="total"
                  >
                    <template v-if="hasColumnTotals">
                      <ConditionalCellValue
                        v-if="shouldShowColumnTotal(column.metricId)"
                        :display="column.totalDisplay"
                        :formatting="column.totalFormatting"
                      />
                      <span v-else>—</span>
                    </template>
                  </td>
                  <template v-if="hasRowTotals">
                    <td
                      v-for="total in rowTotalHeaders"
                      :key="`grand-${total.metricId}`"
                      class="grand-total"
                    >
                      <ConditionalCellValue
                        :display="grandTotalDisplay(total.metricId)"
                        :formatting="grandTotalFormatting(total.metricId)"
                      />
                    </td>
                  </template>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-else class="empty-state">
            <h4>Нет данных для этой комбинации полей</h4>
            <p>
              Проверьте выбранные значения фильтров и метрик. Если фильтры не
              нужны, очистите их — таблица построится по всем загруженным
              строкам.
            </p>
            <ul class="empty-state__tips">
              <li>Попробуйте выбрать другие поля в строках или столбцах.</li>
              <li>Очистите значения фильтров, чтобы вернуть все записи.</li>
              <li>
                Убедитесь, что в источнике есть данные за заданный период.
              </li>
            </ul>
            <div class="empty-state__meta">
              <span>Загружено строк: {{ records.length }}</span>
              <span>После фильтрации: {{ filteredPlanRecords.length }}</span>
            </div>
            <button
              class="btn-outline btn-sm"
              type="button"
              :disabled="!hasSelectedFilterValues"
              @click="resetFilterValues"
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
          <h2>Представление</h2>
          <p class="muted">
            Настройте визуализацию и сохраните представление для повторного
            использования на страницах.
          </p>
        </div>
      </header>

      <div class="step__body">
        <div class="presentation-context">
          <div class="context-item">
            <span class="context-label">Источник</span>
            <button
              class="link-btn"
              type="button"
              :disabled="!selectedSource"
              @click="jumpToSource"
            >
              {{ selectedSource?.name || 'Не выбран' }}
            </button>
          </div>
          <div class="context-item">
            <span class="context-label">Конфигурация</span>
            <div class="context-actions">
              <button
                class="link-btn"
                type="button"
                :disabled="!selectedConfig"
                @click="jumpToConfig"
              >
                {{ selectedConfig?.name || 'Не выбрана' }}
              </button>
              <button
                class="link-btn link-btn--muted"
                type="button"
                :disabled="!selectedConfig"
                @click="quickEditConfig"
              >
                Быстрое редактирование
              </button>
            </div>
          </div>
        </div>
        <div class="source-panel presentation-panel">
          <div class="source-panel__selector">
            <label class="field">
              <span class="field__label">Представления</span>
              <n-select
                v-model:value="selectedPresentationId"
                :options="presentationOptions"
                placeholder="Выберите или начните вводить представление"
                filterable
                clearable
                class="combobox"
                size="large"
                :disabled="!canManagePresentations"
                :loading="presentationsLoading"
                @search="handlePresentationSearch"
              >
                <template v-if="canCreatePresentationFromSearch" #action>
                  <div
                    class="select-action"
                    @mousedown.prevent
                    @click="createPresentationFromSearch"
                  >
                    Создать представление «{{ pendingPresentationName }}»
                  </div>
                </template>
              </n-select>
            </label>
            <p class="muted combobox__hint">
              Выберите сохранённое представление или введите новое название.
            </p>
          </div>
          <div class="source-panel__actions">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  :disabled="!canLoadPresentation"
                  aria-label="Показать представление"
                  @click="loadPresentationRecord"
                >
                  <span class="icon icon-send" />
                </n-button>
              </template>
              Показать представление
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  :disabled="!canManagePresentations"
                  aria-label="Детали представления"
                  @click="togglePresentationDetails"
                >
                  <span class="icon" :class="presentationDetailsIcon" />
                </n-button>
              </template>
              {{ presentationDetailsTooltip }}
            </n-tooltip>
          </div>
        </div>

        <div
          v-if="presentationDetailsVisible"
          class="source-panel__details layout-details"
        >
          <div class="layout-details__header">
            <n-input
              v-model:value="presentationName"
              placeholder="Название представления"
              size="large"
            />
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  size="large"
                  :disabled="!canSavePresentation"
                  :loading="presentationSaving"
                  aria-label="Сохранить представление"
                  @click="savePresentation"
                >
                  <span class="icon icon-save" />
                </n-button>
              </template>
              Сохранить представление
            </n-tooltip>
          </div>
          <div class="viz-grid">
            <label class="field">
              <span class="field__label">Тип визуализации</span>
              <n-select
                v-model:value="selectedVisualizationId"
                :options="visualizationTypeOptions"
                :loading="visualizationTypesLoading"
                placeholder="Выберите тип"
                :disabled="
                  !canManagePresentations || !visualizationTypeOptions.length
                "
                size="large"
              />
            </label>
            <label class="field viz-grid__wide">
              <span class="field__label">Описание</span>
              <n-input
                v-model:value="presentationDescription"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="Это описание увидят другие пользователи"
              />
            </label>
          </div>
        </div>

        <div class="step__actions">
          <button
            v-if="isPivotSource"
            class="btn-outline"
            type="button"
            :disabled="!pivotReady"
            @click="exportToCsv"
          >
            Выгрузить в Excel (CSV)
          </button>
          <button
            v-if="isPivotSource"
            class="btn-outline"
            type="button"
            :disabled="!pivotReady"
            @click="swapPivotAxes"
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
      <section
        v-for="group in dictionaryGroups"
        :key="group.title"
        class="dictionary-group"
      >
        <header class="dictionary-group__title">
          {{ group.title || 'Без группы' }}
        </header>
        <div class="dictionary-group__list">
          <div
            v-for="item in group.items"
            :key="item.key"
            class="dictionary-row"
          >
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
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NButton, NTooltip, NSelect, NInput, NModal, NSwitch } from 'naive-ui'
import ReportChart from '@/components/ReportChart.vue'
import PivotLayout from '@/components/PivotLayout.vue'
import ConditionalCellValue from '@/components/ConditionalCellValue.vue'
import { sendDataSourceRequest } from '@/shared/api/dataSource'
import { createBatch, getBatchStatus, cancelBatch } from '@/shared/api/batch'
import {
  fetchBackendView,
  isPivotBackendEnabled,
  normalizeBackendView,
} from '@/shared/services/reportViewBackend'
import {
  loadReportConfigurations,
  loadReportPresentations,
  saveReportConfiguration,
  saveComplexMetric,
  saveReportPresentation,
  deleteComplexEntity,
  deleteObjectWithProperties,
  ROW_TOTAL_META,
  COLUMN_TOTAL_META,
} from '@/shared/api/report'
import { fetchFactorValues } from '@/shared/api/objects'
import { useDataSourcesStore } from '@/shared/stores/dataSources'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import { useNavigationStore } from '@/shared/stores/navigation'
import { useEntityArchiveStore } from '@/shared/stores/entityArchive'
import { trackEvent } from '@/shared/lib/analytics'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'
import {
  buildPivotView,
  humanizeKey,
  normalizeValue,
  formatValue,
  augmentPivotViewWithFormulas,
  extractFormulaMetricIds,
  filterPivotViewByVisibility,
  DATE_PARTS,
  buildDatePartKey,
  parseDatePartKey,
  resolvePivotFieldValue,
  resolveDatePartValue,
  formatDatePartFieldLabel,
} from '@/shared/lib/pivotUtils'
import {
  applyConditionalFormattingToView,
  normalizeConditionalFormatting,
} from '@/shared/lib/conditionalFormatting'
import {
  createJoinTemplate,
  normalizeJoinList,
  mergeJoinedRecords,
  fetchJoinPayload,
  extractJoinsFromBody,
  parseJoinConfig,
} from '@/shared/lib/sourceJoins'

const dataSourcesStore = useDataSourcesStore()
const fieldDictionaryStore = useFieldDictionaryStore()
const navigationStore = useNavigationStore()
const pageBuilderStore = usePageBuilderStore()
const archiveStore = useEntityArchiveStore()
const dataSources = computed(() => dataSourcesStore.sources)
const dataSource = ref('')
const vizType = ref('table')
const visualizationTypes = ref([])
const visualizationTypesLoading = ref(false)
const selectedVisualizationId = ref('')
const presentationName = ref('')
const presentationDescription = ref('')
const presentationSaving = ref(false)
const result = ref(null)
const isCreatingSource = ref(false)
const sourceSearch = ref('')
const pendingNewSourceName = ref('')
const sourceStepRef = ref(null)
const configStepRef = ref(null)

function sourceArchiveKey(source) {
  if (!source) return ''
  const raw =
    source.remoteMeta?.id ??
    source.remoteMeta?.Id ??
    source.remoteMeta?.ID ??
    source.id
  if (raw === null || typeof raw === 'undefined') return ''
  return String(raw).trim()
}

function isSourceArchived(source) {
  return archiveStore.isArchived('source', sourceArchiveKey(source))
}
const EMPTY_BODY_TEMPLATE = JSON.stringify(
  {
    method: '',
    params: [{}],
  },
  null,
  2,
)
const REQUEST_FIELD_PREFIX = 'request'
const HTTP_METHOD_FALLBACKS = ['POST', 'GET', 'PUT', 'PATCH']
const joinTypeOptions = [
  { label: 'LEFT (все строки основного источника)', value: 'left' },
  { label: 'INNER (только совпадения)', value: 'inner' },
]
const pushdownModeOptions = [
  { label: 'JSON-RPC params', value: 'jsonrpc_params' },
  { label: 'REST query', value: 'rest_query' },
]
const pushdownPagingOptions = [
  { label: 'offset', value: 'offset' },
  { label: 'cursor', value: 'cursor' },
]
const pushdownOperatorOptions = [
  { label: '=', value: 'eq' },
  { label: 'in', value: 'in' },
  { label: 'range', value: 'range' },
]
const FORMULA_ALLOWED_CHARS = /^[0-9+\-*/().<>=!&|?:,_\s]+$/
const FORMULA_STRING_LITERAL_PATTERN = /(["'])(?:\\.|(?!\1).)*\1/g
const FORMULA_TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g
const MAX_CONCURRENT_REQUESTS =
  Number(import.meta.env.VITE_MAX_SOURCE_REQUESTS) || 4
const BATCH_THRESHOLD = Number(import.meta.env.VITE_BATCH_THRESHOLD) || 0
const BATCH_POLL_MS = Number(import.meta.env.VITE_BATCH_POLL_MS) || 2000
const sourceDraft = reactive(createBlankSource())
const rawBodyError = ref('')
const structuredBodyAvailable = ref(false)
const rpcMethod = ref('')
const bodyParams = reactive({})
const bodyParamTypes = reactive({})
const primitiveParams = ref([])
const multiParamsAvailable = ref(false)
const multiParamColumns = ref([])
const multiParamRows = ref([])
const activeMultiParamCell = reactive({ rowId: '', columnId: '' })
const activeResultTab = ref('preview')
const detailsVisible = ref(false)
const paramContainerType = ref('array')
const showDictionaryModal = ref(false)
const dictionaryGrouping = ref('alphabet')
const dictionarySearch = ref('')
const pushdownTest = reactive({
  executed: false,
  preview: [],
  warnings: [],
})
const router = useRouter()
const route = useRoute()
const routePrefill = reactive({
  sourceId: '',
  configId: '',
  presentationId: '',
  appliedSource: true,
  appliedConfig: true,
  appliedPresentation: true,
  executedSource: true,
  loadedConfig: true,
  loadedPresentation: true,
})
const hasRoutePrefill = ref(false)
const routeActions = reactive({
  createSource: false,
  createConfig: false,
})
const pendingConfigCreation = ref(false)

onMounted(() => {
  trackEvent('constructor_open', { section: 'wizard' })
  dataSourcesStore.fetchRemoteSources()
  dataSourcesStore.fetchMethodTypes()
  dataSourcesStore.fetchUserContext()
  fieldDictionaryStore.fetchDictionary()
  fetchAggregatorFactors()
  fetchVisualizationTypes()
})

function returnToViews() {
  router.push('/templates')
}

watch(
  () => route.query,
  (query) => {
    const sourceId = extractRouteParam(query.sourceId)
    const configId = extractRouteParam(query.configId)
    const presentationId = extractRouteParam(query.presentationId)
    routeActions.createSource = extractRouteFlag(query.createSource)
    routeActions.createConfig = extractRouteFlag(query.createConfig)
    routePrefill.sourceId = sourceId
    routePrefill.configId = configId
    routePrefill.presentationId = presentationId
    routePrefill.appliedSource = !sourceId
    routePrefill.appliedConfig = !configId
    routePrefill.appliedPresentation = !presentationId
    routePrefill.executedSource = !sourceId
    routePrefill.loadedConfig = !configId
    routePrefill.loadedPresentation = !presentationId
    hasRoutePrefill.value = Boolean(sourceId || configId || presentationId)
  },
  { immediate: true },
)

const records = ref([])
const fields = ref([])
const dimensionFieldKeys = computed(() => {
  const keys = []
  fields.value.forEach((field) => {
    if (!field?.key) return
    keys.push(field.key)
    if (field.type === 'date' && Array.isArray(field.dateParts)) {
      field.dateParts.forEach((part) => {
        if (part?.key) {
          keys.push(part.key)
        }
      })
    }
  })
  return keys
})
const planLoading = ref(false)
const planError = ref('')
const batchJobId = ref('')
const batchStatus = ref('')
const batchTotals = reactive({ total: 0, done: 0 })
const batchProgress = ref(0)
const batchResultsSummary = ref(null)
const batchResultsFileRef = ref('')
const batchCancelRequested = ref(false)
let batchPollToken = 0
const selectedSource = computed(
  () =>
    dataSources.value.find((source) => source.id === dataSource.value) || null,
)
const canDeleteSource = computed(() => {
  if (!selectedSource.value || isCreatingSource.value) return false
  const remoteId = toNumericValue(
    selectedSource.value.remoteMeta?.id ??
      selectedSource.value.remoteMeta?.Id ??
      selectedSource.value.remoteMeta?.ID,
  )
  return Number.isFinite(remoteId)
})
const selectableSources = computed(() => {
  const selectedId = dataSource.value
  return dataSources.value.filter((source) => {
    if (!source) return false
    if (source.id === selectedId) return true
    return !isSourceArchived(source)
  })
})
const sourceOptions = computed(() =>
  selectableSources.value.map((source) => ({
    label: source.name,
    value: source.id,
  })),
)
const joinSourceOptions = computed(() =>
  selectableSources.value.map((source) => ({
    label: source.name,
    value: source.id,
    disabled: source.id === sourceDraft.id || source.id === dataSource.value,
  })),
)
const pivotSourceIds = computed(() =>
  dataSources.value
    .filter((source) => source.supportsPivot !== false)
    .map((source) => source.id),
)
const isPivotSource = computed(() => {
  if (isCreatingSource.value) return true
  return pivotSourceIds.value.includes(dataSource.value)
})
const pivotBackendEnabled = isPivotBackendEnabled()
const pivotBackendActive = computed(() => pivotBackendEnabled)
const debugLogsEnabled =
  String(import.meta.env.VITE_DEBUG_LOGS || '').toLowerCase() === 'true'
const hasResultData = computed(() => {
  const value = result.value
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(value)
})
const hasPlanData = computed(
  () => isPivotSource.value && fields.value.length > 0,
)
const hasSourceContext = computed(
  () => Boolean(selectedSource.value) || isCreatingSource.value,
)
const shouldShowDetails = computed(
  () => hasSourceContext.value && detailsVisible.value,
)
const canCreateSourceFromSearch = computed(() =>
  Boolean(pendingNewSourceName.value),
)
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
const multiParamColumnMeta = computed(() => {
  const meta = {}
  const counts = {}
  multiParamColumns.value.forEach((column) => {
    const key = String(column.key || '').trim()
    if (key) {
      counts[key] = (counts[key] || 0) + 1
    }
  })
  multiParamColumns.value.forEach((column) => {
    const key = String(column.key || '').trim()
    meta[column.id] = {
      key,
      empty: !key,
      duplicate: Boolean(key && counts[key] > 1),
    }
  })
  return meta
})
const multiParamColumnsWarning = computed(() => {
  const meta = multiParamColumnMeta.value
  const emptyCount = Object.values(meta).filter((item) => item.empty).length
  const duplicateKeys = Array.from(
    new Set(
      Object.values(meta)
        .filter((item) => item.duplicate)
        .map((item) => item.key),
    ),
  ).filter(Boolean)
  if (!emptyCount && !duplicateKeys.length) return ''
  const parts = []
  if (emptyCount) {
    parts.push('Есть пустые названия колонок. Они будут пропущены.')
  }
  if (duplicateKeys.length) {
    parts.push(
      `Повторяющиеся колонки: ${duplicateKeys.join(', ')}. Дубли будут пропущены.`,
    )
  }
  return parts.join(' ')
})
const canFillDownMultiParams = computed(() =>
  Boolean(activeMultiParamCell.rowId && activeMultiParamCell.columnId),
)
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
  fields.value.forEach((field) => unique.add(field.key))
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
      items: items.sort((a, b) =>
        a.key.localeCompare(b.key, 'ru', { sensitivity: 'base' }),
      ),
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
const httpMethodOptions = computed(() => {
  const remoteTypes = dataSourcesStore.methodTypes || []
  if (remoteTypes.length) {
    const options = remoteTypes
      .map((type) => ({
        label: type.name || type.code,
        value: type.code || type.name?.toUpperCase?.(),
      }))
      .filter((option) => option.value)
    const currentValue = sourceDraft.httpMethod
    if (
      currentValue &&
      !options.find((option) => option.value === currentValue)
    ) {
      options.unshift({ label: currentValue, value: currentValue })
    }
    return options
  }
  return HTTP_METHOD_FALLBACKS.map((method) => ({
    label: method,
    value: method,
  }))
})
const formattedResultJson = computed(() => {
  if (!hasResultData.value) return ''
  try {
    return JSON.stringify(result.value, null, 2)
  } catch {
    return String(result.value)
  }
})
const previewColumns = computed(() => {
  if (fields.value.length) {
    return fields.value.map((field) => ({
      ...field,
      label: getFieldDisplayName(field),
    }))
  }
  const firstRecord = records.value[0]
  if (firstRecord && typeof firstRecord === 'object') {
    return Object.keys(firstRecord).map((key) => ({
      key,
      label: getFieldDisplayNameByKey(key),
    }))
  }
  return []
})
const previewRows = computed(() => records.value.slice(0, 100))

const pivotConfig = reactive({
  filters: [],
  rows: [],
  columns: [],
})

const filterValues = reactive({})
const filterRangeValues = reactive({})
const filterModeSelections = reactive({})
const filterVisibilityStore = reactive({})
const pivotMetrics = reactive([])
const pivotMetricsVersion = ref(0)
const dimensionValueFilters = reactive({
  rows: {},
  columns: {},
})
const dimensionRangeFilters = reactive({
  rows: {},
  columns: {},
})
const pivotSortState = reactive({
  rows: {},
  columns: {},
  filters: {},
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

const FALLBACK_AGGREGATORS = {
  count: { label: 'Количество', fvFieldVal: 1350, pvFieldVal: 1570 },
  sum: { label: 'Сумма', fvFieldVal: 1349, pvFieldVal: 1569 },
  avg: { label: 'Среднее', fvFieldVal: 1351, pvFieldVal: 1571 },
  value: { label: 'Значение', fvFieldVal: 0, pvFieldVal: 0 },
}
const aggregatorRecords = ref([])
const aggregatorMap = computed(() => {
  const map = {}
  aggregatorRecords.value.forEach((record) => {
    const key = detectAggregatorKey(record)
    if (!key) return
    map[key] = {
      label: formatAggregatorLabel(record.name, key),
      fvFieldVal:
        toNumericValue(record.id) || FALLBACK_AGGREGATORS[key]?.fvFieldVal || 0,
      pvFieldVal:
        toNumericValue(record.pv) || FALLBACK_AGGREGATORS[key]?.pvFieldVal || 0,
    }
  })
  if (!Object.keys(map).length) {
    return FALLBACK_AGGREGATORS
  }
  Object.entries(FALLBACK_AGGREGATORS).forEach(([key, meta]) => {
    if (!map[key]) {
      map[key] = meta
    }
  })
  return map
})
const aggregatorOptions = computed(() =>
  Object.entries(aggregatorMap.value).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
)
const reportConfigs = ref([])
const configsLoading = ref(false)
const configsReady = ref(false)
const configSaving = ref(false)
const selectedConfigId = ref('')
const configName = ref('')
const layoutDetailsVisible = ref(false)
const configSearch = ref('')
const pendingConfigName = ref('')
const currentConfigMeta = ref(null)
const presentations = ref([])
const presentationsLoading = ref(false)
const presentationsReady = ref(false)
const selectedPresentationId = ref('')
const presentationSearch = ref('')
const pendingPresentationName = ref('')
const presentationDetailsVisible = ref(false)
const currentPresentationMeta = ref(null)

function configArchiveKey(config) {
  if (!config) return ''
  const raw =
    config.remoteMeta?.id ??
    config.remoteMeta?.Id ??
    config.remoteId ??
    config.id
  if (raw === null || typeof raw === 'undefined') return ''
  return String(raw).trim()
}

function isConfigArchived(config) {
  return archiveStore.isArchived('config', configArchiveKey(config))
}

const currentSourceParentId = computed(() => {
  const remoteId = selectedSource.value?.remoteMeta?.id
  const fallback = selectedSource.value?.id
  const numericId = Number(remoteId || fallback)
  return Number.isFinite(numericId) ? numericId : null
})

const currentConfigRemoteId = computed(() => {
  const raw =
    currentConfigMeta.value?.id ??
    currentConfigMeta.value?.Id ??
    currentConfigMeta.value?.ID ??
    currentConfigMeta.value?.idReportConfiguration
  const numericId = Number(raw)
  return Number.isFinite(numericId) ? numericId : null
})

const filteredConfigs = computed(() => {
  if (!configsReady.value) return []
  const parentId = currentSourceParentId.value
  if (!parentId) return []
  return reportConfigs.value.filter((cfg) => {
    if (cfg.parent !== parentId) return false
    if (cfg.id === selectedConfigId.value) return true
    return !isConfigArchived(cfg)
  })
})

const configOptions = computed(() =>
  filteredConfigs.value.map((cfg) => ({
    label: cfg.name,
    value: cfg.id,
  })),
)

const filteredPresentations = computed(() => {
  if (!presentationsReady.value) return []
  return presentations.value
})

const presentationOptions = computed(() =>
  filteredPresentations.value.map((item) => ({
    label: item.name,
    value: item.id,
  })),
)

const selectedConfig = computed(
  () =>
    reportConfigs.value.find((cfg) => cfg.id === selectedConfigId.value) ||
    null,
)

const selectedPresentation = computed(
  () =>
    filteredPresentations.value.find(
      (item) => item.id === selectedPresentationId.value,
    ) || null,
)

const visualizationTypeOptions = computed(() =>
  visualizationTypes.value
    .map((record) => {
      const value = getVisualizationOptionId(record)
      if (!value) return null
      return {
        label: formatVisualizationLabel(record),
        value,
      }
    })
    .filter(Boolean),
)

const selectedVisualization = computed(
  () =>
    visualizationTypes.value.find(
      (record) =>
        getVisualizationOptionId(record) === selectedVisualizationId.value,
    ) || null,
)

watch(
  dataSources,
  (list) => {
    if (!list.length) {
      if (!isCreatingSource.value) {
        dataSource.value = ''
      }
      return
    }
    if (!routePrefill.appliedSource && routePrefill.sourceId) {
      const match = list.find(
        (item) => String(item.id) === routePrefill.sourceId,
      )
      if (match) {
        dataSource.value = match.id
        routePrefill.sourceId = ''
      }
      routePrefill.appliedSource = true
      if (match) return
    }
    if (!isCreatingSource.value) {
      const available = selectableSources.value
      if (!available.find((item) => item.id === dataSource.value)) {
        dataSource.value = available[0]?.id || ''
      }
    }
  },
  { immediate: true },
)

watch(
  () => routeActions.createSource,
  (next) => {
    if (!next) return
    startCreatingSource()
    clearCreationFlags()
  },
  { immediate: true },
)

watch(
  () => routeActions.createConfig,
  (next) => {
    if (!next) return
    pendingConfigCreation.value = true
    clearCreationFlags()
  },
  { immediate: true },
)

watch(
  () => pendingConfigCreation.value && hasPlanData.value && isPivotSource.value,
  (ready) => {
    if (!ready) return
    pendingConfigCreation.value = false
    layoutDetailsVisible.value = true
    scrollToConfigStep()
  },
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

watch(filteredConfigs, (list) => {
  if (!list.length) return
  if (!routePrefill.appliedConfig && routePrefill.configId) {
    const match = list.find(
      (cfg) =>
        cfg.id === routePrefill.configId ||
        String(cfg.remoteId ?? cfg.remoteMeta?.id) === routePrefill.configId,
    )
    if (match) {
      selectedConfigId.value = match.id
      routePrefill.configId = ''
    }
    routePrefill.appliedConfig = true
  }
})

watch(filteredPresentations, (list) => {
  if (!list.length) return
  if (!routePrefill.appliedPresentation && routePrefill.presentationId) {
    const match = list.find(
      (entry) =>
        entry.id === routePrefill.presentationId ||
        String(entry.remoteMeta?.id ?? entry.remoteId) ===
          routePrefill.presentationId,
    )
    if (match) {
      selectedPresentationId.value = match.id
      routePrefill.presentationId = ''
    }
    routePrefill.appliedPresentation = true
  }
})

watch(
  () =>
    hasRoutePrefill.value &&
    routePrefill.appliedSource &&
    !routePrefill.executedSource &&
    Boolean(dataSource.value) &&
    !isCreatingSource.value,
  async (shouldRun) => {
    if (!shouldRun) return
    routePrefill.executedSource = true
    try {
      await executeCurrentSource()
    } catch (err) {
      console.warn('Failed to auto execute source', err)
    }
  },
  { immediate: true },
)

watch(
  () =>
    hasRoutePrefill.value &&
    routePrefill.appliedConfig &&
    !routePrefill.loadedConfig &&
    Boolean(selectedConfigId.value) &&
    configsReady.value,
  (shouldRun) => {
    if (!shouldRun) return
    routePrefill.loadedConfig = true
    loadLayoutConfig()
  },
  { immediate: true },
)

watch(
  () =>
    hasRoutePrefill.value &&
    routePrefill.appliedPresentation &&
    !routePrefill.loadedPresentation &&
    canLoadPresentation.value,
  (shouldRun) => {
    if (!shouldRun) return
    routePrefill.loadedPresentation = true
    loadPresentationRecord()
  },
  { immediate: true },
)

watch(
  () =>
    routePrefill.appliedSource &&
    routePrefill.appliedConfig &&
    routePrefill.appliedPresentation &&
    routePrefill.executedSource &&
    routePrefill.loadedConfig &&
    routePrefill.loadedPresentation &&
    hasRoutePrefill.value,
  (ready) => {
    if (!ready) return
    clearRoutePrefill()
    hasRoutePrefill.value = false
  },
)

watch(
  () => selectedConfigId.value,
  (id) => {
    if (!id) {
      configName.value = ''
      currentConfigMeta.value = null
      presentationName.value = ''
      presentationDescription.value = ''
      return
    }
    const entry = reportConfigs.value.find((cfg) => cfg.id === id)
    if (entry) {
      configName.value = entry.name || ''
      currentConfigMeta.value = entry.remoteMeta || null
    }
    presentationName.value = ''
    presentationDescription.value = ''
  },
)

watch(
  () => currentConfigRemoteId.value,
  (parent) => {
    resetPresentationEditor()
    if (!parent) {
      presentations.value = []
      presentationsReady.value = false
      return
    }
    fetchReportPresentations(parent)
  },
  { immediate: true },
)

watch(selectedPresentation, (entry) => {
  if (!entry) {
    presentationName.value = ''
    presentationDescription.value = ''
    currentPresentationMeta.value = null
    return
  }
  presentationName.value = entry.name || ''
  presentationDescription.value = entry.description || ''
  currentPresentationMeta.value = entry.remoteMeta || null
})
const supportedChartTypes = ['bar', 'line', 'pie']
const chartPalette = [
  '#2b6cb0',
  '#f97316',
  '#0ea5e9',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
]

watch(
  () => sourceSearch.value,
  (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      pendingNewSourceName.value = ''
      return
    }
    const match = selectableSources.value.find(
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

watch(
  () => selectedVisualizationId.value,
  () => {
    const record = selectedVisualization.value
    vizType.value = resolveVisualizationChartType(record)
  },
)

watch(visualizationTypes, () => {
  if (!visualizationTypes.value.length) {
    selectedVisualizationId.value = ''
    vizType.value = 'table'
    return
  }
  if (!selectedVisualizationId.value || !selectedVisualization.value) {
    autoSelectVisualizationType()
    return
  }
  vizType.value = resolveVisualizationChartType(selectedVisualization.value)
})

let syncingFromBody = false
let syncingFromEditors = false
let syncingFromEditorsTimer = null

watch(
  () => sourceDraft.rawBody,
  (raw) => {
    if (syncingFromEditors) return
    const value = raw?.trim()
    if (!value) {
      rawBodyError.value = ''
      structuredBodyAvailable.value = false
      multiParamsAvailable.value = false
      syncingFromBody = true
      rpcMethod.value = ''
      paramContainerType.value = 'array'
      syncReactiveObject(bodyParams, {})
      syncReactiveObject(bodyParamTypes, {})
      primitiveParams.value = []
      multiParamColumns.value = []
      multiParamRows.value = []
      syncingFromBody = false
      return
    }
    try {
      const parsed = JSON.parse(value)
      rawBodyError.value = ''
      const methodValue = typeof parsed.method === 'string' ? parsed.method : ''
      const tableEntries = extractMultiParamEntries(parsed)
      const isTableBody =
        tableEntries.length > 0 || isEmptyMultiParamTable(parsed)
      let paramPayload = null
      let container = 'array'
      if (!isTableBody) {
        if (Array.isArray(parsed.params)) {
          const firstEntry = parsed.params[0]
          if (
            firstEntry &&
            typeof firstEntry === 'object' &&
            !Array.isArray(firstEntry)
          ) {
            paramPayload = firstEntry
          } else if (parsed.params.length) {
            primitiveParams.value = parsed.params.map((item) =>
              formatPrimitiveParam(item),
            )
          }
        } else if (parsed.params && typeof parsed.params === 'object') {
          paramPayload = parsed.params
          container = 'object'
        }
      }
      syncingFromBody = true
      rpcMethod.value = methodValue
      paramContainerType.value = container
      multiParamsAvailable.value = isTableBody
      structuredBodyAvailable.value = Boolean(paramPayload)
      if (isTableBody) {
        primitiveParams.value = []
        syncMultiParamTable(tableEntries)
      } else if (!paramPayload) {
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
      multiParamsAvailable.value = false
      syncingFromBody = true
      paramContainerType.value = 'array'
      syncReactiveObject(bodyParams, {})
      syncReactiveObject(bodyParamTypes, {})
      primitiveParams.value = []
      multiParamColumns.value = []
      multiParamRows.value = []
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
    setRawBodyFromEditors(parsed)
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
    setRawBodyFromEditors(parsed)
  },
  { deep: true },
)

watch(
  () => ({
    method: rpcMethod.value,
    columns: multiParamColumns.value.map((column) => column.key),
    rows: multiParamRows.value.map((row) => ({ ...row.values })),
  }),
  ({ method }) => {
    if (syncingFromBody) return
    if (!multiParamsAvailable.value) return
    syncMultiParamBody(method)
  },
  { deep: true },
)

watch(dimensionFieldKeys, (validKeys) => {
  ;['filters', 'rows', 'columns'].forEach((section) => {
    pivotConfig[section] = pivotConfig[section].filter((key) =>
      validKeys.includes(key),
    )
    syncSortStore(pivotSortState[section], pivotConfig[section])
  })
  pivotMetrics.forEach((metric) => {
    if (metric.type === 'formula') return
    if (metric.fieldKey && !validKeys.includes(metric.fieldKey)) {
      metric.fieldKey = ''
    }
  })
  pivotMetricsVersion.value += 1
})

watch(
  () => [...pivotConfig.filters],
  (next, prev) => {
    next.forEach((key) => {
      if (!filterValues[key]) filterValues[key] = []
      if (!(key in filterVisibilityStore)) {
        filterVisibilityStore[key] = false
      }
    })
    prev.forEach((key) => {
      if (!next.includes(key)) {
        delete filterValues[key]
        delete filterRangeValues[key]
        delete filterVisibilityStore[key]
      }
    })
    cleanupRangeEntries(filterRangeValues, next)
    syncSortStore(pivotSortState.filters, next)
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
  cleanupRangeEntries(dimensionRangeFilters[type], keys)
}

function syncSortStore(store, keys) {
  Object.keys(store).forEach((key) => {
    if (!keys.includes(key)) {
      delete store[key]
    }
  })
}

function cleanupRangeEntries(store = {}, allowedKeys = []) {
  Object.keys(store).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      delete store[key]
    }
  })
}

watch(
  () => [...pivotConfig.rows],
  (keys) => {
    syncDimensionFilters('rows', keys)
    syncSortStore(pivotSortState.rows, keys)
    resetRowCollapse()
  },
  { deep: true },
)

watch(
  () => [...pivotConfig.columns],
  (keys) => {
    syncDimensionFilters('columns', keys)
    syncSortStore(pivotSortState.columns, keys)
  },
  { deep: true },
)

watch(
  () => fields.value,
  (fields) => {
    if (
      fields.length &&
      pivotMetrics.length === 1 &&
      pivotMetrics[0].type !== 'formula' &&
      !pivotMetrics[0].fieldKey
    ) {
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
    const metricKeys = pivotMetrics
      .map((metric) => metric.fieldKey)
      .filter(Boolean)
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
  pivotMetrics,
  () => {
    ensureMetricExists()
    pivotMetricsVersion.value += 1
  },
  { deep: true },
)

const fieldsMap = computed(() => {
  return fields.value.reduce((acc, field) => {
    acc.set(field.key, field)
    return acc
  }, new Map())
})

function baseFieldDescriptor(key) {
  if (!key) return null
  return fieldsMap.value.get(key) || null
}

function resolveDimensionDescriptor(key) {
  if (!key) return null
  const meta = parseDatePartKey(key)
  if (!meta) return baseFieldDescriptor(key)
  const base = baseFieldDescriptor(meta.fieldKey)
  if (!base) return null
  return {
    ...base,
    key,
    type: 'string',
    datePart: meta.part,
    dateSourceKey: meta.fieldKey,
    values: (base.datePartValues && base.datePartValues[meta.part]) || [],
  }
}

function supportsFieldRange(key) {
  const descriptor = resolveDimensionDescriptor(key)
  if (!descriptor) return false
  return descriptor.type === 'number' || descriptor.type === 'date'
}

function isDefinedRangeValue(value) {
  return !(value === null || typeof value === 'undefined' || value === '')
}

function cloneRange(range = {}) {
  if (!range || typeof range !== 'object') {
    return { start: null, end: null }
  }
  return {
    start: isDefinedRangeValue(range.start) ? range.start : null,
    end: isDefinedRangeValue(range.end) ? range.end : null,
  }
}

function sanitizeRange(range = {}) {
  const copy = cloneRange(range)
  if (!hasActiveRange(copy)) return null
  return copy
}

function hasActiveRange(range) {
  if (!range || typeof range !== 'object') return false
  return isDefinedRangeValue(range.start) || isDefinedRangeValue(range.end)
}

function rangeStoreHasValues(store = {}) {
  return Object.values(store).some((range) => hasActiveRange(range))
}

function inferRangeType(range, descriptor = null) {
  if (descriptor?.type) return descriptor.type
  if (!range || typeof range !== 'object') return ''
  if (typeof range.start === 'number' || typeof range.end === 'number') {
    return 'number'
  }
  if (typeof range.start === 'string' || typeof range.end === 'string') {
    return 'date'
  }
  return ''
}

function normalizeComparableValue(value, type) {
  if (value === null || typeof value === 'undefined') return null
  if (type === 'number') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
  if (type === 'date') {
    return parseDateValue(value)
  }
  return null
}

function parseDateValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const str = String(value).trim()
  if (!str) return null
  const dottedMatch = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dottedMatch) {
    const [, day, month, year] = dottedMatch
    const isoString = `${year}-${month}-${day}T00:00:00Z`
    const timestamp = Date.parse(isoString)
    return Number.isFinite(timestamp) ? timestamp : null
  }
  const parsed = Date.parse(str)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeRangeBoundary(value, type, bound = 'start') {
  if (!isDefinedRangeValue(value)) return null
  if (type === 'number') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
  if (type === 'date') {
    const timestamp = parseDateValue(value)
    if (!Number.isFinite(timestamp)) return null
    if (bound === 'end') {
      return timestamp + 86399999
    }
    return timestamp
  }
  return null
}

function valueSatisfiesRange(rawValue, range, descriptor = null) {
  if (!hasActiveRange(range)) return true
  const type = inferRangeType(range, descriptor)
  if (!type) return true
  const comparable = normalizeComparableValue(rawValue, type)
  if (comparable === null) return false
  const start = normalizeRangeBoundary(range.start, type, 'start')
  if (start !== null && comparable < start) return false
  const end = normalizeRangeBoundary(range.end, type, 'end')
  if (end !== null && comparable > end) return false
  return true
}

const preparedMetrics = computed(() => {
  pivotMetricsVersion.value
  return pivotMetrics
    .map((metric) => {
      if (metric.type === 'formula') {
        const label = metric.title?.trim() || 'Формула'
        return {
          ...metric,
          label,
          field: null,
        }
      }
      const field = fieldsMap.value.get(metric.fieldKey)
      if (!field || !metric.fieldKey) return null
      const baseLabel = metric.title?.trim()
        ? metric.title.trim()
        : aggregatorLabel(metric.aggregator, field)
      return {
        ...metric,
        label: baseLabel,
        field,
      }
    })
    .filter((metric) => {
      if (!metric) return false
      if (metric.type === 'formula') {
        return Boolean(metric.expression?.trim())
      }
      return Boolean(metric.fieldKey)
    })
})

const computationBaseMetrics = computed(() =>
  preparedMetrics.value.filter((metric) => metric.type !== 'formula'),
)
const computationFormulaMetrics = computed(() =>
  preparedMetrics.value.filter((metric) => metric.type === 'formula'),
)
const visibleMetrics = computed(() =>
  preparedMetrics.value.filter((metric) => metric.enabled !== false),
)
const formulaMetricTokens = computed(() =>
  computationBaseMetrics.value.map((metric) => ({
    id: metric.id,
    label: metric.label,
  })),
)

function matchesFieldFilters(record, fieldsList, valueStore, rangeStore = {}) {
  return fieldsList.every((fieldKey) => {
    const selectedValues = valueStore[fieldKey]
    if (selectedValues && selectedValues.length) {
      const resolvedValue = resolvePivotFieldValue(record, fieldKey)
      const normalizedRecordValue = normalizeValue(resolvedValue)
      if (!selectedValues.includes(normalizedRecordValue)) {
        return false
      }
    }
    const range = rangeStore[fieldKey]
    if (range && hasActiveRange(range)) {
      const fieldDescriptor = resolveDimensionDescriptor(fieldKey)
      const resolvedValue = resolvePivotFieldValue(record, fieldKey)
      if (!valueSatisfiesRange(resolvedValue, range, fieldDescriptor)) {
        return false
      }
    }
    return true
  })
}

const filteredPlanRecords = computed(() => {
  if (!records.value.length) return []
  return records.value.filter((record) => {
    if (
      !matchesFieldFilters(
        record,
        pivotConfig.filters,
        filterValues,
        filterRangeValues,
      )
    ) {
      return false
    }
    if (
      !matchesFieldFilters(
        record,
        pivotConfig.rows,
        dimensionValueFilters.rows,
        dimensionRangeFilters.rows,
      )
    ) {
      return false
    }
    if (
      !matchesFieldFilters(
        record,
        pivotConfig.columns,
        dimensionValueFilters.columns,
        dimensionRangeFilters.columns,
      )
    ) {
      return false
    }
    return true
  })
})

const pivotWarnings = computed(() => {
  const messages = []
  if (!records.value.length && !pivotBackendActive.value) {
    messages.push('Загрузите данные плана, чтобы построить сводную таблицу.')
  }
  if (!pivotConfig.rows.length && !pivotConfig.columns.length) {
    messages.push('Добавьте хотя бы одно поле в строки или столбцы.')
  }
  if (!preparedMetrics.value.length) {
    messages.push('Добавьте хотя бы одну метрику.')
  }
  if (!visibleMetrics.value.length) {
    messages.push('Включите отображение хотя бы одной метрики.')
  }
  if (!computationBaseMetrics.value.length) {
    messages.push('Минимум одна метрика должна ссылаться на поле источника.')
  }
  computationBaseMetrics.value.forEach((metric) => {
    if (
      metric.field?.type !== 'number' &&
      metric.aggregator !== 'count' &&
      metric.aggregator !== 'value'
    ) {
      messages.push(
        `Метрика «${metric.label}» требует числовое поле. Выберите другое поле или агрегат.`,
      )
    }
  })
  const baseIds = new Set(
    computationBaseMetrics.value.map((metric) => metric.id),
  )
  computationFormulaMetrics.value.forEach((metric) => {
    const error = validateFormulaDefinition(metric, baseIds)
    if (error) messages.push(error)
  })
  return messages
})

function validateFormulaDefinition(metric, baseIds = new Set()) {
  const label = metric.title?.trim() || metric.label || metric.id
  const trimmed = metric.expression?.trim()
  if (!trimmed) {
    return `Укажите формулу для метрики «${label}».`
  }
  const tokens = extractFormulaMetricIds(trimmed)
  if (!tokens.length) {
    return `Формула «${label}» должна содержать ссылки на базовые метрики в виде {{ID}}.`
  }
  const missing = tokens.filter((token) => !baseIds.has(token))
  if (missing.length) {
    return `Формула «${label}» содержит неизвестные метрики: ${missing.join(', ')}.`
  }
  const sanitized = sanitizeFormulaExpression(trimmed)
  if (!FORMULA_ALLOWED_CHARS.test(sanitized)) {
    return `Формула «${label}» содержит недопустимые символы. Доступны цифры, пробелы, операции, сравнения и тернарный оператор.`
  }
  return ''
}

function sanitizeFormulaExpression(value = '') {
  if (!value) return ''
  return value
    .replace(FORMULA_TOKEN_REGEX, '')
    .replace(FORMULA_STRING_LITERAL_PATTERN, '')
}

const backendPivotState = reactive({
  view: null,
  chart: null,
  error: '',
  loading: false,
  signature: '',
  inFlightSignature: '',
})

function resolveBackendTemplateId() {
  const raw =
    currentPresentationMeta.value?.id ??
    currentPresentationMeta.value?.Id ??
    currentPresentationMeta.value?.ID ??
    selectedPresentationId.value ??
    currentConfigRemoteId.value ??
    selectedConfigId.value ??
    sourceDraft.id ??
    ''
  return raw ? String(raw) : ''
}

function buildBackendRemoteSource() {
  if (!sourceDraft?.url) return null
  const method = String(
    sourceDraft.httpMethod || sourceDraft.method || 'POST',
  ).toUpperCase()
  const parsed = sourceDraft.rawBody ? safeJsonParse(sourceDraft.rawBody) : null
  const body = parsed?.ok ? parsed.value : sourceDraft.rawBody || ''
  const remoteId =
    sourceDraft.remoteId ||
    sourceDraft.remoteMeta?.id ||
    sourceDraft.remoteMeta?.Id ||
    sourceDraft.remoteMeta?.ID ||
    ''
  const pushdownPayload = buildPushdownPayload(sourceDraft.pushdown)
  return {
    id: sourceDraft.id || '',
    remoteId,
    name: sourceDraft.name || '',
    description: sourceDraft.description || '',
    method,
    url: sourceDraft.url || '',
    body,
    headers: sourceDraft.headers || {},
    joins: normalizeJoinList(sourceDraft.joins || []),
    rawBody: sourceDraft.rawBody || '',
    remoteMeta: sourceDraft.remoteMeta || {},
    ...(pushdownPayload ? { pushdown: pushdownPayload } : {}),
  }
}

function buildBackendSnapshot() {
  return {
    pivot: {
      filters: [...pivotConfig.filters],
      rows: [...pivotConfig.rows],
      columns: [...pivotConfig.columns],
    },
    metrics: pivotMetrics.map((metric) => ({
      ...metric,
      conditionalFormatting: normalizeConditionalFormatting(
        metric.conditionalFormatting,
      ),
    })),
    filterValues: copyFilterStore(filterValues),
    filterRanges: copyRangeStore(filterRangeValues),
    dimensionValues: {
      rows: copyFilterStore(dimensionValueFilters.rows),
      columns: copyFilterStore(dimensionValueFilters.columns),
    },
    dimensionRanges: {
      rows: copyRangeStore(dimensionRangeFilters.rows),
      columns: copyRangeStore(dimensionRangeFilters.columns),
    },
    options: {
      headerOverrides: { ...headerOverrides },
      sorts: {
        filters: cloneSortState(pivotSortState.filters),
        rows: cloneSortState(pivotSortState.rows),
        columns: cloneSortState(pivotSortState.columns),
      },
    },
    filtersMeta: buildFiltersMetaSnapshot(),
    fieldMeta: buildFieldMetaSnapshot(),
    filterModes: copyModeStore(filterModeSelections),
    chartSettings: {},
    conditionalFormatting: [],
  }
}

function buildBackendFilters() {
  return {
    globalFilters: {
      values: copyFilterStore(filterValues),
      ranges: copyRangeStore(filterRangeValues),
    },
    containerFilters: {
      values: {},
      ranges: {},
    },
  }
}

const backendPayload = computed(() => {
  if (!pivotBackendActive.value) return null
  if (pivotWarnings.value.length) return null
  if (!computationBaseMetrics.value.length) return null
  const remoteSource = buildBackendRemoteSource()
  if (!remoteSource) return null
  return {
    templateId: resolveBackendTemplateId(),
    remoteSource,
    snapshot: buildBackendSnapshot(),
    filters: buildBackendFilters(),
  }
})

const suppressBackendErrors = computed(
  () => batchStatus.value === 'done' && records.value.length > 0,
)

const backendSignature = computed(() =>
  backendPayload.value ? JSON.stringify(backendPayload.value) : '',
)

watch(
  () => backendSignature.value,
  async (signature) => {
    if (!signature) {
      backendPivotState.view = null
      backendPivotState.chart = null
      backendPivotState.error = ''
      backendPivotState.loading = false
      backendPivotState.signature = ''
      backendPivotState.inFlightSignature = ''
      return
    }
    if (backendPivotState.signature === signature) return
    if (
      backendPivotState.loading &&
      backendPivotState.inFlightSignature === signature
    ) {
      return
    }
    backendPivotState.signature = signature
    backendPivotState.inFlightSignature = signature
    backendPivotState.loading = true
    backendPivotState.error = ''
    backendPivotState.view = null
    backendPivotState.chart = null
    // TODO: pivot расчёт перенесён на FastAPI-бэк (/api/report/view).
    // Локальный buildPivotView оставлен как fallback до полной миграции.
    try {
      const { view, chart } = await fetchBackendView({
        ...backendPayload.value,
        silent: suppressBackendErrors.value,
      })
      if (
        !view ||
        (!Array.isArray(view.rows) && !Array.isArray(view.columns))
      ) {
        throw new Error('Backend view payload is empty.')
      }
      const normalized = normalizeBackendView(
        view,
        computationBaseMetrics.value,
      )
      if (!normalized?.rows?.length && filteredPlanRecords.value.length) {
        throw new Error('Backend view has no rows.')
      }
      backendPivotState.view = normalized
      backendPivotState.chart = chart || null
    } catch (err) {
      if (!suppressBackendErrors.value) {
        console.warn('Failed to build backend pivot view', err)
      }
      backendPivotState.error =
        err?.message || 'Не удалось построить сводную таблицу.'
      backendPivotState.view = null
      backendPivotState.chart = null
    } finally {
      backendPivotState.loading = false
      if (backendPivotState.inFlightSignature === signature) {
        backendPivotState.inFlightSignature = ''
      }
    }
  },
  { immediate: true },
)

const basePivotResult = computed(() => {
  if (pivotWarnings.value.length) return { view: null, errorMetricId: null }
  if (pivotBackendActive.value) {
    if (backendPivotState.view) {
      const backendRows = backendPivotState.view.rows || []
      if (!backendRows.length && filteredPlanRecords.value.length) {
        // fallback to local pivot if backend view is empty but we have data
      } else {
        return { view: backendPivotState.view, errorMetricId: null }
      }
    }
    if (!backendPivotState.error) {
      return { view: null, errorMetricId: null }
    }
  }
  if (!filteredPlanRecords.value.length)
    return { view: null, errorMetricId: null }
  if (!computationBaseMetrics.value.length)
    return { view: null, errorMetricId: null }
  return buildBasePivotView()
})

const pivotView = computed(() => {
  const { view, errorMetricId } = basePivotResult.value
  if (!view || errorMetricId) return null
  const withFormulas = augmentPivotViewWithFormulas(view, preparedMetrics.value)
  const filtered = filterPivotViewByVisibility(
    withFormulas,
    preparedMetrics.value,
  )
  return applyConditionalFormattingToView(filtered, preparedMetrics.value)
})

watch(
  () => basePivotResult.value.errorMetricId,
  (metricId) => {
    if (metricId) {
      planError.value = buildValueAggregationMessage(metricId)
    } else if (
      planError.value &&
      planError.value.startsWith('Метрика «') &&
      !pivotWarnings.value.length
    ) {
      planError.value = ''
    }
  },
)
const pivotReady = computed(() =>
  Boolean(pivotView.value && pivotView.value.rows.length),
)
const canUseVizSettings = computed(() =>
  isPivotSource.value ? pivotReady.value : hasResultData.value,
)
const canManagePresentations = computed(
  () => isPivotSource.value && Boolean(currentConfigRemoteId.value),
)
const canLoadPresentation = computed(
  () => canManagePresentations.value && Boolean(selectedPresentationId.value),
)
const canCreatePresentationFromSearch = computed(
  () => Boolean(pendingPresentationName.value) && canManagePresentations.value,
)
const batchIsActive = computed(() =>
  ['queued', 'running'].includes(batchStatus.value),
)
const batchHasBlockingIssue = computed(
  () =>
    Boolean(batchResultsFileRef.value) ||
    batchStatus.value === 'failed' ||
    batchStatus.value === 'cancelled',
)
const batchStatusLabel = computed(() => {
  const map = {
    queued: 'в очереди',
    running: 'выполняется',
    done: 'готово',
    failed: 'ошибка',
    cancelled: 'отменено',
  }
  return map[batchStatus.value] || batchStatus.value
})
const canSavePresentation = computed(() => {
  if (!canManagePresentations.value) return false
  if (!presentationDetailsVisible.value) return false
  if (!presentationName.value.trim()) return false
  if (!selectedVisualization.value) return false
  if (batchIsActive.value || batchHasBlockingIssue.value) return false
  return !presentationSaving.value
})
const hasSelectedFilterValues = computed(
  () =>
    Object.values(filterValues).some((values) => values && values.length) ||
    rangeStoreHasValues(filterRangeValues),
)
const rowHeaderTitle = computed(() => {
  if (!pivotConfig.rows.length) return 'Строки'
  return pivotConfig.rows
    .map((key) => getFieldDisplayNameByKey(key))
    .join(' › ')
})
const rowHeaderFields = computed(() => {
  if (!pivotConfig.rows.length) return ['Строки']
  return pivotConfig.rows.map((key) => getFieldDisplayNameByKey(key))
})
const hasRowTree = computed(() => Boolean(pivotView.value?.rowTree?.length))
const useRowHeaderColumns = computed(
  () => !hasRowTree.value && rowHeaderFields.value.length > 1,
)
const rowHeaderColumns = computed(() =>
  useRowHeaderColumns.value ? rowHeaderFields.value : [rowHeaderTitle.value],
)
const rowHeaderCellCount = computed(() => rowHeaderFields.value.length)
const metricColumnGroups = computed(() => {
  const view = pivotView.value
  if (!view) return []
  const columns = view.columns || []
  if (!columns.length) return []
  return visibleMetrics.value.map((metric) => {
    const entries = columns.filter((column) => column.metricId === metric.id)
    return {
      metric,
      entries,
      span: entries.length || 1,
    }
  })
})
const columnFieldRows = computed(() => {
  const groups = metricColumnGroups.value
  const columnFields = pivotConfig.columns
  if (!groups.length || !columnFields.length) return []
  return columnFields.map((fieldKey, levelIndex) => {
    const fieldLabel = getFieldDisplayNameByKey(fieldKey)
    const isValue = levelIndex === columnFields.length - 1
    const segments = groups.map((group) => {
      const entries = group.entries
      const cells = isValue
        ? entries.map((column) => ({
            label: getColumnLevelValue(column, levelIndex),
            colspan: 1,
            styleKey: column.key,
            isValue: true,
          }))
        : groupColumnsByLevel(entries, levelIndex).map((cell) => ({
            label: cell.label,
            colspan: cell.colspan,
            isValue: false,
          }))
      return { metricId: group.metric.id, cells }
    })
    return { fieldLabel, segments }
  })
})
const rowHeaderRowSpan = computed(() => {
  const metricRows = metricColumnGroups.value.length ? 1 : 0
  const fieldRows = columnFieldRows.value.length
  const total = metricRows + fieldRows
  return total || 1
})
const layoutDetailsIcon = computed(() =>
  layoutDetailsVisible.value ? 'icon-close' : 'icon-gear',
)
const layoutDetailsTooltip = computed(() =>
  layoutDetailsVisible.value ? 'Скрыть детали' : 'Детали конфигурации',
)
const presentationDetailsIcon = computed(() =>
  presentationDetailsVisible.value ? 'icon-close' : 'icon-gear',
)
const presentationDetailsTooltip = computed(() =>
  presentationDetailsVisible.value
    ? 'Скрыть детали представления'
    : 'Детали представления',
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
    depth: Array.isArray(row.levels) ? Math.max(row.levels.length - 1, 0) : 0,
    hasChildren: false,
    cells: row.cells,
    totals: row.totals,
    levels: row.levels || [],
    values: row.values || [],
  }))
})
const rowHeaderMatrix = computed(() => {
  if (!useRowHeaderColumns.value) return []
  const rows = tableRows.value
  if (!rows.length) return []
  const levelCount = rowHeaderFields.value.length
  if (!levelCount) return []
  const valuesList = rows.map((row) => resolveRowLevelValues(row, levelCount))
  const matrix = valuesList.map((values) =>
    values.map((value) => ({
      value,
      rowspan: 1,
      show: true,
    })),
  )
  const hasSamePrefix = (left, right, depth) => {
    for (let index = 0; index < depth; index += 1) {
      if (left[index] !== right[index]) return false
    }
    return true
  }
  for (let level = 0; level < levelCount; level += 1) {
    let start = 0
    while (start < rows.length) {
      const current = valuesList[start]
      const value = current[level]
      let span = 1
      let next = start + 1
      while (
        next < rows.length &&
        valuesList[next][level] === value &&
        hasSamePrefix(current, valuesList[next], level)
      ) {
        span += 1
        next += 1
      }
      matrix[start][level].rowspan = span
      for (let index = start + 1; index < start + span; index += 1) {
        matrix[index][level].show = false
        matrix[index][level].rowspan = 0
      }
      start += span
    }
  }
  return matrix
})

const rowTotalMetricIds = computed(() =>
  visibleMetrics.value
    .filter((metric) => metric.showRowTotals)
    .map((metric) => metric.id),
)
const columnTotalMetricIds = computed(() =>
  visibleMetrics.value
    .filter((metric) => metric.showColumnTotals)
    .map((metric) => metric.id),
)
const rowTotalMetricSet = computed(() => new Set(rowTotalMetricIds.value))
const columnTotalMetricSet = computed(() => new Set(columnTotalMetricIds.value))
const hasRowTotals = computed(() => rowTotalMetricIds.value.length > 0)
const hasColumnTotals = computed(() => columnTotalMetricIds.value.length > 0)
const rowTotalHeaders = computed(() => {
  const view = pivotView.value
  if (!view) return []
  const allowed = rowTotalMetricSet.value
  return view.rowTotalHeaders.filter((header) => allowed.has(header.metricId))
})

function filteredRowTotals(row) {
  const allowed = rowTotalMetricSet.value
  return row.totals.filter((total) => allowed.has(total.metricId))
}
function shouldShowColumnTotal(metricId) {
  return columnTotalMetricSet.value.has(metricId)
}
function grandTotalEntry(metricId) {
  return pivotView.value?.grandTotals?.[metricId] || null
}
function grandTotalDisplay(metricId) {
  const entry = grandTotalEntry(metricId)
  return entry?.display ?? '—'
}
function grandTotalFormatting(metricId) {
  return grandTotalEntry(metricId)?.formatting || null
}

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
  const labels = view.rows.map((row) => resolveRowHeaderLabel(row) || '—')
  let datasets = []

  if (view.columns.length) {
    datasets = view.columns.map((column, index) => {
      const color = chartPalette[index % chartPalette.length]
      const data = view.rows.map((row) => {
        const cell = row.cells[index]
        return typeof cell?.value === 'number' ? Number(cell.value) : 0
      })
      return {
        label: formatColumnEntryLabel(column),
        data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 2,
        tension: 0.3,
        fill: vizType.value !== 'line',
      }
    })
  }

  if (!datasets.length && rowTotalHeaders.value.length) {
    datasets = rowTotalHeaders.value.map((header, index) => {
      const color = chartPalette[index % chartPalette.length]
      const data = view.rows.map((row) => {
        const total = row.totals.find(
          (item) => item.metricId === header.metricId,
        )
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
    const pieColors = labels.map(
      (_, idx) => chartPalette[idx % chartPalette.length],
    )
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

function scrollToStep(target) {
  if (!target || typeof target.scrollIntoView !== 'function') return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToSourceStep() {
  scrollToStep(sourceStepRef.value)
}

function scrollToConfigStep() {
  scrollToStep(configStepRef.value)
}

function jumpToSource() {
  scrollToSourceStep()
}

function jumpToConfig() {
  scrollToConfigStep()
}

function quickEditConfig() {
  layoutDetailsVisible.value = true
  scrollToConfigStep()
}

function openDictionary() {
  showDictionaryModal.value = true
}

async function saveCurrentSource() {
  if (!canSaveSource.value) return
  const payload = {
    id: sourceDraft.id,
    name: sourceDraft.name.trim(),
    url: sourceDraft.url.trim(),
    httpMethod: sourceDraft.httpMethod?.toUpperCase?.() || 'POST',
    rawBody: sourceDraft.rawBody.trim(),
    headers: {
      'Content-Type': 'application/json',
      ...(sourceDraft.headers || {}),
    },
    supportsPivot: sourceDraft.supportsPivot !== false,
    joins: normalizeJoinList(sourceDraft.joins || []),
    pushdown: sourceDraft.pushdown,
  }
  try {
    const result = await dataSourcesStore.saveSource(payload)
    const savedId = result?.id || payload.id
    trackEvent('source_saved', { id: String(savedId || '') })
    dataSource.value = String(savedId)
    isCreatingSource.value = false
    pendingNewSourceName.value = ''
    if (result?.syncPromise?.then) {
      result.syncPromise
        .then(async (remoteId) => {
          if (!remoteId) return
          const normalized = String(remoteId)
          const match =
            dataSources.value.find(
              (source) => String(source.remoteMeta?.id) === normalized,
            ) || dataSources.value.find((source) => source.id === normalized)
          const nextId = match?.id || normalized
          if (nextId && dataSource.value !== nextId) {
            dataSource.value = nextId
          }
          if (match?.remoteMeta?.id) {
            try {
              await executeCurrentSource()
            } catch (err) {
              console.warn('Failed to auto execute source', err)
            }
          }
        })
        .catch(() => {
          alert(
            'Источник сохранён только локально. Сервер не подтвердил сохранение, поэтому макет будет недоступен, пока источник не синхронизируется.',
          )
        })
    }
  } catch (err) {
    trackEvent('source_save_error', {
      message: String(err?.message || err),
    })
    alert(
      'Не удалось сохранить источник. Проверьте соединение или попробуйте позже.',
    )
  }
}

async function countPresentationsForSource(sourceId) {
  const numericId = Number(sourceId)
  if (!Number.isFinite(numericId)) return 0
  try {
    const [configRecords, presentationRecords] = await Promise.all([
      loadReportConfigurations(),
      loadReportPresentations(),
    ])
    const configIds = new Set()
    configRecords.forEach((entry) => {
      const parentId = toNumericValue(
        entry?.parent ?? entry?.parentId ?? entry?.Parent,
      )
      if (parentId !== numericId) return
      const configId = toNumericValue(entry?.id ?? entry?.Id ?? entry?.ID)
      if (Number.isFinite(configId)) {
        configIds.add(configId)
      }
    })
    if (!configIds.size) return 0
    return presentationRecords.reduce((count, entry) => {
      const parent = toNumericValue(
        entry?.parent ?? entry?.parentId ?? entry?.Parent,
      )
      if (Number.isFinite(parent) && configIds.has(parent)) {
        return count + 1
      }
      return count
    }, 0)
  } catch (err) {
    console.warn('Failed to resolve source usage', err)
    return 0
  }
}

async function countPresentationsForConfig(configId) {
  const numericId = Number(configId)
  if (!Number.isFinite(numericId)) return 0
  try {
    const presentationRecords = await loadReportPresentations()
    return presentationRecords.reduce((count, entry) => {
      const parent = toNumericValue(
        entry?.parent ?? entry?.parentId ?? entry?.Parent,
      )
      if (parent === numericId) return count + 1
      return count
    }, 0)
  } catch (err) {
    console.warn('Failed to resolve config usage', err)
    return 0
  }
}

async function deleteCurrentSource() {
  const source = selectedSource.value
  if (!source) return
  const remoteId = toNumericValue(
    source.remoteMeta?.id || source.remoteMeta?.Id || source.remoteMeta?.ID,
  )
  if (!Number.isFinite(remoteId)) {
    alert('Удалить можно только источник, сохранённый на сервере.')
    return
  }
  const usageCount = await countPresentationsForSource(remoteId)
  if (usageCount > 0) {
    alert(
      `Нельзя удалить источник: используется в ${usageCount} представлениях. Используйте архивирование.`,
    )
    trackEvent('source_delete_blocked', {
      id: String(remoteId),
      usageCount,
    })
    return
  }
  if (
    !confirm(
      `Удалить источник «${source.name || 'Без названия'}»? Это действие нельзя отменить.`,
    )
  ) {
    return
  }
  try {
    await deleteObjectWithProperties(remoteId)
    dataSourcesStore.removeSource(source.id)
    archiveStore.restoreEntity('source', sourceArchiveKey(source))
    trackEvent('source_deleted', { id: String(remoteId) })
    if (dataSource.value === source.id) {
      dataSource.value = ''
      resetSourceDraft()
      records.value = []
      fields.value = []
      result.value = null
    }
  } catch (err) {
    console.warn('Failed to delete data source', err)
    trackEvent('source_delete_error', {
      id: String(remoteId),
      message: String(err?.message || err),
    })
    alert('Не удалось удалить источник. Попробуйте позже.')
  }
}

async function executeCurrentSource() {
  await loadFields()
}

function isValidUserContext(ctx) {
  return (
    Number.isFinite(Number(ctx?.objUser)) &&
    Number.isFinite(Number(ctx?.pvUser))
  )
}

async function resolveUserContext() {
  let context = dataSourcesStore.userContext
  if (!isValidUserContext(context)) {
    context = await dataSourcesStore.fetchUserContext()
  }
  if (!isValidUserContext(context)) {
    context = await dataSourcesStore.fetchUserContext(true)
  }
  return isValidUserContext(context) ? context : null
}

async function loadFields() {
  if (planLoading.value) return
  const batchCandidate = buildBatchPayloadFromConfig(sourceDraft)
  const batchEligible =
    String(sourceDraft.httpMethod || '').toUpperCase() !== 'GET'
  const shouldUseBatch =
    batchEligible &&
    batchCandidate?.paramsList &&
    batchCandidate.paramsList.length > BATCH_THRESHOLD

  const requestPayloads = shouldUseBatch ? [] : resolveCurrentRequestPayload()
  if (!shouldUseBatch && !requestPayloads) return

  const joins = normalizeJoinList(sourceDraft.joins || [])
  configsReady.value = false
  planLoading.value = true
  planError.value = ''
  resetBatchState()
  try {
    let baseRecords = []
    if (shouldUseBatch) {
      if (batchCandidate.error) {
        planError.value = batchCandidate.error
        return
      }
      const batchStatusResult = await runBatchJob(batchCandidate.payload, {
        paramsList: batchCandidate.paramsList,
        trackUI: true,
      })
      if (!batchStatusResult) return
      const batchRecords = buildRecordsFromBatchStatus(
        batchStatusResult,
        batchCandidate.paramsList,
        { reportErrors: true },
      )
      if (!batchRecords) {
        records.value = []
        fields.value = []
        result.value = null
        return
      }
      baseRecords = batchRecords
    } else {
      const responses = await executeSourceRequests(requestPayloads)
      baseRecords = responses.flatMap((response, index) => {
        const rows = extractRecordsFromResponse(response)
        return applyRequestFields(rows, requestPayloads[index]?.meta?.fields)
      })
    }
    let mergedRecords = baseRecords
    let joinErrors = []
    if (joins.length && baseRecords.length) {
      const joinResults = await fetchJoinResults(joins)
      const successful = joinResults.filter((item) => !item.error)
      if (successful.length) {
        const joinRecordsList = successful.map((item) => item.records || [])
        const appliedJoins = successful.map((item) => joins[item.index])
        const { records: enriched } = mergeJoinedRecords(
          baseRecords,
          appliedJoins,
          joinRecordsList,
        )
        mergedRecords = enriched
      }
      joinErrors = joinResults
        .filter((item) => item.error)
        .map((item) => item.error)
    }
    records.value = mergedRecords
    fields.value = extractFieldDescriptors(mergedRecords)
    result.value = mergedRecords
    if (joinErrors.length) {
      planError.value = joinErrors.join('\n')
    }
    ensureMetricExists()
    activeResultTab.value = 'preview'
    if (isPivotSource.value) {
      await fetchReportConfigs(currentSourceParentId.value)
    } else {
      configsReady.value = false
      reportConfigs.value = []
    }
  } catch (err) {
    if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
      planError.value = buildValueAggregationMessage(err.metricId)
    } else {
      planError.value =
        err?.response?.data?.message ||
        err?.message ||
        'Не удалось загрузить данные источника.'
    }
    trackEvent('source_request_error', {
      message: String(err?.message || err),
      totalRequests: requestPayloads?.length || 0,
    })
    records.value = []
    fields.value = []
    result.value = null
  } finally {
    planLoading.value = false
  }
}

async function executeRequestBatches(entries = [], executor) {
  const limit = Math.max(1, MAX_CONCURRENT_REQUESTS)
  const responses = []
  for (let index = 0; index < entries.length; index += limit) {
    const batch = entries.slice(index, index + limit)
    const batchResponses = await Promise.all(batch.map(executor))
    responses.push(...batchResponses)
  }
  return responses
}

async function executeSourceRequests(requestPayloads = []) {
  return executeRequestBatches(requestPayloads, (entry) =>
    sendDataSourceRequest(entry.request),
  )
}

function resetBatchState() {
  batchPollToken += 1
  batchJobId.value = ''
  batchStatus.value = ''
  batchTotals.total = 0
  batchTotals.done = 0
  batchProgress.value = 0
  batchResultsSummary.value = null
  batchResultsFileRef.value = ''
  batchCancelRequested.value = false
}

function updateBatchState(status = {}) {
  batchJobId.value = status.job_id || batchJobId.value
  batchStatus.value = status.status || batchStatus.value
  batchTotals.total = Number(status.total) || batchTotals.total
  batchTotals.done = Number(status.done) || batchTotals.done
  batchProgress.value =
    typeof status.progress === 'number'
      ? status.progress
      : batchTotals.total
        ? batchTotals.done / batchTotals.total
        : 0
  batchResultsSummary.value = status.resultsSummary || null
  batchResultsFileRef.value = status.resultsFileRef || ''
  batchCancelRequested.value = Boolean(status.cancelRequested)
}

async function runBatchJob(payload, { paramsList = [], trackUI = false } = {}) {
  const token = trackUI ? batchPollToken + 1 : 0
  if (trackUI) {
    batchPollToken = token
  }
  const created = await createBatch(payload)
  const jobId = created?.job_id
  if (!jobId) {
    if (trackUI) {
      planError.value = 'Не удалось запустить пакетную обработку.'
    }
    return null
  }
  if (trackUI) {
    updateBatchState({
      job_id: jobId,
      status: 'queued',
      total: paramsList.length,
      done: 0,
      progress: 0,
    })
  }
  while (true) {
    const status = await getBatchStatus(jobId)
    if (trackUI && batchPollToken === token) {
      updateBatchState(status)
    }
    if (!status || !status.status) {
      return null
    }
    if (['queued', 'running'].includes(status.status)) {
      await waitFor(BATCH_POLL_MS)
      if (trackUI && batchPollToken !== token) {
        return null
      }
      continue
    }
    return status
  }
}

function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildRecordsFromBatchStatus(
  status,
  paramsList = [],
  { reportErrors } = {},
) {
  if (!status || !status.status) return null
  if (status.status === 'failed') {
    if (reportErrors) {
      planError.value =
        'Часть параметров завершилась с ошибкой. Уточните фильтры и повторите запрос.'
    }
    return null
  }
  if (status.status === 'cancelled') {
    if (reportErrors) {
      planError.value = 'Пакетная загрузка отменена.'
    }
    return null
  }
  if (status.resultsFileRef) {
    if (reportErrors) {
      planError.value =
        'Результат слишком большой. Разбейте параметры на партии или добавьте фильтры. Для выгрузки нужен отдельный endpoint.'
    }
    return null
  }
  if (!Array.isArray(status.results)) {
    if (reportErrors && status.status === 'done') {
      planError.value = 'Результат пакетной загрузки недоступен.'
      return null
    }
    return []
  }
  const fieldMaps = paramsList.map((params) =>
    buildRequestFieldsFromParams(params),
  )
  return status.results.flatMap((item, index) => {
    if (!item || item.ok === false) return []
    const rows = extractRecordsFromResponse(item.data)
    const fields = fieldMaps[index] || {}
    return applyRequestFields(rows, fields)
  })
}

async function cancelBatchJob() {
  if (!batchJobId.value || !batchIsActive.value) return
  batchCancelRequested.value = true
  try {
    await cancelBatch(batchJobId.value)
  } catch (err) {
    console.warn('Failed to cancel batch job', err)
  }
}

function formatBatchError(status) {
  if (!status) return 'Пакетная загрузка не удалась.'
  if (status.resultsFileRef) {
    return 'Результат слишком большой. Разбейте параметры на партии или добавьте фильтры.'
  }
  if (status.status === 'failed') {
    return 'Часть параметров завершилась с ошибкой.'
  }
  if (status.status === 'cancelled') {
    return 'Пакетная загрузка отменена.'
  }
  return status.error || 'Пакетная загрузка не удалась.'
}

async function fetchJoinResults(joins = []) {
  if (!joins.length) return []
  const tasks = joins.map(async (join, index) => {
    const label = formatJoinLabel(join, index)
    const targetSource =
      dataSourcesStore.getById(join.targetSourceId) ||
      dataSources.value.find((item) => item.id === join.targetSourceId)
    if (!targetSource) {
      return {
        index,
        join,
        records: [],
        error: `Источник для связи «${label}» не найден.`,
      }
    }
    const batchCandidate = buildBatchPayloadFromConfig(targetSource)
    const batchEligible =
      String(targetSource.httpMethod || '').toUpperCase() !== 'GET'
    const shouldUseBatch =
      batchEligible &&
      batchCandidate?.paramsList &&
      batchCandidate.paramsList.length > BATCH_THRESHOLD
    if (shouldUseBatch) {
      if (batchCandidate.error) {
        return {
          index,
          join,
          records: [],
          error: batchCandidate.error,
        }
      }
      try {
        const status = await runBatchJob(batchCandidate.payload, {
          paramsList: batchCandidate.paramsList,
          trackUI: false,
        })
        if (!status) {
          return {
            index,
            join,
            records: [],
            error: `Не удалось загрузить связь «${label}».`,
          }
        }
        const records = buildRecordsFromBatchStatus(
          status,
          batchCandidate.paramsList,
          { reportErrors: false },
        )
        if (!records) {
          return {
            index,
            join,
            records: [],
            error: `${formatBatchError(status)} (${label})`,
          }
        }
        return { index, join, records }
      } catch (err) {
        return {
          index,
          join,
          records: [],
          error:
            err?.response?.data?.message ||
            err?.message ||
            `Не удалось загрузить связь «${label}».`,
        }
      }
    }
    const { payload, error } = buildRequestPayloadFromConfig(targetSource)
    if (!payload || !payload.length || error) {
      return {
        index,
        join,
        records: [],
        error:
          error ||
          `Источник для связи «${label}» содержит некорректный запрос.`,
      }
    }
    try {
      const responses = await executeRequestBatches(payload, (entry) =>
        fetchJoinPayload(entry.request, { cache: true }),
      )
      const rows = responses.flatMap((response, responseIndex) => {
        const records = extractRecordsFromResponse(response)
        return applyRequestFields(records, payload[responseIndex]?.meta?.fields)
      })
      return { index, join, records: rows }
    } catch (err) {
      return {
        index,
        join,
        records: [],
        error:
          err?.response?.data?.message ||
          err?.message ||
          `Не удалось загрузить связь «${label}».`,
      }
    }
  })
  const results = await Promise.all(tasks)
  return results.sort((a, b) => a.index - b.index)
}

function formatJoinLabel(join, index = 0) {
  if (!join) return `#${index + 1}`
  return (
    join.resultPrefix || join.alias || join.targetSourceId || `#${index + 1}`
  )
}

function resolveCurrentRequestPayload() {
  if (rawBodyError.value) {
    planError.value = 'Исправьте JSON в поле Raw body.'
    return null
  }
  const { payload, error } = buildRequestPayloadFromConfig(sourceDraft)
  if (error || !payload || !payload.length) {
    planError.value = error || 'Не удалось подготовить запрос.'
    return null
  }
  return payload
}

function normalizeSourceEndpoint(rawUrl = '') {
  const trimmed = String(rawUrl || '').trim()
  if (!trimmed) {
    return { endpoint: '', error: 'Укажите URL источника.' }
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed)
      if (parsed.origin !== window.location.origin) {
        return {
          endpoint: '',
          error:
            'Внешние URL запрещены. Используйте относительный путь или добавьте домен в allowlist на сервере.',
        }
      }
      const next = `${parsed.pathname}${parsed.search || ''}` || '/'
      return { endpoint: next.startsWith('/') ? next : `/${next}` }
    } catch {
      return { endpoint: '', error: 'Некорректный URL источника.' }
    }
  }
  return {
    endpoint: trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
    error: '',
  }
}

function normalizeBatchEndpoint(rawUrl = '') {
  return normalizeSourceEndpoint(rawUrl)
}

function resolveSourceRemoteId(source) {
  const raw =
    source?.remoteMeta?.id ??
    source?.remoteMeta?.Id ??
    source?.remoteMeta?.ID ??
    source?.remoteId
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

function buildBatchPayloadFromConfig(config = {}) {
  if (rawBodyError.value) {
    return { payload: null, error: 'Исправьте JSON в поле Raw body.' }
  }
  const rawBody = config.rawBody?.trim() || ''
  if (!rawBody) {
    return { payload: null, error: 'Добавьте тело запроса.' }
  }
  const parsed = safeJsonParse(rawBody)
  if (!parsed.ok || !parsed.value || !isPlainObject(parsed.value)) {
    return {
      payload: null,
      error: 'Тело запроса должно быть валидным JSON-объектом.',
    }
  }
  const paramsList = extractMultiParamEntries(parsed.value)
  if (!paramsList.length) {
    return {
      payload: null,
      error: 'Для пакетной отправки нужен массив params.',
    }
  }
  const endpointInfo = normalizeBatchEndpoint(config.url)
  if (endpointInfo.error) {
    return { payload: null, error: endpointInfo.error }
  }
  const payload = {
    endpoint: endpointInfo.endpoint,
    method: parsed.value.method || rpcMethod.value || '',
    sourceId: resolveSourceRemoteId(config),
    params: paramsList,
    meta:
      parsed.value.meta && isPlainObject(parsed.value.meta)
        ? parsed.value.meta
        : null,
  }
  return { payload, paramsList, error: '' }
}

function buildRequestPayloadFromConfig(config = {}) {
  const url = config.url?.trim()
  if (!url) {
    return { payload: null, error: 'Укажите URL источника.' }
  }
  const endpointInfo = normalizeSourceEndpoint(url)
  if (endpointInfo.error) {
    return { payload: null, error: endpointInfo.error }
  }
  const normalizedUrl = endpointInfo.endpoint
  const method = config.httpMethod?.toUpperCase?.() || 'POST'
  const headers =
    config.headers && Object.keys(config.headers).length
      ? config.headers
      : { 'Content-Type': 'application/json' }
  const rawBody = config.rawBody?.trim() || ''
  if (method === 'GET') {
    if (!rawBody) {
      return {
        payload: [
          {
            request: { url: normalizedUrl, method, headers },
            meta: { fields: {} },
          },
        ],
        error: null,
      }
    }
    const parsed = safeJsonParse(rawBody)
    if (!parsed.ok) {
      return {
        payload: null,
        error: 'Параметры GET-запроса должны быть корректным JSON.',
      }
    }
    const requests = buildRequestEntries(parsed.value, {
      url: normalizedUrl,
      method,
      headers,
    })
    return { payload: requests, error: null }
  }
  if (!rawBody) {
    return { payload: null, error: 'Добавьте тело запроса.' }
  }
  const parsed = safeJsonParse(rawBody)
  if (!parsed.ok || !parsed.value || !isPlainObject(parsed.value)) {
    return {
      payload: null,
      error: 'Тело запроса должно быть валидным JSON-объектом.',
    }
  }
  const requests = buildRequestEntries(parsed.value, {
    url: normalizedUrl,
    method,
    headers,
  })
  return { payload: requests, error: null }
}

function buildRequestEntries(body, baseRequest) {
  if (!isPlainObject(body)) {
    return [buildRequestEntry(baseRequest, body)]
  }
  // Multi-request format: { requests: [{ params: {...} }, ...] } or params: [{...}, {...}].
  if (Array.isArray(body.requests) && body.requests.length) {
    return buildRequestEntriesFromRequests(body, baseRequest)
  }
  if (shouldSplitParamsIntoRequests(body.params)) {
    return buildRequestEntriesFromParams(body, baseRequest)
  }
  const paramsSource = extractParamsForFields(body)
  return [buildRequestEntry(baseRequest, body, paramsSource)]
}

function buildRequestEntriesFromRequests(body, baseRequest) {
  const baseBody = { ...body }
  delete baseBody.requests
  return body.requests
    .map((entry) => buildRequestBodyFromEntry(baseBody, entry))
    .filter(Boolean)
    .map((item) => buildRequestEntry(baseRequest, item.body, item.paramsSource))
}

function buildRequestEntriesFromParams(body, baseRequest) {
  const baseBody = { ...body }
  delete baseBody.params
  return body.params.map((paramsEntry) =>
    buildRequestEntry(
      baseRequest,
      { ...baseBody, params: [paramsEntry] },
      paramsEntry,
    ),
  )
}

function buildRequestBodyFromEntry(baseBody, entry) {
  if (
    isPlainObject(entry) &&
    Object.prototype.hasOwnProperty.call(entry, 'body')
  ) {
    const mergedBody = { ...baseBody, ...entry.body }
    return {
      body: mergedBody,
      paramsSource: extractParamsForFields(mergedBody),
    }
  }
  if (
    isPlainObject(entry) &&
    Object.prototype.hasOwnProperty.call(entry, 'params')
  ) {
    return {
      body: { ...baseBody, params: entry.params },
      paramsSource: entry.params,
    }
  }
  if (isPlainObject(entry)) {
    return {
      body: { ...baseBody, params: entry },
      paramsSource: entry,
    }
  }
  if (typeof entry !== 'undefined') {
    return {
      body: { ...baseBody, params: entry },
      paramsSource: entry,
    }
  }
  return null
}

function buildRequestEntry(baseRequest, body, paramsSource = null) {
  const fields = buildRequestFieldsFromParams(paramsSource)
  return {
    request: {
      url: baseRequest.url,
      method: baseRequest.method,
      headers: baseRequest.headers,
      body,
    },
    meta: { fields },
  }
}

function buildRequestFieldsFromParams(paramsSource) {
  const paramsObject = resolveParamsObject(paramsSource)
  if (!paramsObject) return {}
  return Object.entries(paramsObject).reduce((acc, [key, value]) => {
    const fieldKey = buildRequestFieldKey(key)
    if (!fieldKey) return acc
    acc[fieldKey] = value
    return acc
  }, {})
}

function buildRequestFieldKey(key) {
  const raw = String(key ?? '').trim()
  if (!raw) return ''
  const tokens = raw.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  if (!tokens.length) return ''
  const suffix = tokens
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `${REQUEST_FIELD_PREFIX}${suffix}`
}

function extractParamsForFields(body) {
  if (!isPlainObject(body)) return null
  return resolveParamsObject(body.params)
}

function resolveParamsObject(params) {
  if (isPlainObject(params)) return params
  if (
    Array.isArray(params) &&
    params.length === 1 &&
    isPlainObject(params[0])
  ) {
    return params[0]
  }
  return null
}

function shouldSplitParamsIntoRequests(params) {
  if (!Array.isArray(params) || params.length < 2) return false
  return params.every((item) => isPlainObject(item))
}

function isMultiRequestBody(body) {
  if (!isPlainObject(body)) return false
  if (Array.isArray(body.requests) && body.requests.length) return true
  return shouldSplitParamsIntoRequests(body.params)
}

function applyRequestFields(records, fields = {}) {
  if (!Array.isArray(records) || !records.length) return records || []
  const entries = Object.entries(fields || {})
  if (!entries.length) return records
  return records.map((record) => {
    if (!record || typeof record !== 'object') return record
    const next = { ...record }
    entries.forEach(([key, value]) => {
      if (!(key in next)) {
        next[key] = value
      }
    })
    return next
  })
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeJsonParse(value = '') {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false, value: null }
  }
}

function resetPlanState() {
  records.value = []
  fields.value = []
  planError.value = ''
  result.value = null
  activeResultTab.value = 'preview'
  resetBatchState()
  primitiveParams.value = []
  layoutDetailsVisible.value = false
  replaceArray(pivotConfig.filters, [])
  replaceArray(pivotConfig.rows, [])
  replaceArray(pivotConfig.columns, [])
  pivotMetrics.splice(0, pivotMetrics.length)
  pivotMetricsVersion.value += 1
  Object.keys(filterValues).forEach((key) => delete filterValues[key])
  Object.keys(filterRangeValues).forEach((key) => delete filterRangeValues[key])
  Object.keys(filterVisibilityStore).forEach(
    (key) => delete filterVisibilityStore[key],
  )
  Object.keys(dimensionValueFilters.rows).forEach(
    (key) => delete dimensionValueFilters.rows[key],
  )
  Object.keys(dimensionRangeFilters.rows).forEach(
    (key) => delete dimensionRangeFilters.rows[key],
  )
  Object.keys(dimensionValueFilters.columns).forEach(
    (key) => delete dimensionValueFilters.columns[key],
  )
  Object.keys(dimensionRangeFilters.columns).forEach(
    (key) => delete dimensionRangeFilters.columns[key],
  )
  Object.keys(columnWidths).forEach((key) => delete columnWidths[key])
  Object.keys(rowHeights).forEach((key) => delete rowHeights[key])
  resetRowCollapse()
  configsReady.value = false
  reportConfigs.value = []
  selectedConfigId.value = ''
  configName.value = ''
  pendingConfigName.value = ''
  configSearch.value = ''
  currentConfigMeta.value = null
}

function resetFilterValues() {
  Object.keys(filterValues).forEach((key) => {
    filterValues[key] = []
  })
  Object.keys(filterRangeValues).forEach((key) => {
    delete filterRangeValues[key]
  })
  Object.keys(filterVisibilityStore).forEach((key) => {
    filterVisibilityStore[key] = false
  })
}

function extractRecordsFromResponse(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.records)) return payload.records
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.result)) return payload.result
  if (payload.result && Array.isArray(payload.result.records))
    return payload.result.records
  return []
}

const DATE_PART_VALUE_LIMIT = 50

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
          dateCount: 0,
          values: new Set(),
          datePartValues: {},
        })
      }
      const descriptor = map.get(key)
      descriptor.total += 1
      if (typeof value === 'number') descriptor.numericCount += 1
      if (isLikelyDateValue(value)) descriptor.dateCount += 1
      if (descriptor.values.size < 20) {
        descriptor.values.add(normalizeValue(value))
      }
      if (isLikelyDateValue(value)) {
        DATE_PARTS.forEach((part) => {
          const resolved = resolveDatePartValue(value, part.key)
          if (!resolved) return
          if (!descriptor.datePartValues[part.key]) {
            descriptor.datePartValues[part.key] = new Set()
          }
          if (
            descriptor.datePartValues[part.key].size < DATE_PART_VALUE_LIMIT
          ) {
            descriptor.datePartValues[part.key].add(resolved)
          }
        })
      }
      if (!descriptor.sample && value !== undefined && value !== null) {
        descriptor.sample = formatSample(value)
      }
    })
  })

  return Array.from(map.values()).map((descriptor) => {
    const type =
      descriptor.numericCount > 0 &&
      descriptor.numericCount === descriptor.total
        ? 'number'
        : descriptor.dateCount > 0 && descriptor.dateCount === descriptor.total
          ? 'date'
          : 'string'
    const datePartValues = {}
    DATE_PARTS.forEach((part) => {
      datePartValues[part.key] = Array.from(
        descriptor.datePartValues?.[part.key] || [],
      )
    })
    const dateParts =
      type === 'date'
        ? DATE_PARTS.map((part) => ({
            key: buildDatePartKey(descriptor.key, part.key),
            label: formatDatePartFieldLabel(descriptor.label, part.key),
            part: part.key,
            values: datePartValues[part.key],
          }))
        : []
    return {
      key: descriptor.key,
      label: descriptor.label,
      sample: descriptor.sample || '—',
      values: Array.from(descriptor.values),
      type,
      dateParts,
      datePartValues,
    }
  })
}

function isLikelyDateValue(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return true
  }
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?$/.test(trimmed)
  ) {
    return true
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    return true
  }
  const parsed = Date.parse(trimmed)
  return Number.isFinite(parsed)
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
  const meta = getAggregatorMeta(aggregator)
  const aggName = meta?.label || aggregator
  if (String(aggregator || '').toLowerCase() === 'count') {
    return aggName
  }
  const override = headerOverrides[field?.key]
  const fieldLabel = override?.trim() || field?.label || field?.key || 'поле'
  return `${aggName}: ${fieldLabel}`
}

function getAggregatorMeta(key) {
  if (!key) return null
  return aggregatorMap.value[key] || FALLBACK_AGGREGATORS[key] || null
}

function resolveAggregatorKeyFromRemote(fv, pv) {
  const numericFv = toNumericValue(fv)
  const numericPv = toNumericValue(pv)
  const entry =
    Object.entries(aggregatorMap.value).find(
      ([, meta]) =>
        meta.fvFieldVal === numericFv && meta.pvFieldVal === numericPv,
    ) ||
    Object.entries(FALLBACK_AGGREGATORS).find(
      ([, meta]) =>
        meta.fvFieldVal === numericFv && meta.pvFieldVal === numericPv,
    )
  return entry ? entry[0] : null
}

function detectAggregatorKey(record = {}) {
  const rawName = String(record.name || record.Name || '')
    .trim()
    .toLowerCase()
  if (!rawName) return null
  if (rawName.includes('колич') || rawName.includes('count')) return 'count'
  if (
    rawName.includes('сред') ||
    rawName.includes('avg') ||
    rawName.includes('mean')
  )
    return 'avg'
  if (rawName.includes('сум') || rawName.includes('sum')) return 'sum'
  if (rawName.includes('знач') || rawName.includes('value')) return 'value'
  return null
}

function formatAggregatorLabel(name = '', key = '') {
  const trimmed = String(name).trim()
  if (trimmed) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }
  return FALLBACK_AGGREGATORS[key]?.label || key
}

function formatVisualizationLabel(record = {}) {
  const label = record?.name || record?.Name || record?.title
  if (label && String(label).trim()) return String(label).trim()
  const id = getVisualizationOptionId(record)
  return id ? `Тип ${id}` : 'Тип визуализации'
}

function getVisualizationOptionId(record = {}) {
  const raw =
    record?.fvVisualTyp ??
    record?.fv ??
    record?.id ??
    record?.idFieldVal ??
    record?.FieldVal ??
    record?.value
  if (raw === null || typeof raw === 'undefined' || raw === '') return ''
  return String(raw)
}

function getVisualizationOptionPv(record = {}) {
  return (
    toNumericValue(
      record?.pvVisualTyp ??
        record?.pv ??
        record?.pvFieldVal ??
        record?.PV ??
        record?.pvValue,
    ) || null
  )
}

function findVisualizationOptionIdByMeta(fv, pv) {
  if (!Number.isFinite(fv) && !Number.isFinite(pv)) return ''
  const match = visualizationTypes.value.find((record) => {
    const recordFv =
      toNumericValue(
        record?.fvVisualTyp ??
          record?.fv ??
          record?.id ??
          record?.idFieldVal ??
          record?.FieldVal,
      ) || null
    const recordPv = getVisualizationOptionPv(record)
    return recordFv === fv && recordPv === pv
  })
  return match ? getVisualizationOptionId(match) : ''
}

function extractVisualizationTypeMeta(record = {}) {
  const fv =
    toNumericValue(
      record?.fvVisualTyp ??
        record?.fv ??
        record?.id ??
        record?.idFieldVal ??
        record?.FieldVal ??
        record?.value,
    ) || null
  const pv = getVisualizationOptionPv(record)
  const id =
    toNumericValue(
      record?.idVisualTyp ??
        record?.id ??
        record?.idFieldVal ??
        record?.FieldVal ??
        record?.value,
    ) || null
  return {
    fv,
    pv,
    id,
    label: formatVisualizationLabel(record),
  }
}

function resolveVisualizationChartType(record) {
  if (!record) return 'table'
  const name = String(record.name || record.Name || '').toLowerCase()
  const has = (...tokens) => tokens.some((token) => name.includes(token))
  if (has('круг', 'pie')) return 'pie'
  if (has('линей', 'line')) return 'line'
  if (has('столб', 'column', 'bar', 'гист', 'граф')) return 'bar'
  if (has('табл', 'table')) return 'table'
  if (supportedChartTypes.includes(vizType.value)) {
    return vizType.value
  }
  return 'table'
}

function autoSelectVisualizationType() {
  const list = visualizationTypes.value
  if (!Array.isArray(list) || !list.length) {
    selectedVisualizationId.value = ''
    vizType.value = 'table'
    return
  }
  const preferred = list.find(
    (record) => resolveVisualizationChartType(record) === vizType.value,
  )
  const fallback = preferred || list[0]
  const id = getVisualizationOptionId(fallback)
  if (id) {
    selectedVisualizationId.value = id
  } else {
    selectedVisualizationId.value = ''
    vizType.value = 'table'
  }
}

function toNumericValue(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function extractRouteParam(value) {
  if (Array.isArray(value)) {
    return value.length ? String(value[0]).trim() : ''
  }
  if (value === null || typeof value === 'undefined') return ''
  const str = String(value).trim()
  return str
}

function extractRouteFlag(value) {
  if (Array.isArray(value)) {
    return value.some((item) => extractRouteFlag(item))
  }
  if (value === null || typeof value === 'undefined') return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function clearCreationFlags() {
  const nextQuery = { ...route.query }
  const hadFlags =
    'createSource' in route.query || 'createConfig' in route.query
  delete nextQuery.createSource
  delete nextQuery.createConfig
  if (hadFlags) {
    navigationStore.allowDataAccess()
    router.replace({ query: nextQuery })
  }
  routeActions.createSource = false
  routeActions.createConfig = false
}

function clearRoutePrefill() {
  const nextQuery = { ...route.query }
  delete nextQuery.sourceId
  delete nextQuery.configId
  delete nextQuery.presentationId
  const hadParams =
    'sourceId' in route.query ||
    'configId' in route.query ||
    'presentationId' in route.query
  if (hadParams) {
    navigationStore.allowDataAccess()
    router.replace({ query: nextQuery })
  }
  routePrefill.sourceId = ''
  routePrefill.configId = ''
  routePrefill.presentationId = ''
  routePrefill.appliedSource = true
  routePrefill.appliedConfig = true
  routePrefill.appliedPresentation = true
  routePrefill.executedSource = true
  routePrefill.loadedConfig = true
  routePrefill.loadedPresentation = true
}

function ensureMetricExists() {
  const hasBaseMetric = pivotMetrics.some((metric) => metric.type !== 'formula')
  if (pivotMetrics.length && hasBaseMetric) return
  const firstNumericField = fields.value.find(
    (field) => field.type === 'number',
  )
  const firstFieldKey = firstNumericField?.key || fields.value[0]?.key || ''
  pivotMetrics.push(
    createMetric({
      fieldKey: firstFieldKey,
      aggregator: firstNumericField ? 'sum' : 'count',
    }),
  )
  pivotMetricsVersion.value += 1
}

let metricCounter = 0
function createMetric(overrides = {}) {
  metricCounter += 1
  const type = overrides.type === 'formula' ? 'formula' : 'base'
  return {
    id: overrides.id || `metric-${metricCounter}`,
    type,
    fieldKey: overrides.fieldKey || '',
    aggregator: overrides.aggregator || 'count',
    title: overrides.title || '',
    enabled: overrides.enabled !== false,
    showRowTotals: overrides.showRowTotals !== false,
    showColumnTotals: overrides.showColumnTotals !== false,
    outputFormat:
      overrides.outputFormat ||
      (type === 'formula' ? 'number' : overrides.outputFormat || 'auto'),
    expression: overrides.expression || '',
    precision: Number.isFinite(overrides.precision)
      ? Number(overrides.precision)
      : type === 'formula'
        ? 2
        : 2,
    conditionalFormatting: normalizeConditionalFormatting(
      overrides.conditionalFormatting,
    ),
    detailFields: Array.isArray(overrides.detailFields)
      ? [...overrides.detailFields]
      : [],
    remoteMeta: overrides.remoteMeta || null,
  }
}

function addMetric() {
  pivotMetrics.push(createMetric())
  pivotMetricsVersion.value += 1
}

function removeMetric(metricId) {
  const index = pivotMetrics.findIndex((metric) => metric.id === metricId)
  if (index >= 0) {
    pivotMetrics.splice(index, 1)
    ensureMetricExists()
    pivotMetricsVersion.value += 1
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
    joins: normalizeJoinList(overrides.joins || []),
    pushdown: createBlankPushdown(overrides.pushdown),
  }
}

function createBlankPushdown(overrides = {}) {
  const safe = overrides && typeof overrides === 'object' ? overrides : {}
  const paging = safe.paging && typeof safe.paging === 'object' ? safe.paging : {}
  const normalizedFilters = Array.isArray(safe.filters)
    ? safe.filters.map((item) => normalizePushdownFilter(item))
    : []
  return {
    enabled: Boolean(safe.enabled),
    mode: safe.mode === 'rest_query' ? 'rest_query' : 'jsonrpc_params',
    paging: {
      strategy: paging.strategy === 'cursor' ? 'cursor' : 'offset',
      limitPath: typeof paging.limitPath === 'string' ? paging.limitPath : '',
      offsetPath: typeof paging.offsetPath === 'string' ? paging.offsetPath : '',
      cursorPath: typeof paging.cursorPath === 'string' ? paging.cursorPath : '',
    },
    filters: normalizedFilters,
    notes: typeof safe.notes === 'string' ? safe.notes : '',
  }
}

function normalizePushdownFilter(entry = {}) {
  const safe = entry && typeof entry === 'object' ? entry : {}
  const op = pushdownOperatorOptions.some((option) => option.value === safe.op)
    ? safe.op
    : 'eq'
  return {
    filterKey: typeof safe.filterKey === 'string' ? safe.filterKey : '',
    op,
    targetPath: typeof safe.targetPath === 'string' ? safe.targetPath : '',
  }
}

function buildPushdownPayload(pushdown) {
  if (!pushdown || !pushdown.enabled) return null
  const payload = {
    enabled: true,
    mode: pushdown.mode === 'rest_query' ? 'rest_query' : 'jsonrpc_params',
    paging: {
      ...(pushdown.paging || {}),
    },
  }
  if (Array.isArray(pushdown.filters)) {
    payload.filters = pushdown.filters.map((item) => ({
      filterKey: item?.filterKey || '',
      op: item?.op || 'eq',
      targetPath: item?.targetPath || '',
    }))
  }
  if (typeof pushdown.notes === 'string' && pushdown.notes.trim()) {
    payload.notes = pushdown.notes.trim()
  }
  return payload
}

function addPushdownFilter() {
  if (!sourceDraft.pushdown) {
    sourceDraft.pushdown = createBlankPushdown()
  }
  sourceDraft.pushdown.filters.push({
    filterKey: '',
    op: 'eq',
    targetPath: '',
  })
}

function removePushdownFilter(index) {
  if (!Array.isArray(sourceDraft.pushdown?.filters)) return
  sourceDraft.pushdown.filters.splice(index, 1)
}

function isPushdownFilterInvalid(mapping) {
  if (!mapping) return false
  const key = typeof mapping.filterKey === 'string' ? mapping.filterKey.trim() : ''
  const target = typeof mapping.targetPath === 'string' ? mapping.targetPath.trim() : ''
  return !key || !target
}

const pushdownFilterHasErrors = computed(() => {
  if (!sourceDraft.pushdown?.enabled) return false
  return (sourceDraft.pushdown.filters || []).some((mapping) =>
    isPushdownFilterInvalid(mapping),
  )
})

function runPushdownTest() {
  const warnings = []
  const preview = []
  const pushdown = sourceDraft.pushdown
  if (!pushdown?.enabled) {
    warnings.push('Pushdown выключен.')
  } else {
    const paging = pushdown.paging || {}
    if (paging.strategy === 'cursor') {
      if (paging.cursorPath) {
        preview.push(paging.cursorPath)
        if (isSuspiciousPath(paging.cursorPath)) {
          warnings.push(`cursorPath выглядит подозрительно: ${paging.cursorPath}`)
        }
      } else {
        warnings.push('cursorPath не заполнен для cursor-стратегии.')
      }
    } else {
      if (paging.limitPath) {
        preview.push(paging.limitPath)
        if (isSuspiciousPath(paging.limitPath)) {
          warnings.push(`limitPath выглядит подозрительно: ${paging.limitPath}`)
        }
      } else {
        warnings.push('limitPath не заполнен для offset-стратегии.')
      }
      if (paging.offsetPath) {
        preview.push(paging.offsetPath)
        if (isSuspiciousPath(paging.offsetPath)) {
          warnings.push(`offsetPath выглядит подозрительно: ${paging.offsetPath}`)
        }
      } else {
        warnings.push('offsetPath не заполнен для offset-стратегии.')
      }
    }

    const filters = Array.isArray(pushdown.filters) ? pushdown.filters : []
    filters.forEach((mapping, index) => {
      const target = mapping?.targetPath || ''
      if (target) {
        preview.push(target)
        if (isSuspiciousPath(target)) {
          warnings.push(`filters[${index}] путь выглядит подозрительно: ${target}`)
        }
      } else if (mapping?.filterKey) {
        warnings.push(`filters[${index}] задан filterKey без targetPath.`)
      }
    })
  }

  pushdownTest.executed = true
  pushdownTest.preview = Array.from(new Set(preview))
  pushdownTest.warnings = warnings
}

function isSuspiciousPath(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return true
  if (!trimmed.startsWith('body.')) return true
  if (trimmed.includes(' ') || trimmed.includes('..')) return true
  return false
}

function resetSourceDraft(overrides = {}) {
  Object.assign(sourceDraft, createBlankSource(overrides))
}

function loadDraftFromSource(source) {
  if (!source) {
    resetSourceDraft()
    return
  }
  const remoteBody =
    source.remoteMeta?.MethodBody ||
    source.remoteMeta?.methodBody ||
    source.remoteMeta?.methodbody ||
    ''
  const sourceBody = source.rawBody || ''
  const parsedBody = parseSourceBodyForJoins(remoteBody || sourceBody)
  const remoteJoins = parseJoinConfig(
    source.remoteMeta?.joinConfig || source.remoteMeta?.JoinConfig,
  )
  resetSourceDraft({
    ...source,
    rawBody:
      parsedBody.cleanedBody || sourceBody || remoteBody || EMPTY_BODY_TEMPLATE,
    joins: normalizeJoinList(
      parsedBody.joins || source.joins || remoteJoins || [],
    ),
    headers: {
      'Content-Type': 'application/json',
      ...(source.headers || {}),
    },
  })
}

function addJoin() {
  if (!Array.isArray(sourceDraft.joins)) {
    sourceDraft.joins = []
  }
  sourceDraft.joins.push(createJoinTemplate())
}

function removeJoin(joinId) {
  if (!Array.isArray(sourceDraft.joins)) return
  const index = sourceDraft.joins.findIndex((join) => join.id === joinId)
  if (index >= 0) {
    sourceDraft.joins.splice(index, 1)
  }
}

function updateJoinFieldsInput(join, value = '') {
  if (!join) return
  const rawValue = String(value ?? '')
  join.fieldsInput = rawValue
  const parsed = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  join.fields = parsed
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

function setRawBodyFromEditors(payload) {
  syncingFromEditors = true
  sourceDraft.rawBody = JSON.stringify(payload, null, 2)
  deferSyncingFromEditorsReset()
}

function deferSyncingFromEditorsReset() {
  if (syncingFromEditorsTimer) {
    clearTimeout(syncingFromEditorsTimer)
  }
  syncingFromEditorsTimer = setTimeout(() => {
    syncingFromEditors = false
    syncingFromEditorsTimer = null
  }, 0)
}

function enableMultiParamTable() {
  if (rawBodyError.value) return
  const rawValue = sourceDraft.rawBody?.trim()
  let parsed = {}
  if (rawValue) {
    const parsedBody = safeJsonParse(rawValue)
    if (parsedBody.ok && isPlainObject(parsedBody.value)) {
      parsed = parsedBody.value
    }
  }
  const method = rpcMethod.value || parsed.method || ''
  const params = structuredBodyAvailable.value
    ? normalizeParamValues(snapshotParams(bodyParams))
    : null
  parsed.method = method
  parsed.params = params ? [params] : []
  if ('requests' in parsed) {
    delete parsed.requests
  }
  setRawBodyFromEditors(parsed)
}

function extractMultiParamEntries(body) {
  if (!isPlainObject(body)) return []
  if (Array.isArray(body.requests) && body.requests.length) {
    return body.requests
      .map((entry) => resolveMultiParamEntry(entry))
      .filter((entry) => entry && isPlainObject(entry))
  }
  if (Array.isArray(body.params) && body.params.length) {
    const entries = body.params.filter((entry) => isPlainObject(entry))
    if (entries.length === body.params.length) {
      return entries
    }
  }
  return []
}

function isEmptyMultiParamTable(body) {
  if (!isPlainObject(body)) return false
  if (Array.isArray(body.requests) && body.requests.length === 0) {
    return true
  }
  if (Array.isArray(body.params) && body.params.length === 0) {
    return true
  }
  return false
}

function resolveMultiParamEntry(entry) {
  if (!entry || !isPlainObject(entry)) return null
  if (Object.prototype.hasOwnProperty.call(entry, 'params')) {
    const params = resolveParamsObject(entry.params)
    if (params && isPlainObject(params)) return params
    if (isPlainObject(entry.params)) return entry.params
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'body')) {
    const body = entry.body
    if (
      isPlainObject(body) &&
      Object.prototype.hasOwnProperty.call(body, 'params')
    ) {
      const params = resolveParamsObject(body.params)
      if (params && isPlainObject(params)) return params
      if (isPlainObject(body.params)) return body.params
    }
  }
  return entry
}

function syncMultiParamTable(entries = []) {
  const columns = buildMultiParamColumns(entries)
  const rows = buildMultiParamRows(entries, columns)
  multiParamColumns.value = columns
  multiParamRows.value = rows.length ? rows : [createMultiParamRow(columns)]
  if (!multiParamColumns.value.length) {
    multiParamColumns.value = [createMultiParamColumn('')]
    multiParamRows.value = [createMultiParamRow(multiParamColumns.value)]
  }
  if (!activeMultiParamCell.rowId && multiParamRows.value[0]) {
    activeMultiParamCell.rowId = multiParamRows.value[0].id
  }
  if (!activeMultiParamCell.columnId && multiParamColumns.value[0]) {
    activeMultiParamCell.columnId = multiParamColumns.value[0].id
  }
}

function buildMultiParamColumns(entries = []) {
  const keys = []
  const seen = new Set()
  entries.forEach((entry) => {
    Object.keys(entry || {}).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key)
        keys.push(key)
      }
    })
  })
  return keys.map((key) => createMultiParamColumn(key))
}

function buildMultiParamRows(entries = [], columns = []) {
  return entries.map((entry) => {
    const values = {}
    columns.forEach((column) => {
      values[column.id] = formatMultiParamValue(entry?.[column.key])
    })
    return {
      id: createId(),
      values,
    }
  })
}

function createMultiParamColumn(key) {
  return {
    id: createId(),
    key: key || '',
  }
}

function buildAutoColumnKey(existingKeys) {
  let index = 1
  while (existingKeys.has(`param${index}`)) {
    index += 1
  }
  return `param${index}`
}

function createMultiParamRow(columns = [], values = {}) {
  const rowValues = {}
  columns.forEach((column) => {
    rowValues[column.id] = values[column.id] ?? ''
  })
  return {
    id: createId(),
    values: rowValues,
  }
}

function formatMultiParamValue(value) {
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

function resolveMultiParamColumns() {
  const seen = new Set()
  return multiParamColumns.value
    .map((column) => ({
      id: column.id,
      key: String(column.key || '').trim(),
    }))
    .filter((column) => {
      if (!column.key || seen.has(column.key)) return false
      seen.add(column.key)
      return true
    })
}

function syncMultiParamBody(method = '') {
  let parsed = {}
  const rawValue = sourceDraft.rawBody?.trim()
  if (rawValue) {
    const parsedBody = safeJsonParse(rawValue)
    if (parsedBody.ok && isPlainObject(parsedBody.value)) {
      parsed = parsedBody.value
    }
  }
  const columns = resolveMultiParamColumns()
  const paramsList = multiParamRows.value
    .map((row) => buildMultiParamRowPayload(row, columns))
    .filter((row) => Object.keys(row).length)
  parsed.method = method || parsed.method || ''
  if (Array.isArray(parsed.requests)) {
    parsed.requests = paramsList.map((params, index) =>
      mergeMultiParamRequest(parsed.requests[index], params),
    )
  } else {
    parsed.params = paramsList
  }
  setRawBodyFromEditors(parsed)
}

function buildMultiParamRowPayload(row, columns) {
  return columns.reduce((acc, column) => {
    const raw = row.values?.[column.id]
    if (raw === '' || raw === null || typeof raw === 'undefined') {
      return acc
    }
    acc[column.key] = normalizePrimitiveValue(raw)
    return acc
  }, {})
}

function mergeMultiParamRequest(existing, params) {
  if (isPlainObject(existing)) {
    if (Object.prototype.hasOwnProperty.call(existing, 'body')) {
      const body = isPlainObject(existing.body) ? existing.body : {}
      return { ...existing, body: { ...body, params } }
    }
    return { ...existing, params }
  }
  return { params }
}

function resolveMultiParamColumnStatus(columnId) {
  const meta = multiParamColumnMeta.value[columnId]
  if (!meta) return undefined
  if (meta.duplicate) return 'error'
  if (meta.empty) return 'warning'
  return undefined
}

function resolveMultiParamColumnClass(columnId) {
  const meta = multiParamColumnMeta.value[columnId]
  if (!meta) return ''
  if (meta.duplicate) return 'params-table__cell--error'
  if (meta.empty) return 'params-table__cell--warning'
  return ''
}

function setActiveMultiParamCell(rowId, columnId) {
  activeMultiParamCell.rowId = rowId
  activeMultiParamCell.columnId = columnId
}

function addMultiParamColumn() {
  const column = createMultiParamColumn('')
  multiParamColumns.value.push(column)
  multiParamRows.value.forEach((row) => {
    row.values[column.id] = ''
  })
}

function removeMultiParamColumn(columnId) {
  const index = multiParamColumns.value.findIndex(
    (column) => column.id === columnId,
  )
  if (index < 0) return
  multiParamColumns.value.splice(index, 1)
  multiParamRows.value.forEach((row) => {
    delete row.values[columnId]
  })
  if (activeMultiParamCell.columnId === columnId) {
    activeMultiParamCell.columnId = ''
  }
}

function addMultiParamRow() {
  multiParamRows.value.push(createMultiParamRow(multiParamColumns.value))
}

function duplicateMultiParamRow(rowIndex) {
  const existing = multiParamRows.value[rowIndex]
  if (!existing) return
  multiParamRows.value.splice(
    rowIndex + 1,
    0,
    createMultiParamRow(multiParamColumns.value, { ...existing.values }),
  )
}

function removeMultiParamRow(rowIndex) {
  const existing = multiParamRows.value[rowIndex]
  if (!existing) return
  multiParamRows.value.splice(rowIndex, 1)
  if (activeMultiParamCell.rowId === existing.id) {
    activeMultiParamCell.rowId = ''
  }
}

function fillDownMultiParam() {
  if (!activeMultiParamCell.rowId || !activeMultiParamCell.columnId) return
  const rowIndex = multiParamRows.value.findIndex(
    (row) => row.id === activeMultiParamCell.rowId,
  )
  if (rowIndex < 0) return
  const value =
    multiParamRows.value[rowIndex]?.values?.[activeMultiParamCell.columnId]
  for (
    let index = rowIndex + 1;
    index < multiParamRows.value.length;
    index += 1
  ) {
    multiParamRows.value[index].values[activeMultiParamCell.columnId] = value
  }
}

function handleMultiParamPaste(event, rowId, columnId) {
  const text = event?.clipboardData?.getData('text')
  if (!text) return
  const grid = parseMultiParamGrid(text)
  if (!grid.length) return
  event.preventDefault()
  const startRowIndex = multiParamRows.value.findIndex(
    (row) => row.id === rowId,
  )
  const startColumnIndex = multiParamColumns.value.findIndex(
    (column) => column.id === columnId,
  )
  if (startRowIndex < 0 || startColumnIndex < 0) return
  if (shouldUseHeaderRow(grid, startRowIndex)) {
    const headerRow = grid[0] || []
    ensureMultiParamColumns(startColumnIndex + headerRow.length)
    headerRow.forEach((cell, colOffset) => {
      const column = multiParamColumns.value[startColumnIndex + colOffset]
      if (!column) return
      column.key = String(cell ?? '').trim()
    })
    const bodyRows = grid.slice(1)
    if (!bodyRows.length) return
    applyMultiParamGrid(bodyRows, startRowIndex, startColumnIndex)
    return
  }
  applyMultiParamGrid(grid, startRowIndex, startColumnIndex)
}

function handleMultiParamHeaderPaste(event, columnId) {
  const text = event?.clipboardData?.getData('text')
  if (!text) return
  const grid = parseMultiParamGrid(text)
  if (!grid.length) return
  event.preventDefault()
  const startColumnIndex = multiParamColumns.value.findIndex(
    (column) => column.id === columnId,
  )
  if (startColumnIndex < 0) return
  const headerRow = grid[0] || []
  ensureMultiParamColumns(startColumnIndex + headerRow.length)
  headerRow.forEach((cell, colOffset) => {
    const column = multiParamColumns.value[startColumnIndex + colOffset]
    if (!column) return
    column.key = String(cell ?? '').trim()
  })
  const bodyRows = grid.slice(1)
  if (!bodyRows.length) return
  applyMultiParamGrid(bodyRows, 0, startColumnIndex)
}

function shouldUseHeaderRow(grid, startRowIndex) {
  if (!Array.isArray(grid) || grid.length < 2) return false
  const header = grid[0] || []
  const hasLetters = header.some((cell) =>
    /[A-Za-zА-Яа-я_]/.test(String(cell || '').trim()),
  )
  if (!hasLetters) return false
  if (startRowIndex === 0) return true
  if (columnsAreAutoGenerated()) return true
  if (headerRowMatchesColumns(header)) return true
  return false
}

function columnsAreAutoGenerated() {
  return multiParamColumns.value.every((column) => {
    const key = String(column.key || '').trim()
    if (!key) return true
    return /^param\d+$/i.test(key)
  })
}

function headerRowMatchesColumns(header = []) {
  const keys = new Set(
    multiParamColumns.value.map((column) =>
      String(column.key || '')
        .trim()
        .toLowerCase(),
    ),
  )
  return header.some((cell) =>
    keys.has(
      String(cell || '')
        .trim()
        .toLowerCase(),
    ),
  )
}

function parseMultiParamGrid(raw = '') {
  const normalized = String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  if (!lines.length) return []
  const trimmed = lines.filter(
    (line, index) => line !== '' || index !== lines.length - 1,
  )
  if (!trimmed.length) return []
  const delimiter = trimmed.some((line) => line.includes('\t')) ? '\t' : ','
  return trimmed.map((line) => line.split(delimiter))
}

function applyMultiParamGrid(grid, startRowIndex, startColumnIndex) {
  const maxColumns = grid.reduce((acc, row) => Math.max(acc, row.length), 0)
  ensureMultiParamColumns(startColumnIndex + maxColumns)
  const requiredRows = startRowIndex + grid.length
  while (multiParamRows.value.length < requiredRows) {
    addMultiParamRow()
  }
  grid.forEach((cells, rowOffset) => {
    const row = multiParamRows.value[startRowIndex + rowOffset]
    if (!row) return
    cells.forEach((cell, colOffset) => {
      const column = multiParamColumns.value[startColumnIndex + colOffset]
      if (!column) return
      row.values[column.id] = String(cell ?? '')
    })
  })
}

function ensureMultiParamColumns(requiredCount) {
  const existingKeys = new Set(
    multiParamColumns.value.map((column) => String(column.key || '').trim()),
  )
  while (multiParamColumns.value.length < requiredCount) {
    const key = buildAutoColumnKey(existingKeys)
    existingKeys.add(key)
    const column = createMultiParamColumn(key)
    multiParamColumns.value.push(column)
    multiParamRows.value.forEach((row) => {
      row.values[column.id] = ''
    })
  }
}

function handleMultiParamKeydown(event, rowIndex, columnId) {
  if (!event) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    duplicateMultiParamRow(rowIndex)
    const nextRow = multiParamRows.value[rowIndex + 1]
    if (nextRow) {
      setActiveMultiParamCell(nextRow.id, columnId)
    }
  }
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

function normalizeUserValue(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function readStoredUserValue(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return normalizeUserValue(JSON.parse(raw))
  } catch {
    return null
  }
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

async function fetchAggregatorFactors() {
  try {
    const records = await fetchFactorValues('Prop_FieldVal')
    aggregatorRecords.value = Array.isArray(records) ? records : []
  } catch (err) {
    console.warn('Failed to load aggregator factors', err)
  }
}

async function fetchVisualizationTypes() {
  visualizationTypesLoading.value = true
  try {
    const records = await fetchFactorValues('Prop_VisualTyp')
    visualizationTypes.value = Array.isArray(records) ? records : []
    if (!selectedVisualizationId.value && visualizationTypes.value.length) {
      autoSelectVisualizationType()
    }
    if (!visualizationTypes.value.length) {
      selectedVisualizationId.value = ''
      vizType.value = 'table'
    }
  } catch (err) {
    console.warn('Failed to load visualization types', err)
    visualizationTypes.value = []
    selectedVisualizationId.value = ''
    vizType.value = 'table'
  } finally {
    visualizationTypesLoading.value = false
  }
}

async function fetchReportConfigs(parentId = null) {
  const numericParent = Number(parentId)
  const hasValidParent = Number.isFinite(numericParent)
  configsLoading.value = true
  configsReady.value = false
  try {
    if (!hasValidParent) {
      reportConfigs.value = []
      return
    }
    const records = await loadReportConfigurations()
    const normalized = records.map((entry) => normalizeRemoteConfig(entry))
    if (currentSourceParentId.value !== numericParent) {
      return
    }
    reportConfigs.value = normalized.filter(
      (cfg) => cfg.parent === numericParent,
    )
    configsReady.value = true
  } catch (err) {
    console.warn('Failed to load report configurations', err)
    reportConfigs.value = []
  } finally {
    configsLoading.value = false
    if (!hasValidParent) configsReady.value = false
  }
}

async function fetchReportPresentations(parentId = null) {
  const numericParent = Number(parentId)
  const hasValidParent = Number.isFinite(numericParent)
  presentationsLoading.value = true
  presentationsReady.value = false
  try {
    if (!hasValidParent) {
      presentations.value = []
      return
    }
    const records = await loadReportPresentations()
    const normalized = records.map((entry) =>
      normalizeRemotePresentation(entry),
    )
    presentations.value = normalized.filter(
      (item) => item.parent === numericParent,
    )
    presentationsReady.value = true
  } catch (err) {
    console.warn('Failed to load report presentations', err)
    presentations.value = []
  } finally {
    presentationsLoading.value = false
    if (!hasValidParent) presentationsReady.value = false
  }
}

function normalizeRemoteConfig(entry = {}) {
  const filterPayload = parseMetaPayload(entry.FilterVal)
  const rowPayload = parseMetaPayload(entry.RowVal)
  const colPayload = parseMetaPayload(entry.ColVal)
  const knownKeys = collectKnownFieldKeys(filterPayload, rowPayload, colPayload)
  const combinedOverrides = {
    ...(filterPayload.headerOverrides || {}),
    ...(rowPayload.headerOverrides || {}),
    ...(colPayload.headerOverrides || {}),
  }
  const rawParent =
    entry.parent ?? entry.parentId ?? entry.parent_id ?? entry.Parent
  const parentValue = Number(rawParent)
  const parent = Number.isFinite(parentValue) ? parentValue : null
  const metrics = mergeMetricSettings(
    entry.complex || [],
    filterPayload.metricSettings || [],
  )
  return {
    id: entry.id ? String(entry.id) : createId(),
    name: entry.name || `Конфигурация ${entry.id || ''}`,
    parent,
    remoteMeta: entry,
    pivot: {
      filters: parseFieldSequence(entry.Filter, knownKeys),
      rows: parseFieldSequence(entry.Row, knownKeys),
      columns: parseFieldSequence(entry.Col, knownKeys),
    },
    headerOverrides: combinedOverrides,
    filterValues: filterPayload.values || {},
    filterRanges: filterPayload.ranges || {},
    filterModes: Object.keys(filterPayload.modes || {}).length
      ? sanitizeModeSnapshot(filterPayload.modes)
      : extractModesFromMeta(filterPayload.filtersMeta),
    rowFilters: rowPayload.values || {},
    rowRanges: rowPayload.ranges || {},
    columnFilters: colPayload.values || {},
    columnRanges: colPayload.ranges || {},
    filtersMeta: filterPayload.filtersMeta || [],
    fieldMeta: filterPayload.fieldMeta || {},
    sorts: {
      filters: filterPayload.sorts || {},
      rows: rowPayload.sorts || {},
      columns: colPayload.sorts || {},
    },
    metrics,
  }
}

function normalizeRemotePresentation(entry = {}) {
  const rawParent =
    entry.parent ?? entry.parentId ?? entry.parent_id ?? entry.Parent
  const parentValue = Number(rawParent)
  const parent = Number.isFinite(parentValue) ? parentValue : null
  return {
    id: entry.id ? String(entry.id) : createId(),
    name: entry.name || `Представление ${entry.id || ''}`,
    parent,
    description: entry.Discription || entry.Description || '',
    fvVisualTyp: toNumericValue(entry.fvVisualTyp ?? entry.fv) || null,
    pvVisualTyp: toNumericValue(entry.pvVisualTyp ?? entry.pv) || null,
    visualizationLabel: entry.nameVisualTyp || entry.VisualTypName || '',
    remoteMeta: entry,
  }
}

function parseFieldSequence(value, knownKeys = null) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  const trimmed = String(value).trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch {
    // ignore
  }
  const tokens = trimmed
    .split(/[.,|;]/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (!tokens.length) return []
  return rebuildSequenceTokens(tokens, knownKeys)
}

function rebuildSequenceTokens(tokens = [], knownKeys = new Set()) {
  const result = []
  let index = 0
  while (index < tokens.length) {
    const match = findKnownSequence(tokens, index, knownKeys)
    if (match) {
      result.push(match.value)
      index = match.nextIndex
      continue
    }
    const heuristic = attemptJoinHeuristic(tokens, index)
    if (heuristic) {
      result.push(heuristic.value)
      index = heuristic.nextIndex
      continue
    }
    result.push(tokens[index])
    index += 1
  }
  return result
}

function findKnownSequence(tokens, start, knownKeys = new Set()) {
  if (!knownKeys || !knownKeys.size) return null
  for (let end = tokens.length; end > start; end -= 1) {
    const candidate = tokens.slice(start, end).join('.')
    if (knownKeys.has(candidate)) {
      return { value: candidate, nextIndex: end }
    }
  }
  return null
}

const JOIN_PREFIX_PATTERN = /^[A-Z0-9_]+$/
const JOIN_FIELD_PATTERN = /^[a-zA-Z0-9_]+$/

function attemptJoinHeuristic(tokens, start) {
  const prefix = tokens[start]
  const next = tokens[start + 1]
  if (!prefix || !next) return null
  if (JOIN_PREFIX_PATTERN.test(prefix) && JOIN_FIELD_PATTERN.test(next)) {
    return { value: `${prefix}.${next}`, nextIndex: start + 2 }
  }
  return null
}

function encodeFieldSequence(list = []) {
  const filtered = (list || [])
    .map((item) =>
      typeof item === 'string' ? item.trim() : String(item || '').trim(),
    )
    .filter(Boolean)
  if (!filtered.length) return ''
  try {
    return JSON.stringify(filtered)
  } catch {
    return filtered.join('|')
  }
}

function parseMetaPayload(value) {
  const fallback = { values: {}, ranges: {}, modes: {} }
  if (!value) return fallback
  let payload = value
  if (typeof value === 'string') {
    try {
      payload = JSON.parse(value)
    } catch {
      return fallback
    }
  }
  if (!payload || typeof payload !== 'object') return fallback
  return {
    ...payload,
    values: payload.values || {},
    ranges: payload.ranges || {},
    modes: payload.modes || {},
  }
}

function collectKnownFieldKeys(...payloads) {
  const set = new Set()
  payloads.forEach((payload) => {
    if (!payload || typeof payload !== 'object') return
    collectKeysFromObject(set, payload.values)
    collectKeysFromObject(set, payload.ranges)
    collectKeysFromObject(set, payload.headerOverrides)
    collectKeysFromObject(set, payload.sorts)
    collectKeysFromObject(set, payload.fieldMeta)
    if (Array.isArray(payload.filtersMeta)) {
      payload.filtersMeta.forEach((meta) => {
        if (meta?.key) set.add(String(meta.key).trim())
      })
    }
    if (Array.isArray(payload.metricSettings)) {
      payload.metricSettings.forEach((meta) => {
        if (meta?.fieldKey) set.add(String(meta.fieldKey).trim())
      })
    }
  })
  return set
}

function collectKeysFromObject(target, source) {
  if (!source || typeof source !== 'object') return
  Object.keys(source).forEach((key) => {
    const normalized = String(key).trim()
    if (normalized) target.add(normalized)
  })
}

function encodeFilterPayload() {
  return JSON.stringify({
    values: copyFilterStore(filterValues),
    ranges: copyRangeStore(filterRangeValues),
    modes: copyModeStore(filterModeSelections),
    headerOverrides: pickHeaderOverrides(pivotConfig.filters),
    sorts: cloneSortState(pivotSortState.filters),
    metricSettings: pivotMetrics.map((metric) => ({
      id: metric.id,
      type: metric.type || 'base',
      title: metric.title || '',
      enabled: metric.enabled !== false,
      showRowTotals: metric.showRowTotals !== false,
      showColumnTotals: metric.showColumnTotals !== false,
      aggregator: metric.aggregator,
      remoteId: metric.remoteMeta?.idMetricsComplex,
      fieldKey: metric.fieldKey,
      expression: metric.expression || '',
      precision: Number.isFinite(metric.precision)
        ? Number(metric.precision)
        : 2,
      outputFormat:
        metric.outputFormat || (metric.type === 'formula' ? 'number' : 'auto'),
      conditionalFormatting: metric.conditionalFormatting,
      detailFields: Array.isArray(metric.detailFields)
        ? metric.detailFields
        : [],
    })),
    filtersMeta: buildFiltersMetaSnapshot(),
    fieldMeta: buildFieldMetaSnapshot(),
  })
}

function encodeDimensionPayload(keys, store, sortStore, rangeStore = {}) {
  return JSON.stringify({
    values: copyFilterStore(store),
    ranges: copyRangeStore(rangeStore),
    headerOverrides: pickHeaderOverrides(keys),
    sorts: cloneSortState(sortStore),
  })
}

function pickHeaderOverrides(keys = []) {
  if (!keys || !keys.length) return {}
  const allowed = new Set(keys)
  return Object.entries(headerOverrides).reduce((acc, [key, value]) => {
    if (allowed.has(key)) {
      acc[key] = value
    }
    return acc
  }, {})
}

function cloneSortState(store = {}) {
  return Object.entries(store).reduce((acc, [key, value]) => {
    acc[key] = {
      value: value?.value || 'none',
      metric: value?.metric || 'none',
    }
    return acc
  }, {})
}

function buildFiltersMetaSnapshot() {
  if (!pivotConfig.filters.length) return []
  return pivotConfig.filters.map((key) => ({
    key,
    label: getFieldDisplayNameByKey(key),
    values: collectFilterMetaValues(key),
    mode:
      normalizeFilterMode(filterModeSelections[key]) ||
      (hasActiveRange(filterRangeValues[key]) ? 'range' : ''),
    hidden: hasFilterSelection(key) ? Boolean(filterVisibilityStore[key]) : false,
  }))
}

function buildFieldMetaSnapshot(limit = 20) {
  const meta = {}
  fields.value.forEach((field) => {
    if (!field?.key) return
    const key = String(field.key).trim()
    if (!key) return
    const override = headerOverrides[key]
    const dictionary = dictionaryLabelValue(key)
    const label =
      (override && override.trim()) ||
      dictionary ||
      field.label ||
      humanizeKey(key)
    meta[key] = {
      label,
      sample: field.sample || '—',
      values: Array.isArray(field.values) ? field.values.slice(0, limit) : [],
      type: field.type || 'string',
    }
    if (field.type === 'date' && Array.isArray(field.dateParts)) {
      field.dateParts.forEach((part) => {
        if (!part?.key) return
        meta[part.key] = {
          label: getFieldDisplayNameByKey(part.key),
          sample: part.values?.[0] || label,
          values: Array.isArray(part.values) ? part.values.slice(0, limit) : [],
          type: 'string',
        }
      })
    }
  })
  return meta
}

function collectFilterMetaValues(key) {
  const options = fieldValueOptions(key)
  if (!options || !options.length) return []
  const unique = new Set()
  options.forEach((option) => {
    const normalized = normalizeValue(option.value)
    if (!unique.has(normalized)) {
      unique.add(normalized)
    }
  })
  return Array.from(unique)
}

function extractModesFromMeta(list = []) {
  if (!Array.isArray(list) || !list.length) return {}
  return list.reduce((acc, meta) => {
    if (!meta?.key) return acc
    const normalized = normalizeFilterMode(meta.mode)
    if (normalized) {
      acc[meta.key] = normalized
    }
    return acc
  }, {})
}

function mergeMetricSettings(remoteList = [], settings = []) {
  const result = []
  const remoteById = new Map(
    (remoteList || []).map((entry) => [
      toNumericValue(entry?.idMetricsComplex),
      entry,
    ]),
  )
  const remoteByField = new Map(
    (remoteList || []).map((entry) => [
      entry?.FieldName || entry?.Field,
      entry,
    ]),
  )
  const usedRemote = new Set()
  if (Array.isArray(settings) && settings.length) {
    settings.forEach((saved) => {
      if (saved?.type === 'formula') {
        result.push(
          createMetric({
            id: saved.id,
            type: 'formula',
            title: saved.title || '',
            enabled: saved.enabled !== false,
            showRowTotals: saved.showRowTotals !== false,
            showColumnTotals: saved.showColumnTotals !== false,
            expression: saved.expression || '',
            precision: Number.isFinite(saved.precision)
              ? Number(saved.precision)
              : 2,
            outputFormat: saved.outputFormat || 'number',
            conditionalFormatting: saved?.conditionalFormatting,
            detailFields: Array.isArray(saved?.detailFields)
              ? [...saved.detailFields]
              : [],
          }),
        )
        return
      }
      const remoteEntry =
        (saved?.remoteId && remoteById.get(toNumericValue(saved.remoteId))) ||
        (saved?.fieldKey && remoteByField.get(saved.fieldKey))
      if (remoteEntry) {
        usedRemote.add(remoteEntry)
        result.push(normalizeRemoteMetric(remoteEntry, saved))
      }
    })
  }
  remoteList.forEach((entry, index) => {
    if (usedRemote.has(entry)) return
    result.push(normalizeRemoteMetric(entry, null, index))
  })
  return result
}

function normalizeRemoteMetric(entry = {}, saved = null, index = 0) {
  const fieldKey = entry?.FieldName || saved?.fieldKey || ''
  const aggregatorKey =
    saved?.aggregator ||
    resolveAggregatorKeyFromRemote(entry?.fvFieldVal, entry?.pvFieldVal) ||
    'sum'
  return createMetric({
    id:
      saved?.id ||
      (entry?.idMetricsComplex ? String(entry.idMetricsComplex) : undefined) ||
      `metric-${index}`,
    type: 'base',
    fieldKey,
    aggregator: aggregatorKey,
    title: saved?.title || '',
    enabled: saved?.enabled !== false,
    showRowTotals: saved?.showRowTotals !== false,
    showColumnTotals: saved?.showColumnTotals !== false,
    outputFormat: saved?.outputFormat || 'auto',
    conditionalFormatting: saved?.conditionalFormatting,
    detailFields: Array.isArray(saved?.detailFields)
      ? [...saved.detailFields]
      : [],
    remoteMeta: {
      idMetricsComplex: entry?.idMetricsComplex,
      idFieldVal: entry?.idFieldVal,
      idFieldName: entry?.idFieldName,
      fvFieldVal: entry?.fvFieldVal,
      pvFieldVal: entry?.pvFieldVal,
    },
  })
}

function handleConfigSearch(value = '') {
  configSearch.value = value || ''
  const trimmed = configSearch.value.trim()
  if (!configsReady.value) {
    pendingConfigName.value = ''
    return
  }
  if (!trimmed) {
    pendingConfigName.value = ''
    return
  }
  const exists = filteredConfigs.value.some(
    (cfg) => cfg.name?.toLowerCase() === trimmed.toLowerCase(),
  )
  pendingConfigName.value = exists ? '' : trimmed
}

function createConfigFromSearch() {
  if (!pendingConfigName.value.trim()) return
  configName.value = pendingConfigName.value.trim()
  selectedConfigId.value = ''
  pendingConfigName.value = ''
  currentConfigMeta.value = null
  layoutDetailsVisible.value = true
}

function handlePresentationSearch(value = '') {
  presentationSearch.value = value || ''
  const trimmed = presentationSearch.value.trim()
  if (!presentationsReady.value) {
    pendingPresentationName.value = ''
    return
  }
  if (!trimmed) {
    pendingPresentationName.value = ''
    return
  }
  const exists = filteredPresentations.value.some(
    (item) => item.name?.toLowerCase() === trimmed.toLowerCase(),
  )
  pendingPresentationName.value = exists ? '' : trimmed
}

function createPresentationFromSearch() {
  if (!pendingPresentationName.value.trim()) return
  presentationName.value = pendingPresentationName.value.trim()
  selectedPresentationId.value = ''
  pendingPresentationName.value = ''
  currentPresentationMeta.value = null
  presentationDescription.value = ''
  presentationDetailsVisible.value = true
  selectedVisualizationId.value = ''
}

function togglePresentationDetails() {
  if (!canManagePresentations.value) return
  presentationDetailsVisible.value = !presentationDetailsVisible.value
}

function loadPresentationRecord() {
  if (!selectedPresentationId.value) return
  const entry = filteredPresentations.value.find(
    (item) => item.id === selectedPresentationId.value,
  )
  if (entry) {
    applyPresentationRecord(entry)
  }
}

function applyPresentationRecord(record) {
  if (!record) return
  presentationName.value = record.name || ''
  presentationDescription.value = record.description || ''
  currentPresentationMeta.value = record.remoteMeta || null
  const matchId = findVisualizationOptionIdByMeta(
    record.fvVisualTyp,
    record.pvVisualTyp,
  )
  if (matchId) {
    selectedVisualizationId.value = matchId
  } else if (record.visualizationLabel) {
    vizType.value = resolveVisualizationChartType({
      name: record.visualizationLabel,
    })
    selectedVisualizationId.value = ''
  }
}

function resetPresentationEditor() {
  selectedPresentationId.value = ''
  currentPresentationMeta.value = null
  presentationName.value = ''
  presentationDescription.value = ''
  presentationDetailsVisible.value = false
  presentationSearch.value = ''
  pendingPresentationName.value = ''
  selectedVisualizationId.value = ''
}

function toggleLayoutDetails() {
  layoutDetailsVisible.value = !layoutDetailsVisible.value
  if (layoutDetailsVisible.value && selectedConfigId.value) {
    const entry = reportConfigs.value.find(
      (cfg) => cfg.id === selectedConfigId.value,
    )
    if (entry) {
      configName.value = entry.name || ''
    }
  }
}

function loadLayoutConfig() {
  if (!selectedConfigId.value) return
  const entry = reportConfigs.value.find(
    (cfg) => cfg.id === selectedConfigId.value,
  )
  if (entry) {
    configName.value = entry.name || ''
    applyConfigRecord(entry)
  }
}

function applyConfigRecord(record) {
  const pivot = record.pivot || {}
  replaceArray(pivotConfig.filters, pivot.filters || [])
  replaceArray(pivotConfig.rows, pivot.rows || [])
  replaceArray(pivotConfig.columns, pivot.columns || [])

  pivotMetrics.splice(0, pivotMetrics.length, ...(record.metrics || []))
  pivotMetricsVersion.value += 1
  ensureMetricExists()

  Object.keys(filterValues).forEach((key) => delete filterValues[key])
  Object.keys(filterRangeValues).forEach((key) => delete filterRangeValues[key])
  Object.entries(record.filterValues || {}).forEach(([key, values]) => {
    filterValues[key] = [...values]
  })
  Object.entries(record.filterRanges || {}).forEach(([key, range]) => {
    const sanitized = sanitizeRange(range)
    if (sanitized) {
      filterRangeValues[key] = sanitized
    }
  })
  Object.keys(filterModeSelections).forEach(
    (key) => delete filterModeSelections[key],
  )
  Object.entries(record.filterModes || {}).forEach(([key, mode]) => {
    const normalized = normalizeFilterMode(mode)
    if (normalized) {
      filterModeSelections[key] = normalized
    }
  })
  pruneFilterModes()
  Object.keys(filterVisibilityStore).forEach(
    (key) => delete filterVisibilityStore[key],
  )
  ;(record.filtersMeta || []).forEach((meta) => {
    if (!meta?.key) return
    filterVisibilityStore[meta.key] = Boolean(meta.hidden)
  })
  applyFilterSnapshot(
    dimensionValueFilters.rows,
    pivotConfig.rows,
    record.rowFilters || {},
  )
  applyFilterSnapshot(
    dimensionValueFilters.columns,
    pivotConfig.columns,
    record.columnFilters || {},
  )
  applyRangeSnapshot(
    dimensionRangeFilters.rows,
    pivotConfig.rows,
    record.rowRanges || {},
  )
  applyRangeSnapshot(
    dimensionRangeFilters.columns,
    pivotConfig.columns,
    record.columnRanges || {},
  )
  applySortSnapshot(pivotSortState.filters, record.sorts?.filters || {})
  applySortSnapshot(pivotSortState.rows, record.sorts?.rows || {})
  applySortSnapshot(pivotSortState.columns, record.sorts?.columns || {})

  Object.keys(headerOverrides).forEach((key) => delete headerOverrides[key])
  Object.entries(record.headerOverrides || {}).forEach(([key, value]) => {
    headerOverrides[key] = value
  })

  currentConfigMeta.value = record.remoteMeta || null
}

function applySortSnapshot(target, snapshot = {}) {
  Object.keys(target).forEach((key) => delete target[key])
  Object.entries(snapshot).forEach(([key, value]) => {
    target[key] = {
      value: value?.value || 'none',
      metric: value?.metric || 'none',
    }
  })
}

function updateRows(next = []) {
  replaceArray(pivotConfig.rows, next || [])
}

function updateColumns(next = []) {
  replaceArray(pivotConfig.columns, next || [])
}

function updateFilters(next = []) {
  replaceArray(pivotConfig.filters, next || [])
  pruneFilterModes(next || [])
}

function handleFieldRename({ key, title }) {
  if (!key) return
  if (!title || !title.trim()) {
    delete headerOverrides[key]
    return
  }
  headerOverrides[key] = title.trim()
}

function handleFilterModePreference({ key, mode }) {
  if (!key) return
  const normalized = normalizeFilterMode(mode)
  if (normalized) {
    filterModeSelections[key] = normalized
  } else {
    delete filterModeSelections[key]
  }
}

function hasFilterSelection(key) {
  if (!key) return false
  const values = filterValues[key]
  if (Array.isArray(values) && values.length) return true
  return hasActiveRange(filterRangeValues[key])
}

function handleFilterVisibilityChange({ key, hidden }) {
  if (!key) return
  if (!hasFilterSelection(key)) {
    filterVisibilityStore[key] = false
    return
  }
  filterVisibilityStore[key] = Boolean(hidden)
}

function handleFilterValuesChange({ key, values }) {
  if (!key) return
  filterValues[key] = [...(values || [])]
  delete filterRangeValues[key]
  handleFilterModePreference({ key, mode: 'values' })
  if (!hasFilterSelection(key)) {
    filterVisibilityStore[key] = false
  }
}

function handleRowValueFiltersChange({ key, values }) {
  if (!key) return
  dimensionValueFilters.rows[key] = [...(values || [])]
  delete dimensionRangeFilters.rows[key]
}

function handleColumnValueFiltersChange({ key, values }) {
  if (!key) return
  dimensionValueFilters.columns[key] = [...(values || [])]
  delete dimensionRangeFilters.columns[key]
}

function handleFilterRangeChange({ key, range }) {
  if (!key) return
  const sanitized = sanitizeRange(range)
  if (sanitized) {
    filterRangeValues[key] = sanitized
  } else {
    delete filterRangeValues[key]
  }
  if (filterValues[key]) {
    filterValues[key] = []
  }
  handleFilterModePreference({ key, mode: 'range' })
  if (!hasFilterSelection(key)) {
    filterVisibilityStore[key] = false
  }
}

function handleRowRangeFiltersChange({ key, range }) {
  if (!key) return
  const sanitized = sanitizeRange(range)
  if (sanitized) {
    dimensionRangeFilters.rows[key] = sanitized
  } else {
    delete dimensionRangeFilters.rows[key]
  }
  if (dimensionValueFilters.rows[key]) {
    dimensionValueFilters.rows[key] = []
  }
}

function handleColumnRangeFiltersChange({ key, range }) {
  if (!key) return
  const sanitized = sanitizeRange(range)
  if (sanitized) {
    dimensionRangeFilters.columns[key] = sanitized
  } else {
    delete dimensionRangeFilters.columns[key]
  }
  if (dimensionValueFilters.columns[key]) {
    dimensionValueFilters.columns[key] = []
  }
}

function handleRowSortChange(payload) {
  updateSortState(pivotSortState.rows, payload)
}

function handleColumnSortChange(payload) {
  updateSortState(pivotSortState.columns, payload)
}

function handleFilterSortChange(payload) {
  updateSortState(pivotSortState.filters, payload)
}

function updateSortState(store, { key, kind, direction }) {
  if (!key || !kind) return
  if (!store[key]) {
    store[key] = { value: 'none', metric: 'none' }
  }
  store[key][kind] = direction || 'none'
}

function moveMetric({ index, delta }) {
  const next = index + delta
  if (next < 0 || next >= pivotMetrics.length) return
  const copy = [...pivotMetrics]
  const [moved] = copy.splice(index, 1)
  copy.splice(next, 0, moved)
  pivotMetrics.splice(0, pivotMetrics.length, ...copy)
  pivotMetricsVersion.value += 1
}

async function saveCurrentConfig() {
  if (batchIsActive.value || batchHasBlockingIssue.value) {
    alert(
      'Сначала завершите пакетную загрузку и убедитесь, что результат не превышает лимиты.',
    )
    return
  }
  if (!configName.value.trim()) {
    alert('Укажите название конфигурации')
    return
  }
  if (!preparedMetrics.value.length) {
    alert('Добавьте хотя бы одну метрику')
    return
  }
  const parentId = getCurrentParentId()
  if (!parentId) {
    alert('Не выбран удалённый источник данных для конфигурации')
    return
  }
  const userContext = await resolveUserContext()
  if (!userContext) {
    alert(
      'Не удалось определить пользователя. Обновите страницу или войдите заново перед сохранением конфигурации.',
    )
    return
  }
  const payload = buildConfigPayload(parentId, userContext)
  const previousMeta = currentConfigMeta.value
  const operation = currentConfigMeta.value?.id ? 'upd' : 'ins'
  configSaving.value = true
  try {
    const saved = await saveReportConfiguration(operation, payload)
    const savedId = saved?.id || previousMeta?.id
    if (saved) {
      currentConfigMeta.value = saved
    } else if (previousMeta) {
      currentConfigMeta.value = { ...previousMeta, ...payload }
    } else {
      currentConfigMeta.value = payload
    }
    const previousMetricIds = new Set(
      (previousMeta?.complex || []).map((item) =>
        Number(item.idMetricsComplex),
      ),
    )
    const currentRemoteIds = new Set(
      pivotMetrics
        .map((metric) => Number(metric.remoteMeta?.idMetricsComplex))
        .filter(Boolean),
    )
    for (const oldId of previousMetricIds) {
      if (oldId && !currentRemoteIds.has(oldId)) {
        await deleteComplexEntity(oldId)
      }
    }
    const configRemoteId = Number(savedId)
    for (const metric of pivotMetrics) {
      if (metric.type === 'formula') continue
      const metricPayload = buildMetricPayload(metric, configRemoteId)
      const metricOperation = metric.remoteMeta?.idMetricsComplex
        ? 'upd'
        : 'ins'
      await saveComplexMetric(metricOperation, metricPayload)
    }
    await fetchReportConfigs(getCurrentParentId())
    if (configRemoteId) {
      const refreshed = reportConfigs.value.find(
        (cfg) => Number(cfg.remoteMeta?.id) === configRemoteId,
      )
      if (refreshed) {
        selectedConfigId.value = refreshed.id
        applyConfigRecord(refreshed)
      }
    }
    await pageBuilderStore.fetchTemplates({ force: true, skipCooldown: true })
  } catch (err) {
    console.warn('Failed to save configuration', err)
    trackEvent('config_save_error', {
      message: String(err?.message || err),
    })
  } finally {
    configSaving.value = false
  }
}

async function savePresentation() {
  if (!canManagePresentations.value) return
  if (batchIsActive.value || batchHasBlockingIssue.value) {
    alert(
      'Нельзя сохранить представление, пока пакетная загрузка не завершена или результат слишком большой.',
    )
    return
  }
  const parentId = currentConfigRemoteId.value
  if (!parentId) {
    alert('Сохраните и выберите конфигурацию перед сохранением представления.')
    return
  }
  const visualization = selectedVisualization.value
  if (!visualization) {
    alert('Выберите тип визуализации')
    return
  }
  const typeMeta = extractVisualizationTypeMeta(visualization)
  if (!Number.isFinite(typeMeta.fv) || !Number.isFinite(typeMeta.pv)) {
    alert('Не удалось определить идентификаторы выбранного типа визуализации.')
    return
  }
  const cleanName = presentationName.value.trim()
  if (!cleanName) {
    alert('Укажите название представления')
    return
  }
  const storedObjUser = readStoredUserValue('objUser')
  const storedPvUser = readStoredUserValue('pvUser')
  if (!Number.isFinite(storedObjUser) || !Number.isFinite(storedPvUser)) {
    alert(
      'Не удалось определить пользователя. Обновите страницу или войдите заново перед сохранением представления.',
    )
    return
  }
  presentationSaving.value = true
  const previousMeta = currentPresentationMeta.value
  const operation = previousMeta?.id ? 'upd' : 'ins'
  const payload = buildPresentationPayload(typeMeta, {
    parentId,
    objUser: storedObjUser,
    pvUser: storedPvUser,
  })
  if (operation === 'upd') {
    const remoteId = Number(
      previousMeta?.id ?? previousMeta?.Id ?? previousMeta?.ID,
    )
    if (Number.isFinite(remoteId)) payload.id = remoteId
  }
  try {
    const saved = await saveReportPresentation(operation, payload)
    const savedId = saved?.id || previousMeta?.id || payload.id
    if (saved) {
      currentPresentationMeta.value = saved
    } else if (previousMeta) {
      currentPresentationMeta.value = { ...previousMeta, ...payload }
    } else {
      currentPresentationMeta.value = payload
    }
    await fetchReportPresentations(currentConfigRemoteId.value)
    if (savedId) {
      const refreshed = filteredPresentations.value.find(
        (item) => Number(item.remoteMeta?.id) === Number(savedId),
      )
      if (refreshed) {
        selectedPresentationId.value = refreshed.id
        applyPresentationRecord(refreshed)
      }
    }
    await pageBuilderStore.fetchTemplates({ force: true, skipCooldown: true })
    alert('Представление сохранено.')
    const duration = navigationStore.finishViewCreation()
    trackEvent('presentation_saved', { id: String(savedId || '') })
    if (duration !== null) {
      trackEvent('view_creation_complete', {
        id: String(savedId || ''),
        durationMs: duration,
      })
    }
  } catch (err) {
    console.warn('Failed to save report presentation', err)
    trackEvent('presentation_save_error', {
      message: String(err?.message || err),
    })
    alert('Не удалось сохранить представление. Попробуйте позже.')
  } finally {
    presentationSaving.value = false
  }
}

function buildConfigPayload(parentId, userContext = null) {
  const remoteMeta = currentConfigMeta.value || {}
  const userMeta = userContext || dataSourcesStore.userContext || {}
  const normalizedParent = Number(parentId)
  const formatDate = (value) => {
    if (!value) return new Date().toISOString().slice(0, 10)
    if (typeof value === 'string' && value.length >= 10)
      return value.slice(0, 10)
    return new Date(value).toISOString().slice(0, 10)
  }
  const createdAt = formatDate(remoteMeta.CreatedAt)
  const storedObjUser = readStoredUserValue('objUser')
  const storedPvUser = readStoredUserValue('pvUser')
  return {
    ...remoteMeta,
    parent: Number.isFinite(normalizedParent)
      ? normalizedParent
      : remoteMeta.parent,
    name: configName.value.trim(),
    Filter: encodeFieldSequence(pivotConfig.filters),
    Row: encodeFieldSequence(pivotConfig.rows),
    Col: encodeFieldSequence(pivotConfig.columns),
    FilterVal: encodeFilterPayload(),
    RowVal: encodeDimensionPayload(
      pivotConfig.rows,
      dimensionValueFilters.rows,
      pivotSortState.rows,
      dimensionRangeFilters.rows,
    ),
    ColVal: encodeDimensionPayload(
      pivotConfig.columns,
      dimensionValueFilters.columns,
      pivotSortState.columns,
      dimensionRangeFilters.columns,
    ),
    fvRowTotal: ROW_TOTAL_META.fv,
    pvRowTotal: ROW_TOTAL_META.pv,
    fvColTotal: COLUMN_TOTAL_META.fv,
    pvColTotal: COLUMN_TOTAL_META.pv,
    nameRowTotal: hasRowTotals.value ? 'да' : 'нет',
    nameColTotal: hasColumnTotals.value ? 'да' : 'нет',
    CreatedAt: createdAt,
    UpdatedAt: formatDate(remoteMeta.UpdatedAt || new Date().toISOString()),
    objUser:
      normalizeUserValue(userMeta.objUser) ||
      normalizeUserValue(remoteMeta.objUser) ||
      storedObjUser ||
      null,
    pvUser:
      normalizeUserValue(userMeta.pvUser) ||
      normalizeUserValue(remoteMeta.pvUser) ||
      storedPvUser ||
      null,
  }
}

function buildPresentationPayload(typeMeta, meta = {}) {
  const remoteMeta = currentPresentationMeta.value || {}
  const isoNow = new Date().toISOString()
  const createdAt = remoteMeta.CreatedAt || isoNow.slice(0, 10)
  const persistedVisualId = toNumericValue(remoteMeta.idVisualTyp)
  const visualTypeId = Number.isFinite(persistedVisualId)
    ? persistedVisualId
    : (typeMeta.id ?? null)
  return {
    ...remoteMeta,
    parent: meta.parentId,
    name: presentationName.value.trim(),
    Description: presentationDescription.value.trim(),
    fvVisualTyp: typeMeta.fv,
    pvVisualTyp: typeMeta.pv,
    idVisualTyp: visualTypeId,
    nameVisualTyp:
      typeMeta.label ||
      remoteMeta.nameVisualTyp ||
      formatVisualizationLabel(remoteMeta),
    CreationDateTime: remoteMeta.CreationDateTime || isoNow,
    CreatedAt: createdAt,
    UpdatedAt: isoNow.slice(0, 10),
    objUser: meta.objUser,
    pvUser: meta.pvUser,
  }
}

function buildMetricPayload(metric, configId) {
  const aggregatorMeta =
    getAggregatorMeta(metric.aggregator) || getAggregatorMeta('sum')
  return {
    id: Number(configId),
    idMetricsComplex: metric.remoteMeta?.idMetricsComplex,
    idFieldVal: metric.remoteMeta?.idFieldVal,
    idFieldName: metric.remoteMeta?.idFieldName,
    FieldName: metric.fieldKey,
    nameFieldVal: aggregatorMeta?.label || '',
    fvFieldVal: aggregatorMeta?.fvFieldVal || 0,
    pvFieldVal: aggregatorMeta?.pvFieldVal || 0,
  }
}

function getCurrentParentId() {
  return currentSourceParentId.value
}

async function deleteSelectedConfig() {
  if (!selectedConfigId.value) return
  const entry = reportConfigs.value.find(
    (cfg) => cfg.id === selectedConfigId.value,
  )
  if (!entry) return
  const remoteId = toNumericValue(
    entry.remoteMeta?.id ?? entry.remoteMeta?.Id ?? entry.remoteId,
  )
  if (!Number.isFinite(remoteId)) {
    alert('Не удалось определить идентификатор конфигурации.')
    return
  }
  const usageCount = await countPresentationsForConfig(remoteId)
  if (usageCount > 0) {
    alert(
      `Нельзя удалить конфигурацию: используется в ${usageCount} представлениях. Используйте архивирование.`,
    )
    trackEvent('config_delete_blocked', {
      id: String(remoteId),
      usageCount,
    })
    return
  }
  if (
    !confirm(
      `Удалить конфигурацию «${entry.name || 'Без названия'}»? Это действие нельзя отменить.`,
    )
  ) {
    return
  }
  try {
    await deleteObjectWithProperties(remoteId)
    selectedConfigId.value = ''
    currentConfigMeta.value = null
    await fetchReportConfigs(getCurrentParentId())
    archiveStore.restoreEntity('config', configArchiveKey(entry))
    trackEvent('config_deleted', { id: String(remoteId) })
  } catch (err) {
    console.warn('Failed to delete configuration', err)
    trackEvent('config_delete_error', {
      id: String(remoteId),
      message: String(err?.message || err),
    })
    alert('Не удалось удалить конфигурацию. Попробуйте позже.')
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

function copyRangeStore(store) {
  return Object.entries(store).reduce((acc, [key, range]) => {
    const sanitized = sanitizeRange(range)
    if (sanitized) {
      acc[key] = sanitized
    }
    return acc
  }, {})
}

function copyModeStore(store = {}) {
  return Object.entries(store).reduce((acc, [key, mode]) => {
    const normalized = normalizeFilterMode(mode)
    if (normalized) {
      acc[key] = normalized
    }
    return acc
  }, {})
}

function pruneFilterModes(allowed = pivotConfig.filters) {
  const allowedSet = new Set(allowed || [])
  Object.keys(filterModeSelections).forEach((key) => {
    if (!allowedSet.has(key)) {
      delete filterModeSelections[key]
    }
  })
}

function normalizeFilterMode(mode) {
  if (mode === 'range' || mode === 'values') return mode
  return ''
}

function sanitizeModeSnapshot(snapshot = {}) {
  return Object.entries(snapshot || {}).reduce((acc, [key, mode]) => {
    const normalized = normalizeFilterMode(mode)
    if (normalized) {
      acc[key] = normalized
    }
    return acc
  }, {})
}

function applyFilterSnapshot(store, keys, snapshot) {
  Object.keys(store).forEach((key) => delete store[key])
  keys.forEach((key) => {
    store[key] = [...(snapshot[key] || [])]
  })
}

function applyRangeSnapshot(store, keys, snapshot = {}) {
  Object.keys(store).forEach((key) => delete store[key])
  keys.forEach((key) => {
    const next = sanitizeRange(snapshot[key])
    if (next) {
      store[key] = next
    }
  })
}

function swapPivotAxes() {
  if (!isPivotSource.value) return
  const prevRows = [...pivotConfig.rows]
  const prevColumns = [...pivotConfig.columns]
  const prevRowFilters = copyFilterStore(dimensionValueFilters.rows)
  const prevColumnFilters = copyFilterStore(dimensionValueFilters.columns)
  const prevRowRanges = copyRangeStore(dimensionRangeFilters.rows)
  const prevColumnRanges = copyRangeStore(dimensionRangeFilters.columns)

  replaceArray(pivotConfig.rows, prevColumns)
  replaceArray(pivotConfig.columns, prevRows)

  applyFilterSnapshot(
    dimensionValueFilters.rows,
    pivotConfig.rows,
    prevColumnFilters,
  )
  applyFilterSnapshot(
    dimensionValueFilters.columns,
    pivotConfig.columns,
    prevRowFilters,
  )
  applyRangeSnapshot(
    dimensionRangeFilters.rows,
    pivotConfig.rows,
    prevColumnRanges,
  )
  applyRangeSnapshot(
    dimensionRangeFilters.columns,
    pivotConfig.columns,
    prevRowRanges,
  )

  Object.keys(columnWidths).forEach((key) => delete columnWidths[key])
  Object.keys(rowHeights).forEach((key) => delete rowHeights[key])
}

function exportToCsv() {
  if (!pivotView.value) {
    alert('Нет данных для экспорта')
    return
  }
  const csv = buildCsvFromPivot(pivotView.value, {
    showRowTotals: hasRowTotals.value,
    showColumnTotals: hasColumnTotals.value,
    rowMetricIds: rowTotalMetricIds.value,
    columnMetricIds: columnTotalMetricIds.value,
  })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pivot-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function buildCsvFromPivot(
  view,
  options = { showRowTotals: true, showColumnTotals: true },
) {
  const rowAllowed = new Set(options.rowMetricIds || [])
  const columnAllowed = new Set(options.columnMetricIds || [])
  const includeRowTotals = options.showRowTotals && rowAllowed.size > 0
  const includeColumnTotals = options.showColumnTotals && columnAllowed.size > 0

  const rowHeaders = includeRowTotals
    ? view.rowTotalHeaders.filter((header) => rowAllowed.has(header.metricId))
    : []

  const header = [
    'Строки',
    ...view.columns.map((col) => formatColumnEntryLabel(col)),
  ]
  if (rowHeaders.length) {
    header.push(...rowHeaders.map((total) => total.label))
  }
  const rows = view.rows.map((row) => {
    const cells = [
      resolveRowHeaderLabel(row),
      ...row.cells.map((cell) => cell.display),
    ]
    if (rowHeaders.length) {
      cells.push(
        ...row.totals
          .filter((total) => rowAllowed.has(total.metricId))
          .map((total) => total.display),
      )
    }
    return cells
  })
  const totalsRow = ['Итого по столбцам']
  if (includeColumnTotals) {
    totalsRow.push(
      ...view.columns.map((column) =>
        columnAllowed.has(column.metricId) ? column.totalDisplay : '',
      ),
    )
  } else {
    totalsRow.push(...view.columns.map(() => ''))
  }
  if (rowHeaders.length) {
    totalsRow.push(
      ...rowHeaders.map(
        (total) => view.grandTotals?.[total.metricId]?.display || '',
      ),
    )
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
  if (!field?.key) return ''
  return getFieldDisplayNameByKey(field.key)
}

function getFieldDisplayNameByKey(key = '') {
  if (!key) return ''
  const override = headerOverrides[key]
  if (override && override.trim()) return override.trim()
  const dictionaryLabel = dictionaryLabelValue(key)
  if (dictionaryLabel) return dictionaryLabel
  const dateMeta = parseDatePartKey(key)
  if (dateMeta) {
    const baseOverride = headerOverrides[dateMeta.fieldKey]
    if (baseOverride && baseOverride.trim()) {
      return formatDatePartFieldLabel(baseOverride, dateMeta.part)
    }
    const baseDictionary = dictionaryLabelValue(dateMeta.fieldKey)
    if (baseDictionary) {
      return formatDatePartFieldLabel(baseDictionary, dateMeta.part)
    }
    const baseDescriptor = baseFieldDescriptor(dateMeta.fieldKey)
    const baseLabel = baseDescriptor?.label || humanizeKey(dateMeta.fieldKey)
    return formatDatePartFieldLabel(baseLabel, dateMeta.part)
  }
  const field = baseFieldDescriptor(key)
  if (!field) {
    return humanizeKey(key)
  }
  return field.label || humanizeKey(key)
}

function fieldValueOptions(field) {
  if (!field) return []
  let descriptor = field
  if (typeof field === 'string') {
    descriptor = resolveDimensionDescriptor(field)
  } else if (field?.key) {
    descriptor = resolveDimensionDescriptor(field.key)
  }
  if (!descriptor) return []
  const values = Array.isArray(descriptor.values)
    ? descriptor.values
    : descriptor.datePartValues?.[descriptor.datePart] || []
  return (values || []).map((value) => ({
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

function groupColumnsByLevel(columns, levelIndex) {
  const cells = []
  let pointer = 0
  while (pointer < columns.length) {
    const value = getColumnLevelValue(columns[pointer], levelIndex)
    let span = 1
    while (
      pointer + span < columns.length &&
      getColumnLevelValue(columns[pointer + span], levelIndex) === value
    ) {
      span += 1
    }
    cells.push({ label: value, colspan: span })
    pointer += span
  }
  return cells
}

function getColumnLevelValue(column, levelIndex) {
  const values = Array.isArray(column?.values) ? column.values : []
  if (values.length && levelIndex < values.length) {
    const raw = values[levelIndex]
    if (raw !== null && typeof raw !== 'undefined' && raw !== '') {
      return formatValue(raw)
    }
  }
  const level = column.levels?.[levelIndex]
  if (!level) return 'Итого'
  return level.value || '—'
}

function splitRowLabel(label = '') {
  const value = String(label || '').trim()
  if (!value) return []
  const separators = [' / ', ' • ', ' › ']
  for (const separator of separators) {
    if (value.includes(separator)) {
      return value.split(separator).map((part) => part.trim())
    }
  }
  return [value]
}

function resolveRowLevelValues(row, levelCount = 0) {
  const levels = Array.isArray(row?.levels) ? row.levels : []
  let values = []
  if (levels.length) {
    values = levels.map((level) => formatValue(level?.value))
  } else if (Array.isArray(row?.values) && row.values.length) {
    values = row.values.map((value) => formatValue(value))
  } else if (row?.label) {
    values = splitRowLabel(row.label).map((value) => formatValue(value))
  }
  if (!levelCount) return values
  const normalized = values.slice(0, levelCount)
  while (normalized.length < levelCount) {
    normalized.push('—')
  }
  return normalized
}

function resolveRowHeaderLabel(row) {
  const parts = resolveRowLevelValues(row).filter(
    (value) => value && value !== '—',
  )
  if (parts.length) {
    if (debugLogsEnabled) {
      console.debug('pivot row header', row?.key, row?.values, row?.label)
    }
    return parts[parts.length - 1]
  }
  if (debugLogsEnabled) {
    console.debug('pivot row header', row?.key, row?.values, row?.label)
  }
  return row?.label || row?.key || ''
}

function resolveColumnHeaderLabel(column) {
  const values = Array.isArray(column?.values) ? column.values : []
  if (values.length) {
    const parts = values
      .map((value) => formatValue(value))
      .filter((value) => value && value !== '—')
    if (parts.length) {
      if (debugLogsEnabled) {
        console.debug(
          'pivot col header',
          column?.key,
          column?.values,
          column?.label,
        )
      }
      return parts.join(' • ')
    }
  }
  if (debugLogsEnabled) {
    console.debug(
      'pivot col header',
      column?.key,
      column?.values,
      column?.label,
    )
  }
  return column?.label || column?.key || ''
}

function resolveColumnLeafLabel(column) {
  const values = Array.isArray(column?.values) ? column.values : []
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const raw = values[index]
    if (raw !== null && typeof raw !== 'undefined' && raw !== '') {
      return formatValue(raw)
    }
  }
  const levels = Array.isArray(column?.levels) ? column.levels : []
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const value = levels[index]?.value
    if (value !== null && typeof value !== 'undefined' && value !== '') {
      return formatValue(value)
    }
  }
  return ''
}

function findMetricLabel(metricId) {
  if (!metricId) return ''
  const match =
    visibleMetrics.value.find((metric) => metric.id === metricId) ||
    preparedMetrics.value.find((metric) => metric.id === metricId)
  return match?.label || ''
}

function formatColumnEntryLabel(column) {
  const leaf = resolveColumnLeafLabel(column)
  const metricLabel = findMetricLabel(column?.metricId)
  if (leaf && metricLabel && leaf !== metricLabel) {
    return `${leaf} • ${metricLabel}`
  }
  return leaf || metricLabel || column?.label || column?.key || '—'
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

function parseSourceBodyForJoins(rawBody = '') {
  const { cleanedBody, joins } = extractJoinsFromBody(rawBody)
  const body = cleanedBody || rawBody || EMPTY_BODY_TEMPLATE
  return { cleanedBody: body, joins }
}

function buildBasePivotView() {
  try {
    const baseView = buildPivotView({
      records: filteredPlanRecords.value,
      rows: pivotConfig.rows,
      columns: pivotConfig.columns,
      metrics: computationBaseMetrics.value,
      fieldMeta: fieldsMap.value,
      headerOverrides,
      sorts: {
        rows: pivotSortState.rows,
        columns: pivotSortState.columns,
      },
    })
    return { view: baseView, errorMetricId: null }
  } catch (err) {
    if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
      return { view: null, errorMetricId: err.metricId || null }
    }
    throw err
  }
}

function buildValueAggregationMessage(metricId) {
  const metricLabel = resolveMetricLabelById(metricId)
  return `Метрика «${metricLabel || metricId}» с типом «Значение» получает несколько записей в одной ячейке. Уточните измерения или выберите другой агрегат.`
}

function resolveMetricLabelById(metricId) {
  if (!metricId) return ''
  const match = preparedMetrics.value.find((metric) => metric.id === metricId)
  return match?.label || ''
}
</script>

<style scoped>
.page {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: min(1200px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
}
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
}
.page-heading h1 {
  margin: 0;
}
.page-heading button {
  white-space: nowrap;
}
.wizard-card {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 16px;
  padding: 16px;
  background: var(--s360-color-surface, #fff);
}
.wizard-card__title {
  font-weight: 600;
  margin-bottom: 6px;
}
.presentation-context {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px dashed #cbd5f5;
  background: #f8fafc;
  margin-bottom: 16px;
}
.context-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.context-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}
.context-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  color: #1d4ed8;
  cursor: pointer;
  font-weight: 500;
}
.link-btn:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}
.link-btn--muted {
  color: #4b5563;
  font-size: 12px;
}
.step {
  border: 1px solid var(--s360-color-border-subtle, #ebe8e5);
  border-radius: var(--s360-radius-lg, 16px);
  background: var(--s360-color-surface, #fff);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
  width: 100%; /* растягиваемся ровно на доступную ширину секции */
  max-width: 100%; /* не шире родителя */
  margin: 0;
}
.step--disabled {
  opacity: 0.55;
  pointer-events: none;
}
.step__header {
  display: flex;
  align-items: center;
  justify-content: left;
  gap: 20px;
}
.step__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
  width: 100%;
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
.params-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.params-table__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.params-table__hint {
  margin: 0;
  font-size: 12px;
  color: var(--s360-text-muted, #6b7280);
}
.params-table__grid {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  overflow: auto;
  max-height: 360px;
}
.params-table__row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--s360-color-border-subtle, #e5e7eb);
}
.params-table__row:last-child {
  border-bottom: none;
}
.params-table__row--header {
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 2;
}
.params-table__cell {
  padding: 8px;
  min-width: 160px;
  flex: 1 0 160px;
  border-right: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  box-sizing: border-box;
}
.params-table__cell--header {
  font-weight: 600;
}
.params-table__cell--index {
  flex: 0 0 36px;
  text-align: center;
  font-size: 12px;
  color: var(--s360-text-muted, #6b7280);
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 1;
}
.params-table__cell--actions {
  flex: 0 0 96px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--s360-text-muted, #6b7280);
}
.params-table__row--header .params-table__cell--actions {
  font-weight: 600;
}
.params-table__row--header .params-table__cell--index {
  background: #f8fafc;
  z-index: 3;
}
.params-table__cell:last-child {
  border-right: none;
}
.params-table__header-input {
  display: flex;
  gap: 6px;
  align-items: center;
}
.params-table__cell--error .n-input__border {
  border-color: #ef4444;
}
.params-table__cell--warning .n-input__border {
  border-color: #f59e0b;
}
.params-table__starter {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon-columns {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Crect x='3' y='4' width='6' height='16' rx='1'/%3E%3Crect x='15' y='4' width='6' height='16' rx='1'/%3E%3C/svg%3E");
}
.icon-rows {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Crect x='4' y='3' width='16' height='6' rx='1'/%3E%3Crect x='4' y='15' width='16' height='6' rx='1'/%3E%3C/svg%3E");
}
.icon-down {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='M12 5v14'/%3E%3Cpath d='m6 13 6 6 6-6'/%3E%3C/svg%3E");
}
.icon-duplicate {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Crect x='7' y='7' width='10' height='10' rx='1'/%3E%3Crect x='3' y='3' width='10' height='10' rx='1'/%3E%3C/svg%3E");
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
.joins-section {
  border-top: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.joins-section__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.joins-section__header .muted {
  margin: 4px 0 0;
}
.pushdown-section {
  margin-top: 16px;
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px 16px;
  background: var(--s360-color-surface, #fff);
}
.pushdown-section__summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}
.pushdown-section__summary .muted {
  font-size: 12px;
}
.pushdown-section__body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pushdown-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pushdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.pushdown-filters {
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pushdown-filters__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pushdown-filter-row {
  display: grid;
  grid-template-columns: 1.2fr 120px 1.6fr auto;
  gap: 8px;
  align-items: center;
}
.pushdown-test__result {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pushdown-warning {
  border: 1px solid #fed7aa;
  background: #fff7ed;
  color: #9a3412;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
}
.join-card {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.join-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.join-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.result-tabs {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  overflow-x: auto;
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
  overflow-y: auto;
  overflow-x: auto;
}
.tabs__body pre {
  margin: 0;
  font-size: 13px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
}
.preview-table {
  width: 100%;
  overflow-x: auto;
}
.preview-table table {
  width: max(100%, 1200px);
  table-layout: auto;
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
.layout-panel {
  margin-top: 8px;
}
.layout-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.layout-details__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.layout-details__header .n-input {
  flex: 1;
  min-width: 220px;
}
.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.layout-card {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
}
.layout-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.layout-card__header--metrics {
  align-items: center;
}
.layout-card__title {
  font-weight: 600;
}
.layout-card__hint {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}
.layout-field {
  border-top: 1px solid #eef2ff;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.layout-field__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.metric-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
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
.field select {
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
.batch-status {
  border: 1px dashed #c7d2fe;
  background: #eef2ff;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.batch-status__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 13px;
}
.batch-status__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #4b5563;
}
.muted {
  color: var(--s360-text-muted, #6b7280);
  font-size: 13px;
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
.metric-header th {
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  padding: 8px 12px;
}
.row-header-title {
  font-weight: 600;
  text-align: left;
}
.column-header-row th {
  text-align: center;
}
.column-field-group {
  text-align: center;
  font-weight: 500;
  position: relative;
}
.column-field-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}
.column-field-value {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  color: #111827;
  line-height: 1.15;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-height: 3.45em;
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
  text-align: left !important;
  direction: ltr !important;
  unicode-bidi: plaintext;
  white-space: normal !important;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow: visible !important;
  text-overflow: clip !important;
}
.pivot-preview td.row-label,
.pivot-preview td.row-header-cell {
  text-align: left !important;
  direction: ltr !important;
  white-space: normal !important;
  unicode-bidi: plaintext;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow: visible !important;
  text-overflow: clip !important;
}
.row-header-cell {
  text-align: left !important;
  direction: ltr !important;
  vertical-align: top;
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
  flex: 1 1 auto;
  min-width: 0;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
}
.row-content span {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  display: block;
  width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
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
.pivot-preview th.row-total-header,
.pivot-preview td.total,
.pivot-preview td.grand-total {
  width: 140px;
  max-width: 140px;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
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
.viz-grid__wide {
  grid-column: 1 / -1;
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
