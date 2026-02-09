import axios from 'axios'
import { getUserData } from '../common/userCache'

const OBJECT_URL = import.meta.env.VITE_OBJECT_URL
const LOCATION_URL = import.meta.env.VITE_LOCATION_URL
const PLAN_URL = import.meta.env.VITE_PLAN_URL

// Загрузка списка работ
export async function loadWorksList() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadObjList',
      params: ['Typ_Work', 'Prop_Work', 'nsidata']
    })
    const records = response.data.result?.records || response.data.result || []
    return records.map(r => ({
      label: r.fullName || r.name,
      value: r.id,
      cls: r.cls,
      fullName: r.fullName,
      name: r.name,
      pv: r.pv
    }))
  } catch (error) {
    console.error('Ошибка при загрузке списка работ:', error)
    throw error
  }
}

// Загрузка списка мест (секций)
export async function loadPlacesList() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadObjForSelect',
      params: ['Typ_Section']
    })
    const records = response.data.result?.records || response.data.result || []
    return records.map(r => ({
      label: r.name,
      value: r.id,
      cls: r.cls,
      parent: r.parent
    }))
  } catch (error) {
    console.error('Ошибка при загрузке списка мест:', error)
    throw error
  }
}

// Загрузка участков по работе
export async function loadSectionsByWork(objWork) {
  try {
    const response = await axios.post(LOCATION_URL, {
      method: 'data/loadLocationByWorkForSelect',
      params: [objWork]
    })
    const records = response.data.result || []
    return records.map(r => ({
      label: r.name,
      value: r.id,
      cls: r.cls,
      pv: r.pv,
      beg: r.beg,
      end: r.end,
      objObjectTypeMulti: r.objObjectTypeMulti || []
    }))
  } catch (error) {
    console.error('Ошибка при загрузке участков по работе:', error)
    throw error
  }
}

// Загрузка участков по работе и месту
export async function loadSectionsByWorkAndPlace(objWork, objSection) {
  try {
    const response = await axios.post(LOCATION_URL, {
      method: 'data/loadLocationByWorkAndSectionForSelect',
      params: [objWork, objSection]
    })
    const records = response.data.result || []
    return records.map(r => ({
      label: r.name,
      value: r.id,
      cls: r.cls,
      pv: r.pv,
      beg: r.beg,
      end: r.end,
      objObjectTypeMulti: r.objObjectTypeMulti || []
    }))
  } catch (error) {
    console.error('Ошибка при загрузке участков:', error)
    throw error
  }
}

// Загрузка объектов по типу объекта и координатам участка
export async function loadObjectsByTypeAndCoord(objObjectType, beg, end) {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadObjectByTypObjAndCoordForSelect',
      params: [{
        objObjectType,
        beg,
        end
      }]
    })
    const records = response.data.result?.records || response.data.result || []
    return records.map(r => ({
      label: r.fullName,
      value: r.id,
      cls: r.cls,
      name: r.name,
      fullName: r.fullName,
      pv: r.pv,
      beg: r.beg,
      end: r.end,
      StartKm: r.StartKm,
      FinishKm: r.FinishKm,
      StartPicket: r.StartPicket,
      FinishPicket: r.FinishPicket,
      StartLink: r.StartLink,
      FinishLink: r.FinishLink
    }))
  } catch (error) {
    console.error('Ошибка при загрузке объектов по типу и координатам:', error)
    throw error
  }
}

// Загрузка объектов по месту, типу объекта и координатам участка
export async function loadObjectsByParams(objSection, objObjectType, beg, end) {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadObjectBySectionAndTypObjAndCoordForSelect',
      params: [{
        objSection,
        objObjectType,
        beg,
        end
      }]
    })
    const records = response.data.result?.records || response.data.result || []
    return records.map(r => ({
      label: r.fullName,
      value: r.id,
      cls: r.cls,
      name: r.name,
      fullName: r.fullName,
      pv: r.pv,
      beg: r.beg,
      end: r.end,
      StartKm: r.StartKm,
      FinishKm: r.FinishKm,
      StartPicket: r.StartPicket,
      FinishPicket: r.FinishPicket,
      StartLink: r.StartLink,
      FinishLink: r.FinishLink
    }))
  } catch (error) {
    console.error('Ошибка при загрузке объектов:', error)
    throw error
  }
}

// Сохранение одного плана по участку
export async function savePlanBySection({ work, section, object, coordinates, plannedDate, description }) {
  try {
    const user = await getUserData()
    const today = new Date().toISOString().split('T')[0]

    const payload = {
      name: `${work.value}_${plannedDate}`,
      linkCls: work.cls,
      objLocationClsSection: section.value,
      pvLocationClsSection: section.pv,
      objWork: work.value,
      pvWork: work.pv,
      objObject: object.value,
      pvObject: object.pv,
      objUser: user.id,
      pvUser: user.pv,
      StartKm: coordinates.coordStartKm,
      FinishKm: coordinates.coordEndKm,
      StartPicket: coordinates.coordStartPk,
      FinishPicket: coordinates.coordEndPk,
      StartLink: coordinates.coordStartZv,
      FinishLink: coordinates.coordEndZv,
      PlanDateEnd: plannedDate,
      Description: description || '',
      CreatedAt: today,
      UpdatedAt: today
    }

    const response = await axios.post(PLAN_URL, {
      method: 'data/savePlan',
      params: ['ins', payload]
    })

    if (response.data?.error) {
      throw new Error(response.data.error.message || 'Ошибка сохранения')
    }

    return response.data.result || response.data
  } catch (error) {
    console.error('Ошибка при сохранении плана:', error)
    throw error
  }
}

// Сохранение планов по нескольким объектам
export async function saveSeveralPlans({ work, section, plannedDate, objects }) {
  try {
    const user = await getUserData()
    const today = new Date().toISOString().split('T')[0]

    const payload = {
      linkCls: work.cls,
      objLocationClsSection: section.value,
      pvLocationClsSection: section.pv,
      objWork: work.value,
      pvWork: work.pv,
      objUser: user.id,
      pvUser: user.pv,
      PlanDateEnd: plannedDate,
      CreatedAt: today,
      UpdatedAt: today,
      objObject: objects.map(obj => ({
        id: obj.value,
        cls: obj.cls,
        name: obj.name,
        fullName: obj.fullName,
        pv: obj.pv,
        beg: obj.beg,
        end: obj.end,
        StartKm: obj.StartKm,
        FinishKm: obj.FinishKm,
        StartPicket: obj.StartPicket,
        FinishPicket: obj.FinishPicket,
        StartLink: obj.StartLink,
        FinishLink: obj.FinishLink
      }))
    }

    const response = await axios.post(PLAN_URL, {
      method: 'data/saveSeveralPlans',
      params: [payload]
    })

    if (response.data?.error) {
      throw new Error(response.data.error.message || 'Ошибка сохранения')
    }

    return response.data.result || response.data
  } catch (error) {
    console.error('Ошибка при сохранении планов:', error)
    throw error
  }
}
