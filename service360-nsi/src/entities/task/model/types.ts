/** Файл: src/entities/task/model/types.ts
 *  Назначение: типы данных для справочника «Задачи» (операции по расходу ресурсов).
 *  Использование: импортируйте Task для отображения и мутаций на страницах/фичах.
 */

export interface RawTaskRecord {
  [key: string]: unknown
}

export interface Task {
  /** Числовой идентификатор записи (obj/id) */
  id: number | null
  /** Строковое представление идентификатора (на случай отсутствия числового) */
  rawId: string | null
  /** Класс/тип записи (cls) */
  cls: number | null
  /** Краткое наименование задачи */
  name: string
  /** Полное наименование задачи */
  fullName: string | null
  /** Описание или примечание */
  description: string | null
  /** Идентификатор записи связи с единицей измерения (idMeasure) */
  measureRecordId: number | null
  /** Строковое представление идентификатора связи (idMeasure) */
  measureRecordRawId: string | null
  /** Идентификатор объекта единицы измерения (meaMeasure) */
  measureObjId: number | null
  /** Значение свойства единицы измерения (pvMeasure) */
  measurePvId: number | null
  /** Подпись единицы измерения */
  measureName: string | null
  /** Идентификатор записи описания (idDescription) */
  descriptionRecordId: number | null
  /** Строковое представление idDescription */
  descriptionRecordRawId: string | null
}

export interface TaskMutationInput {
  name: string
  description?: string | null
  measure: {
    objId: number
    pvId: number
    name?: string | null
  }
}
