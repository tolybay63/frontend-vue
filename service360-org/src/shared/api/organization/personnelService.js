import axios from 'axios'
import { formatDate, formatDateForBackend } from '../common/formatters'
import { getUserData } from '../common/userCache'

const API_PERSONNEL_URL = import.meta.env.VITE_PERSONAL_URL
const OBJECT_URL = import.meta.env.VITE_OBJECT_URL

export async function loadPersonnel({ page = 1, limit = 10 }) {
  try {
    const response = await axios.post(API_PERSONNEL_URL, {
      method: 'data/loadPersonnal',
      params: [0]
    })

    const records = response.data.result?.records || []

    return {
      data: records.map((item, i) => ({
        rawData: item,
        id: item.id,
        cls: item.cls,
        tabNumber: item.TabNumber || '',
        fullName: `${item.UserSecondName || ''} ${item.UserFirstName || ''} ${item.UserMiddleName || ''}`.trim(),
        secondName: item.UserSecondName || '',
        firstName: item.UserFirstName || '',
        middleName: item.UserMiddleName || '',
        position: item.namePosition || '',
        location: item.nameLocation || '',
        email: item.UserEmail || '',
        phone: item.UserPhone || '',
        dateBirth: formatDate(item.UserDateBirth),
        dateEmployment: formatDate(item.DateEmployment),
        dateDismissal: item.DateDismissal ? formatDate(item.DateDismissal) : '',
        sex: item.nameUserSex || '',
        login: item.login || '',
        createdAt: formatDate(item.CreatedAt),
        updatedAt: formatDate(item.UpdatedAt),

        // ID полей для возможного редактирования
        idTabNumber: item.idTabNumber,
        idUserSecondName: item.idUserSecondName,
        idUserFirstName: item.idUserFirstName,
        idUserMiddleName: item.idUserMiddleName,
        idUserEmail: item.idUserEmail,
        idUserPhone: item.idUserPhone,
        idUserDateBirth: item.idUserDateBirth,
        idDateEmployment: item.idDateEmployment,
        idDateDismissal: item.idDateDismissal,
        idCreatedAt: item.idCreatedAt,
        idUpdatedAt: item.idUpdatedAt,
        idUserSex: item.idUserSex,
        fvUserSex: item.fvUserSex,
        pvUserSex: item.pvUserSex,
        idPosition: item.idPosition,
        fvPosition: item.fvPosition,
        pvPosition: item.pvPosition,
        idLocation: item.idLocation,
        pvLocation: item.pvLocation,
        objLocation: item.objLocation,

        // Для мобильной версии
        date: item.CreatedAt,
        nameLocation: item.nameLocation || '',
        namePosition: item.namePosition || '',
        coordinates: item.TabNumber ? `Таб. № ${item.TabNumber}` : 'Табельный номер не указан',

        _originalIndex: i + 1,
      })),
      total: records.length
    }
  } catch (error) {
    console.error('Ошибка при загрузке персонала:', error)
    throw error
  }
}

export async function loadPositions() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadFactorValForSelect',
      params: ['Prop_Position']
    })

    const records = response.data.result?.records || []
    return records.map(record => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
      factor: record.factor
    }))
  } catch (error) {
    console.error('Ошибка при загрузке должностей:', error)
    throw error
  }
}

export async function loadLocations() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadObjList',
      params: ['Typ_Location', 'Prop_Location', 'orgstructuredata']
    })

    const records = response.data.result?.records || []
    return records.map(record => ({
      label: record.fullName || record.name,
      value: record.id,
      cls: record.cls,
      pv: record.pv
    }))
  } catch (error) {
    console.error('Ошибка при загрузке участков:', error)
    throw error
  }
}

export async function loadUserSex() {
  try {
    const response = await axios.post(OBJECT_URL, {
      method: 'data/loadFactorValForSelect',
      params: ['Prop_UserSex']
    })

    const records = response.data.result?.records || []
    return records.map(record => ({
      label: record.name,
      value: record.id,
      pv: record.pv,
      factor: record.factor
    }))
  } catch (error) {
    console.error('Ошибка при загрузке справочника пола:', error)
    throw error
  }
}

export async function savePersonnel(personnelData) {
  try {
    const today = formatDateForBackend(new Date())

    // Get user data for objUser and pvUser
    const userData = await getUserData()

    const payload = {
      TabNumber: personnelData.tabNumber,
      UserSecondName: personnelData.secondName,
      UserFirstName: personnelData.firstName,
      UserMiddleName: personnelData.middleName,
      UserEmail: personnelData.email || '',
      UserPhone: personnelData.phone || '',
      UserDateBirth: personnelData.dateBirth ? formatDateForBackend(new Date(personnelData.dateBirth)) : '',
      DateEmployment: personnelData.dateEmployment ? formatDateForBackend(new Date(personnelData.dateEmployment)) : today,
      fvUserSex: personnelData.sex?.value,
      pvUserSex: personnelData.sex?.pv,
      fvPosition: personnelData.position.value,
      pvPosition: personnelData.position.pv,
      objLocation: personnelData.location.value,
      pvLocation: personnelData.location.pv,
      objUser: userData?.id || null,
      pvUser: userData?.pv || null,
      CreatedAt: today,
      UpdatedAt: today,
    }

    // Добавляем login только если он не пустой
    if (personnelData.login && personnelData.login.trim()) {
      payload.login = personnelData.login
    }

    console.log('Отправка данных для сохранения сотрудника:', payload)

    const response = await axios.post(API_PERSONNEL_URL, {
      method: 'data/savePersonnal',
      params: ['ins', payload]
    })

    console.log('Ответ от сервера:', response.data)
    return response.data
  } catch (error) {
    console.error('Ошибка при сохранении сотрудника:', error)
    throw error
  }
}

export async function updatePersonnel(personnelData) {
  try {
    const today = formatDateForBackend(new Date())

    // Используем rawData напрямую
    const raw = personnelData.rawData

    // Get user data for objUser and pvUser (кто изменяет запись)
    const userData = await getUserData()

    const payload = {
      id: raw.id,
      cls: raw.cls,
      idTabNumber: raw.idTabNumber,
      TabNumber: personnelData.tabNumber,
      idUserSecondName: raw.idUserSecondName,
      UserSecondName: personnelData.secondName,
      idUserFirstName: raw.idUserFirstName,
      UserFirstName: personnelData.firstName,
      idUserMiddleName: raw.idUserMiddleName,
      UserMiddleName: personnelData.middleName,
      idUserEmail: raw.idUserEmail,
      UserEmail: personnelData.email || '',
      idUserPhone: raw.idUserPhone,
      UserPhone: personnelData.phone || '',
      idUserDateBirth: raw.idUserDateBirth,
      UserDateBirth: personnelData.dateBirth ? formatDateForBackend(new Date(personnelData.dateBirth)) : '',
      idDateEmployment: raw.idDateEmployment,
      DateEmployment: personnelData.dateEmployment ? formatDateForBackend(new Date(personnelData.dateEmployment)) : '',
      idDateDismissal: raw.idDateDismissal,
      DateDismissal: personnelData.dateDismissal ? formatDateForBackend(new Date(personnelData.dateDismissal)) : '',
      idUserSex: raw.idUserSex,
      fvUserSex: personnelData.sex?.value,
      pvUserSex: personnelData.sex?.pv,
      idPosition: raw.idPosition,
      fvPosition: personnelData.position.value,
      pvPosition: personnelData.position.pv,
      idLocation: raw.idLocation,
      objLocation: personnelData.location.value,
      pvLocation: personnelData.location.pv,
      idUser: raw.idUser,
      objUser: userData?.id || null,
      pvUser: userData?.pv || null,
      idCreatedAt: raw.idCreatedAt,
      CreatedAt: raw.CreatedAt || '',
      idUpdatedAt: raw.idUpdatedAt,
      UpdatedAt: today,
    }

    // Добавляем login только если он не пустой
    if (personnelData.login && personnelData.login.trim()) {
      payload.login = personnelData.login
    }

    console.log('Отправка данных для обновления сотрудника:', payload)

    const response = await axios.post(API_PERSONNEL_URL, {
      method: 'data/savePersonnal',
      params: ['upd', payload]
    })

    console.log('Ответ от сервера:', response.data)
    return response.data
  } catch (error) {
    console.error('Ошибка при обновлении сотрудника:', error)
    throw error
  }
}

export async function deletePersonnel(id, hasLogin) {
  try {
    console.log('Отправка запроса на удаление сотрудника:', { id, hasLogin })

    const response = await axios.post(API_PERSONNEL_URL, {
      method: 'data/deleteObjWithProperties',
      params: [id, hasLogin]
    })

    console.log('Ответ от сервера:', response.data)
    return response.data
  } catch (error) {
    console.error('Ошибка при удалении сотрудника:', error)
    throw error
  }
}
